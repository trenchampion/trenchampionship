// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BattleEngine} from "./BattleEngine.sol";
import {Config} from "./Config.sol";
import {GuardianPausable} from "./GuardianPausable.sol";
import {
    ICharacterRegistry,
    IControllerNFT,
    IMatchManagerViews,
    IRating,
    IRewardPool,
    IStakingVault
} from "./interfaces/IProtocol.sol";

/// @title MatchManager
/// @notice Challenge -> accept -> commit -> reveal state machine with escrow, presets, forfeits,
///         voids, draws, a 24 h cooldown per pair and pull-payment claims. The only place that
///         calls BattleEngine.resolve.
/// @dev Pausable: challenge and accept only. Commit, reveal, poke, cancel and claim always work.
///      Stake 0 is a friendly match: no escrow, no staking, no rating, no cooldown.
///      Tournament matches are created by the Tournament contract (WP6) with escrow held there.
contract MatchManager is GuardianPausable, ReentrancyGuard, IMatchManagerViews {
    using SafeERC20 for IERC20;

    error NotController();
    error BadStake();
    error BadPreset();
    error BadOpponent();
    error Cooldown();
    error PairBusy();
    error EmptyCommit();
    error BadStatus();
    error TooLate();
    error TooEarly();
    error NotParticipant();
    error AlreadyCommitted();
    error NotCommitted();
    error AlreadyRevealed();
    error BadReveal();
    error InvalidTactics();
    error NothingToDo();
    error NothingToClaim();
    error NotTournament();

    enum Status {
        None,
        Challenged,
        Accepted,
        Resolved
    }

    enum Outcome {
        Pending,
        WinA,
        WinB,
        Draw,
        Void,
        Expired,
        Cancelled
    }

    struct Match {
        uint256 idA;
        uint256 idB;
        address controllerA;
        address controllerB;
        uint256 stake; // per side; escrowed here unless tournament
        uint256 rewardBase; // amount staker rewards are computed from (2 * stake, or set by Tournament)
        uint8 preset; // 0 Blitz, 1 Standard, 2 Tournament
        Status status;
        Outcome outcome;
        bool open; // open challenge: anyone may accept with their own character
        bool tournament;
        bool revealedA;
        bool revealedB;
        uint64 createdAt;
        uint64 acceptedAt;
        uint64 bothCommittedAt;
        bytes32 commitA;
        bytes32 commitB;
    }

    event Challenged(
        uint256 indexed matchId,
        uint256 indexed idA,
        uint256 indexed idB,
        address controllerA,
        uint256 stake,
        uint8 preset,
        bool open
    );
    event Accepted(
        uint256 indexed matchId, uint256 indexed idB, address controllerB, uint64 stakingCloseAt, uint64 commitDeadline
    );
    event Cancelled(uint256 indexed matchId);
    event Committed(
        uint256 indexed matchId, uint8 indexed side, address controller, bytes32 commitHash, bytes encryptedTactics
    );
    event Revealed(uint256 indexed matchId, uint8 indexed side, uint8[3] stances, uint8[3] energies);
    event BattleScores(uint256 indexed matchId, int16[3] scoreA, int16[3] scoreB, int8[3] winners);
    event Resolved(uint256 indexed matchId, Outcome outcome, uint8 roundsA, uint8 roundsB, uint256 stakerReward);
    event Claimed(address indexed to, uint256 amount);

    IERC20 public immutable TL;
    IControllerNFT public immutable NFT;
    ICharacterRegistry public immutable FACTORY;
    IRewardPool public immutable REWARD_POOL;
    IStakingVault public immutable VAULT;
    IRating public immutable RATING;
    address public immutable TREASURY;
    address public immutable TOURNAMENT;

    uint256 public matchCount;
    mapping(uint256 matchId => Match) internal _matches;
    mapping(uint256 matchId => mapping(uint8 side => BattleEngine.Tactics)) internal _tactics;
    mapping(uint256 characterId => uint256) public activeCount;
    mapping(bytes32 pairKey => uint256) public lastResolvedAt;
    /// @notice Staked matches of a pair that are challenged (targeted) or accepted and not yet resolved;
    ///         a pair may have at most one, so the cooldown cannot be bypassed by stacking challenges.
    mapping(bytes32 pairKey => uint256) public activePairs;
    mapping(address => uint256) public claimable;

    constructor(
        address tl,
        address nft,
        address factory,
        address rewardPool,
        address vault,
        address rating,
        address treasury,
        address tournament,
        address guardian
    ) GuardianPausable(guardian) {
        TL = IERC20(tl);
        NFT = IControllerNFT(nft);
        FACTORY = ICharacterRegistry(factory);
        REWARD_POOL = IRewardPool(rewardPool);
        VAULT = IStakingVault(vault);
        RATING = IRating(rating);
        TREASURY = treasury;
        TOURNAMENT = tournament;
    }

    // ------------------------------------------------------------------ views

    function getMatch(uint256 matchId) external view returns (Match memory) {
        return _matches[matchId];
    }

    function tacticsOf(uint256 matchId, uint8 side) external view returns (BattleEngine.Tactics memory) {
        return _tactics[matchId][side];
    }

    function presetDuration(uint8 preset) public pure returns (uint64) {
        if (preset == 0) return uint64(Config.PRESET_BLITZ);
        if (preset == 1) return uint64(Config.PRESET_STANDARD);
        if (preset == 2) return uint64(Config.PRESET_TOURNAMENT);
        revert BadPreset();
    }

    function stakingCloseAt(uint256 matchId) public view returns (uint64) {
        Match storage m = _matches[matchId];
        return m.acceptedAt + presetDuration(m.preset);
    }

    function commitDeadline(uint256 matchId) public view returns (uint64) {
        Match storage m = _matches[matchId];
        return m.acceptedAt + 2 * presetDuration(m.preset);
    }

    function revealDeadline(uint256 matchId) public view returns (uint64) {
        Match storage m = _matches[matchId];
        uint64 start = m.bothCommittedAt > stakingCloseAt(matchId) ? m.bothCommittedAt : stakingCloseAt(matchId);
        return start + presetDuration(m.preset);
    }

    /// @inheritdoc IMatchManagerViews
    function stakingOpen(uint256 matchId) external view returns (bool) {
        Match storage m = _matches[matchId];
        return m.status == Status.Accepted && m.rewardBase > 0 && block.timestamp < stakingCloseAt(matchId);
    }

    /// @inheritdoc IMatchManagerViews
    function sideCharacter(uint256 matchId, uint8 side) external view returns (uint256) {
        return side == 0 ? _matches[matchId].idA : _matches[matchId].idB;
    }

    /// @inheritdoc IMatchManagerViews
    function isBusy(uint256 characterId) external view returns (bool) {
        return activeCount[characterId] > 0;
    }

    function pairKey(uint256 a, uint256 b) public pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    /// @notice Commit hash the frontend must produce.
    function commitHash(
        uint256 matchId,
        address controller,
        uint8[3] memory stances,
        uint8[3] memory energies,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(matchId, controller, stances, energies, salt));
    }

    // ------------------------------------------------------------------ challenge / accept

    /// @notice Challenge `idB` (or anyone, with idB = 0) with `idA` for `stake` TL per side.
    /// @param preset 0 = Blitz (1 h windows), 1 = Standard (24 h windows).
    function challenge(uint256 idA, uint256 idB, uint256 stake, uint8 preset)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 matchId)
    {
        if (NFT.ownerOf(idA) != msg.sender) revert NotController();
        if (stake != 0 && (stake < Config.STAKE_MIN || stake > Config.STAKE_MAX)) revert BadStake();
        if (preset > 1) revert BadPreset();
        if (idB != 0) _checkOpponent(idA, idB, msg.sender, stake);
        if (stake > 0) TL.safeTransferFrom(msg.sender, address(this), stake);
        if (idB != 0 && stake > 0) activePairs[pairKey(idA, idB)]++;

        matchId = ++matchCount;
        Match storage m = _matches[matchId];
        m.idA = idA;
        m.idB = idB;
        m.controllerA = msg.sender;
        m.stake = stake;
        m.rewardBase = 2 * stake;
        m.preset = preset;
        m.status = Status.Challenged;
        m.open = idB == 0;
        m.createdAt = uint64(block.timestamp);
        activeCount[idA]++;
        emit Challenged(matchId, idA, idB, msg.sender, stake, preset, m.open);
    }

    /// @notice Withdraw an unaccepted challenge. Challenger only.
    function cancel(uint256 matchId) external nonReentrant {
        Match storage m = _matches[matchId];
        if (m.status != Status.Challenged) revert BadStatus();
        if (m.controllerA != msg.sender) revert NotController();
        _closeUnaccepted(matchId, m, Outcome.Cancelled);
        emit Cancelled(matchId);
    }

    /// @notice Accept a challenge with `idB` (must equal the challenged character unless the
    ///         challenge is open).
    function accept(uint256 matchId, uint256 idB) external nonReentrant whenNotPaused {
        Match storage m = _matches[matchId];
        if (m.status != Status.Challenged) revert BadStatus();
        if (block.timestamp > m.createdAt + Config.ACCEPT_WINDOW) revert TooLate();
        if (m.open) {
            if (idB == 0) revert BadOpponent();
            _checkOpponent(m.idA, idB, m.controllerA, m.stake);
            m.idB = idB;
            if (m.stake > 0) activePairs[pairKey(m.idA, idB)]++;
        } else if (idB != m.idB) {
            revert BadOpponent();
        }
        // the challenged character may have changed hands since the challenge: never the same controller
        if (msg.sender == m.controllerA) revert BadOpponent();
        if (NFT.ownerOf(m.idB) != msg.sender) revert NotController();
        if (m.stake > 0) TL.safeTransferFrom(msg.sender, address(this), m.stake);
        m.controllerB = msg.sender;
        m.status = Status.Accepted;
        m.acceptedAt = uint64(block.timestamp);
        activeCount[m.idB]++;
        emit Accepted(matchId, m.idB, msg.sender, stakingCloseAt(matchId), commitDeadline(matchId));
    }

    /// @notice Create an already-accepted match for a tournament round. Tournament only; escrow and
    ///         prizes live in the Tournament contract, `rewardBase` sets the staker-reward budget.
    function createTournamentMatch(uint256 idA, uint256 idB, uint256 rewardBase)
        external
        nonReentrant
        returns (uint256 matchId)
    {
        if (msg.sender != TOURNAMENT) revert NotTournament();
        address ca = NFT.controllerOf(idA);
        address cb = NFT.controllerOf(idB);
        if (ca == address(0) || cb == address(0) || ca == cb || idA == idB) revert BadOpponent();
        matchId = ++matchCount;
        Match storage m = _matches[matchId];
        m.idA = idA;
        m.idB = idB;
        m.controllerA = ca;
        m.controllerB = cb;
        m.rewardBase = rewardBase;
        m.preset = 2;
        m.status = Status.Accepted;
        m.tournament = true;
        m.createdAt = uint64(block.timestamp);
        m.acceptedAt = uint64(block.timestamp);
        activeCount[idA]++;
        activeCount[idB]++;
        emit Challenged(matchId, idA, idB, ca, 0, 2, false);
        emit Accepted(matchId, idB, cb, stakingCloseAt(matchId), commitDeadline(matchId));
    }

    // ------------------------------------------------------------------ commit / reveal

    /// @notice Commit to tactics. Allowed from acceptance until the commit deadline.
    /// @param encryptedTactics Opaque blob the frontend uses to recover tactics on any device.
    function commit(uint256 matchId, bytes32 hash, bytes calldata encryptedTactics) external nonReentrant {
        Match storage m = _matches[matchId];
        if (m.status != Status.Accepted) revert BadStatus();
        if (block.timestamp > commitDeadline(matchId)) revert TooLate();
        if (hash == bytes32(0)) revert EmptyCommit();
        uint8 side = _side(m, msg.sender);
        if (side == 0) {
            if (m.commitA != bytes32(0)) revert AlreadyCommitted();
            m.commitA = hash;
        } else {
            if (m.commitB != bytes32(0)) revert AlreadyCommitted();
            m.commitB = hash;
        }
        if (m.commitA != bytes32(0) && m.commitB != bytes32(0)) m.bothCommittedAt = uint64(block.timestamp);
        emit Committed(matchId, side, msg.sender, hash, encryptedTactics);
    }

    /// @notice Reveal tactics. Allowed once both committed and the staking window closed, until the
    ///         reveal deadline. The second reveal resolves the match.
    function reveal(uint256 matchId, BattleEngine.Tactics calldata tactics, bytes32 salt) external nonReentrant {
        Match storage m = _matches[matchId];
        if (m.status != Status.Accepted) revert BadStatus();
        if (m.commitA == bytes32(0) || m.commitB == bytes32(0)) revert NotCommitted();
        if (block.timestamp < stakingCloseAt(matchId)) revert TooEarly();
        if (block.timestamp > revealDeadline(matchId)) revert TooLate();
        uint8 side = _side(m, msg.sender);
        if (side == 0 ? m.revealedA : m.revealedB) revert AlreadyRevealed();
        _verifyReveal(matchId, m, side, tactics, salt);
        _tactics[matchId][side] = tactics;
        if (side == 0) m.revealedA = true;
        else m.revealedB = true;
        emit Revealed(matchId, side, tactics.stances, tactics.energies);
        if (m.revealedA && m.revealedB) _resolveByBattle(matchId, m);
    }

    function _verifyReveal(
        uint256 matchId,
        Match storage m,
        uint8 side,
        BattleEngine.Tactics calldata tactics,
        bytes32 salt
    ) internal view {
        bytes32 expected = side == 0 ? m.commitA : m.commitB;
        if (commitHash(matchId, msg.sender, tactics.stances, tactics.energies, salt) != expected) revert BadReveal();
        if (!BattleEngine.validTactics(tactics, FACTORY.traitsOf(side == 0 ? m.idA : m.idB))) revert InvalidTactics();
    }

    // ------------------------------------------------------------------ timeouts

    /// @notice Advance a match whose deadline passed: expire, void or forfeit. Anyone may call.
    function poke(uint256 matchId) external nonReentrant {
        Match storage m = _matches[matchId];
        if (m.status == Status.Challenged) {
            if (block.timestamp <= m.createdAt + Config.ACCEPT_WINDOW) revert NothingToDo();
            _closeUnaccepted(matchId, m, Outcome.Expired);
            return;
        }
        if (m.status != Status.Accepted) revert NothingToDo();
        bool bothCommitted = m.commitA != bytes32(0) && m.commitB != bytes32(0);
        if (!bothCommitted) {
            if (block.timestamp <= commitDeadline(matchId)) revert NothingToDo();
            if (m.commitA == bytes32(0) && m.commitB == bytes32(0)) {
                _finalize(matchId, m, Outcome.Void, 0, 0);
            } else {
                _finalize(matchId, m, m.commitA != bytes32(0) ? Outcome.WinA : Outcome.WinB, 0, 0);
            }
            return;
        }
        if (block.timestamp <= revealDeadline(matchId)) revert NothingToDo();
        if (!m.revealedA && !m.revealedB) {
            _finalize(matchId, m, Outcome.Void, 0, 0);
        } else {
            _finalize(matchId, m, m.revealedA ? Outcome.WinA : Outcome.WinB, 0, 0);
        }
    }

    // ------------------------------------------------------------------ claims

    /// @notice Withdraw everything owed to you (prizes, refunds).
    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        TL.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // ------------------------------------------------------------------ internals

    function _checkOpponent(uint256 idA, uint256 idB, address controllerA, uint256 stake) internal view {
        if (idB == idA) revert BadOpponent();
        address cb = NFT.controllerOf(idB);
        if (cb == address(0) || cb == controllerA) revert BadOpponent();
        if (stake > 0) {
            bytes32 key = pairKey(idA, idB);
            if (activePairs[key] != 0) revert PairBusy();
            uint256 last = lastResolvedAt[key];
            if (last != 0 && block.timestamp < last + Config.PAIR_COOLDOWN) revert Cooldown();
        }
    }

    function _side(Match storage m, address who) internal view returns (uint8) {
        if (who == m.controllerA) return 0;
        if (who == m.controllerB) return 1;
        revert NotParticipant();
    }

    function _closeUnaccepted(uint256 matchId, Match storage m, Outcome outcome) internal {
        m.status = Status.Resolved;
        m.outcome = outcome;
        activeCount[m.idA]--;
        if (!m.open && m.stake > 0) activePairs[pairKey(m.idA, m.idB)]--;
        if (m.stake > 0) claimable[m.controllerA] += m.stake;
        emit Resolved(matchId, outcome, 0, 0, 0);
    }

    function _resolveByBattle(uint256 matchId, Match storage m) internal {
        BattleEngine.Result memory r = BattleEngine.resolve(
            FACTORY.traitsOf(m.idA), FACTORY.traitsOf(m.idB), _tactics[matchId][0], _tactics[matchId][1]
        );
        emit BattleScores(matchId, r.scoreA, r.scoreB, r.winners);
        int8 o = BattleEngine.outcome(r);
        _finalize(matchId, m, o == 1 ? Outcome.WinA : (o == -1 ? Outcome.WinB : Outcome.Draw), r.roundsA, r.roundsB);
    }

    /// @dev Pays out, splits the rake, funds stakers, updates rating and cooldown, frees the characters.
    function _finalize(uint256 matchId, Match storage m, Outcome outcome, uint8 roundsA, uint8 roundsB) internal {
        m.status = Status.Resolved;
        m.outcome = outcome;
        activeCount[m.idA]--;
        activeCount[m.idB]--;
        if (m.stake > 0) activePairs[pairKey(m.idA, m.idB)]--;
        uint8 winnerSide = outcome == Outcome.WinA ? 0 : (outcome == Outcome.WinB ? 1 : 2);
        _settleEscrow(m, winnerSide);
        uint256 paid = _settleStakers(matchId, m, winnerSide);
        _settleRating(m, outcome, winnerSide);
        emit Resolved(matchId, outcome, roundsA, roundsB, paid);
    }

    /// @dev Winner takes both stakes minus the rake; draws and voids refund both sides.
    function _settleEscrow(Match storage m, uint8 winnerSide) internal {
        if (m.tournament || m.stake == 0) return;
        uint256 total = 2 * m.stake;
        if (winnerSide <= 1) {
            uint256 rake = total * Config.RAKE_BPS / Config.BPS;
            claimable[winnerSide == 0 ? m.controllerA : m.controllerB] += total - rake;
            _distributeRake(total);
        } else {
            claimable[m.controllerA] += m.stake;
            claimable[m.controllerB] += m.stake;
        }
    }

    /// @dev Request the staker reward from RewardPool when the winning side has stakers, then record.
    function _settleStakers(uint256 matchId, Match storage m, uint8 winnerSide) internal returns (uint256 paid) {
        if (m.rewardBase == 0) return 0;
        if (winnerSide <= 1 && VAULT.totalStaked(matchId, winnerSide) > 0) {
            paid = REWARD_POOL.payMatchReward(m.rewardBase * Config.STAKER_REWARD_BPS / Config.BPS, address(VAULT));
        }
        VAULT.onResolved(matchId, winnerSide, paid);
    }

    /// @dev Rating and cooldown apply to staked and tournament matches only; voids set no cooldown.
    function _settleRating(Match storage m, Outcome outcome, uint8 winnerSide) internal {
        if (m.rewardBase == 0) return;
        if (winnerSide <= 1) RATING.recordResult(m.idA, m.idB, winnerSide == 0 ? int8(1) : int8(-1));
        if (outcome != Outcome.Void) lastResolvedAt[pairKey(m.idA, m.idB)] = block.timestamp;
    }

    /// @dev Splits exactly the rake taken from the winner: the burn share absorbs rounding so no
    ///      wei is ever stranded in this contract.
    function _distributeRake(uint256 total) internal {
        uint256 rake = total * Config.RAKE_BPS / Config.BPS;
        uint256 toRewardPool = total * Config.RAKE_TO_REWARDPOOL_BPS / Config.BPS;
        uint256 toTreasury = total * Config.RAKE_TO_TREASURY_BPS / Config.BPS;
        uint256 toBurn = rake - toRewardPool - toTreasury;
        if (toRewardPool > 0) TL.safeTransfer(address(REWARD_POOL), toRewardPool);
        if (toBurn > 0) ERC20Burnable(address(TL)).burn(toBurn);
        if (toTreasury > 0) TL.safeTransfer(TREASURY, toTreasury);
    }
}
