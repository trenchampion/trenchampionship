// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Config} from "./Config.sol";
import {MatchManager} from "./MatchManager.sol";
import {IActivityLock} from "./interfaces/IActivityLock.sol";
import {IControllerNFT} from "./interfaces/IProtocol.sol";

interface IRatingView {
    function ratingOf(uint256 characterId) external view returns (int256);
}

/// @title Tournament
/// @notice Single-elimination brackets of 8 or 16 characters. Anyone organises one (fee 0-2 %),
///         controllers register with the entry stake, seeding is deterministic by rating, each
///         round is a MatchManager match with the Tournament preset, and prizes are claimable
///         60 / 25 / 7.5 / 7.5 of the pool after the 5 % rake. Never pausable, no owner.
/// @dev Draws are replayed once; a second draw (or a void) is decided by rating, then lower id.
///      Registered characters are locked (IActivityLock) until the bracket finishes or cancels.
contract Tournament is ReentrancyGuard, IActivityLock {
    using SafeERC20 for IERC20;

    error BadSize();
    error BadEntry();
    error BadFee();
    error BadStatus();
    error NotController();
    error Full();
    error NotFull();
    error AlreadyRegistered();
    error ControllerAlreadyIn();
    error NotRegistered();
    error RegistrationOpen();
    error RoundNotFinished();
    error NothingToClaim();

    enum Status {
        Open,
        Running,
        Finished,
        Cancelled
    }

    struct Bracket {
        address organizer;
        uint8 size;
        uint16 organizerFeeBps;
        Status status;
        uint8 round; // 1-based once running
        uint64 createdAt;
        uint256 entry;
        uint256[] players; // registration order, then seeded order after start
        uint256[] alive; // characters still in the bracket, in bracket order
        uint256[] roundMatches; // MatchManager ids of the current round (0 = decided without a match)
        uint256[] semifinalLosers;
        uint256 winner;
        uint256 finalist;
    }

    event Created(
        uint256 indexed tournamentId, address indexed organizer, uint8 size, uint256 entry, uint16 organizerFeeBps
    );
    event Registered(uint256 indexed tournamentId, uint256 indexed characterId, address indexed controller);
    event Unregistered(uint256 indexed tournamentId, uint256 indexed characterId);
    event Started(uint256 indexed tournamentId, uint256[] seeded);
    event RoundStarted(uint256 indexed tournamentId, uint8 round, uint256[] matchIds);
    event Replay(uint256 indexed tournamentId, uint256 indexed oldMatchId, uint256 indexed newMatchId);
    event Finished(uint256 indexed tournamentId, uint256 winner, uint256 finalist, uint256 prizePool);
    event Cancelled(uint256 indexed tournamentId);
    event Claimed(address indexed to, uint256 amount);

    IERC20 public immutable TL;
    MatchManager public immutable MATCH_MANAGER;
    IControllerNFT public immutable NFT;
    IRatingView public immutable RATING;
    address public immutable REWARD_POOL;
    address public immutable TREASURY;

    uint256 public tournamentCount;
    mapping(uint256 tournamentId => Bracket) internal _brackets;
    mapping(uint256 tournamentId => mapping(uint256 characterId => bool)) public registered;
    mapping(uint256 tournamentId => mapping(address controller => bool)) public controllerIn;
    mapping(uint256 tournamentId => mapping(uint256 matchId => bool)) public replayed;
    /// @notice Rating of each player when the bracket started; tiebreaks read this snapshot, not the live rating.
    mapping(uint256 tournamentId => mapping(uint256 characterId => int256)) public seedRating;
    mapping(uint256 characterId => uint256) public activeTournament; // 0 = none
    mapping(address => uint256) public claimable;

    constructor(address tl, address matchManager, address nft, address rating, address rewardPool, address treasury) {
        TL = IERC20(tl);
        MATCH_MANAGER = MatchManager(matchManager);
        NFT = IControllerNFT(nft);
        RATING = IRatingView(rating);
        REWARD_POOL = rewardPool;
        TREASURY = treasury;
    }

    // ------------------------------------------------------------------ views

    function getBracket(uint256 tournamentId) external view returns (Bracket memory) {
        return _brackets[tournamentId];
    }

    /// @inheritdoc IActivityLock
    function isBusy(uint256 characterId) external view returns (bool) {
        return activeTournament[characterId] != 0;
    }

    /// @notice Total pot and its split for a bracket (pure arithmetic on the entry).
    function pot(uint256 tournamentId) public view returns (uint256) {
        Bracket storage b = _brackets[tournamentId];
        return b.entry * b.size;
    }

    // ------------------------------------------------------------------ organisation

    /// @notice Open a bracket. `organizerFeeBps` in 0..TOURNAMENT_ORGANIZER_FEE_MAX_BPS.
    function create(uint8 size, uint256 entry, uint16 organizerFeeBps) external returns (uint256 tournamentId) {
        if (size != 8 && size != 16) revert BadSize();
        if (entry < Config.STAKE_MIN || entry > Config.STAKE_MAX) revert BadEntry();
        if (organizerFeeBps > Config.TOURNAMENT_ORGANIZER_FEE_MAX_BPS) revert BadFee();
        tournamentId = ++tournamentCount;
        Bracket storage b = _brackets[tournamentId];
        b.organizer = msg.sender;
        b.size = size;
        b.entry = entry;
        b.organizerFeeBps = organizerFeeBps;
        b.createdAt = uint64(block.timestamp);
        emit Created(tournamentId, msg.sender, size, entry, organizerFeeBps);
    }

    /// @notice Register a character you control; one character per controller per bracket.
    function register(uint256 tournamentId, uint256 characterId) external nonReentrant {
        Bracket storage b = _brackets[tournamentId];
        if (b.status != Status.Open) revert BadStatus();
        if (b.players.length >= b.size) revert Full();
        if (NFT.ownerOf(characterId) != msg.sender) revert NotController();
        if (registered[tournamentId][characterId] || activeTournament[characterId] != 0) revert AlreadyRegistered();
        if (controllerIn[tournamentId][msg.sender]) revert ControllerAlreadyIn();
        registered[tournamentId][characterId] = true;
        controllerIn[tournamentId][msg.sender] = true;
        activeTournament[characterId] = tournamentId;
        b.players.push(characterId);
        TL.safeTransferFrom(msg.sender, address(this), b.entry);
        emit Registered(tournamentId, characterId, msg.sender);
    }

    /// @notice Leave an open bracket; the entry is refunded as claimable.
    function unregister(uint256 tournamentId, uint256 characterId) external nonReentrant {
        Bracket storage b = _brackets[tournamentId];
        if (b.status != Status.Open) revert BadStatus();
        if (!registered[tournamentId][characterId]) revert NotRegistered();
        if (NFT.ownerOf(characterId) != msg.sender) revert NotController();
        _remove(b.players, characterId);
        registered[tournamentId][characterId] = false;
        controllerIn[tournamentId][msg.sender] = false;
        activeTournament[characterId] = 0;
        claimable[msg.sender] += b.entry;
        emit Unregistered(tournamentId, characterId);
    }

    /// @notice Cancel an open bracket that did not fill within the registration window. Anyone.
    function cancel(uint256 tournamentId) external nonReentrant {
        Bracket storage b = _brackets[tournamentId];
        if (b.status != Status.Open) revert BadStatus();
        if (b.players.length >= b.size) revert Full();
        if (block.timestamp <= b.createdAt + Config.TOURNAMENT_REGISTRATION_WINDOW) revert RegistrationOpen();
        b.status = Status.Cancelled;
        for (uint256 i = 0; i < b.players.length; i++) {
            uint256 id = b.players[i];
            activeTournament[id] = 0;
            claimable[NFT.controllerOf(id)] += b.entry;
        }
        emit Cancelled(tournamentId);
    }

    /// @notice Seed and start a full bracket. Anyone.
    function start(uint256 tournamentId) external nonReentrant {
        Bracket storage b = _brackets[tournamentId];
        if (b.status != Status.Open) revert BadStatus();
        if (b.players.length != b.size) revert NotFull();
        uint256[] memory seeded = _seed(b.players);
        // bracket order: 1 vs n, 2 vs n-1, ... so the top seeds meet last
        uint256 n = seeded.length;
        delete b.alive;
        for (uint256 i = 0; i < n / 2; i++) {
            b.alive.push(seeded[i]);
            b.alive.push(seeded[n - 1 - i]);
        }
        b.players = seeded;
        // snapshot the ratings used for seeding: tiebreaks read this, not the live rating, so a
        // participant cannot change the outcome by playing regular matches during the bracket
        for (uint256 i = 0; i < n; i++) {
            seedRating[tournamentId][seeded[i]] = RATING.ratingOf(seeded[i]);
        }
        b.status = Status.Running;
        emit Started(tournamentId, seeded);
        _startRound(tournamentId, b);
    }

    /// @notice Advance once every match of the current round is resolved. Anyone.
    /// @dev MatchManager is a trusted protocol contract; the only external call here creates a
    ///      replay match and its id must be stored afterwards (nonReentrant guards the function).
    // slither-disable-next-line reentrancy-no-eth
    function advance(uint256 tournamentId) external nonReentrant {
        Bracket storage b = _brackets[tournamentId];
        if (b.status != Status.Running) revert BadStatus();
        uint256 pairs = b.alive.length / 2;
        uint256[] memory next = new uint256[](pairs);
        bool needReplay = false;
        for (uint256 i = 0; i < pairs; i++) {
            uint256 a = b.alive[2 * i];
            uint256 c = b.alive[2 * i + 1];
            uint256 mid = b.roundMatches[i];
            MatchManager.Match memory m = MATCH_MANAGER.getMatch(mid);
            if (m.status != MatchManager.Status.Resolved) revert RoundNotFinished();
            if (m.outcome == MatchManager.Outcome.WinA) {
                next[i] = a;
            } else if (m.outcome == MatchManager.Outcome.WinB) {
                next[i] = c;
            } else if (m.outcome == MatchManager.Outcome.Draw && !replayed[tournamentId][mid]) {
                // one replay per pairing
                uint256 fresh = MATCH_MANAGER.createTournamentMatch(a, c, _rewardBase(b));
                replayed[tournamentId][fresh] = true;
                b.roundMatches[i] = fresh;
                emit Replay(tournamentId, mid, fresh);
                needReplay = true;
            } else {
                next[i] = _tiebreak(tournamentId, a, c); // second draw or void: seed rating, then lower id
            }
        }
        if (needReplay) return;
        if (pairs == 2) {
            // semifinals: record the losers for their prize share
            for (uint256 i = 0; i < 2; i++) {
                uint256 a = b.alive[2 * i];
                uint256 c = b.alive[2 * i + 1];
                b.semifinalLosers.push(next[i] == a ? c : a);
            }
        }
        if (pairs == 1) {
            uint256 a = b.alive[0];
            uint256 c = b.alive[1];
            b.winner = next[0];
            b.finalist = next[0] == a ? c : a;
            _finish(tournamentId, b);
            return;
        }
        delete b.alive;
        for (uint256 i = 0; i < pairs; i++) {
            b.alive.push(next[i]);
        }
        _startRound(tournamentId, b);
    }

    /// @notice Withdraw prizes, refunds and organizer fees.
    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        TL.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // ------------------------------------------------------------------ internals

    /// @dev Per-match staker budget such that the bracket's total equals TOURNAMENT_STAKER_TOTAL_BPS of the pot.
    function _rewardBase(Bracket storage b) internal view returns (uint256) {
        uint256 matchesTotal = uint256(b.size) - 1;
        return b.entry * b.size * Config.TOURNAMENT_STAKER_TOTAL_BPS / (Config.STAKER_REWARD_BPS * matchesTotal);
    }

    function _startRound(uint256 tournamentId, Bracket storage b) internal {
        b.round++;
        delete b.roundMatches;
        uint256 pairs = b.alive.length / 2;
        uint256[] memory ids = new uint256[](pairs);
        uint256 base = _rewardBase(b);
        for (uint256 i = 0; i < pairs; i++) {
            ids[i] = MATCH_MANAGER.createTournamentMatch(b.alive[2 * i], b.alive[2 * i + 1], base);
            b.roundMatches.push(ids[i]);
        }
        emit RoundStarted(tournamentId, b.round, ids);
    }

    function _finish(uint256 tournamentId, Bracket storage b) internal {
        b.status = Status.Finished;
        uint256 total = pot(tournamentId);
        uint256 fee = total * b.organizerFeeBps / Config.BPS;
        uint256 toRewardPool = total * Config.RAKE_TO_REWARDPOOL_BPS / Config.BPS;
        uint256 toBurn = total * Config.RAKE_TO_BURN_BPS / Config.BPS;
        uint256 toTreasury = total * Config.RAKE_TO_TREASURY_BPS / Config.BPS;
        uint256 prizePool = total - fee - toRewardPool - toBurn - toTreasury;
        // effects first: book every claim, free the characters
        uint256 w = prizePool * Config.TOURNAMENT_PRIZE_WINNER_BPS / Config.BPS;
        uint256 f = prizePool * Config.TOURNAMENT_PRIZE_FINALIST_BPS / Config.BPS;
        uint256 s = prizePool * Config.TOURNAMENT_PRIZE_SEMI_BPS / Config.BPS;
        uint256 distributed = w + f;
        _credit(b.winner, w);
        _credit(b.finalist, f);
        for (uint256 i = 0; i < b.semifinalLosers.length; i++) {
            _credit(b.semifinalLosers[i], s);
            distributed += s;
        }
        // organizer fee plus rounding dust, so the contract never strands TL
        claimable[b.organizer] += fee + (prizePool - distributed);
        for (uint256 i = 0; i < b.players.length; i++) {
            activeTournament[b.players[i]] = 0;
        }
        emit Finished(tournamentId, b.winner, b.finalist, prizePool);
        // interactions last: rake out of the contract
        TL.safeTransfer(REWARD_POOL, toRewardPool);
        ERC20Burnable(address(TL)).burn(toBurn);
        if (toTreasury > 0) TL.safeTransfer(TREASURY, toTreasury);
    }

    function _credit(uint256 characterId, uint256 amount) internal {
        address to = NFT.controllerOf(characterId);
        claimable[to] += amount;
    }

    /// @dev Insertion sort by rating descending, ties by lower id (n <= 16).
    function _seed(uint256[] storage players) internal view returns (uint256[] memory out) {
        uint256 n = players.length;
        out = new uint256[](n);
        int256[] memory r = new int256[](n);
        for (uint256 i = 0; i < n; i++) {
            out[i] = players[i];
            r[i] = RATING.ratingOf(players[i]);
        }
        for (uint256 i = 1; i < n; i++) {
            uint256 j = i;
            while (j > 0 && (r[j - 1] < r[j] || (r[j - 1] == r[j] && out[j - 1] > out[j]))) {
                (r[j - 1], r[j]) = (r[j], r[j - 1]);
                (out[j - 1], out[j]) = (out[j], out[j - 1]);
                j--;
            }
        }
    }

    function _tiebreak(uint256 tournamentId, uint256 a, uint256 c) internal view returns (uint256) {
        int256 ra = seedRating[tournamentId][a];
        int256 rc = seedRating[tournamentId][c];
        if (ra != rc) return ra > rc ? a : c;
        return a < c ? a : c;
    }

    function _remove(uint256[] storage list, uint256 value) internal {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == value) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
    }
}
