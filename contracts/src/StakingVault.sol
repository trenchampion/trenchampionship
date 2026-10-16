// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {GuardianPausable} from "./GuardianPausable.sol";
import {ICharacterRegistry, IControllerNFT, IMatchManagerViews} from "./interfaces/IProtocol.sol";

/// @title StakingVault
/// @notice No-loss staking per match. Holders of either character's token stake during the
///         staking window; after resolution everyone withdraws exactly what they staked, and
///         stakers of the winning side share the TL reward the RewardPool released for that match.
/// @dev Only `stake` is pausable. Withdrawals always work. The vault never pays from one match to
///      another: rewards are booked per match, stakes per (match, side, staker).
contract StakingVault is GuardianPausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error NotMatchManager();
    error StakingClosed();
    error BadSide();
    error ZeroAmount();
    error ControllerCannotStake();
    error NotResolved();
    error AlreadyResolved();
    error NothingToWithdraw();
    error NothingToSweep();
    error NoStakers();

    event Staked(uint256 indexed matchId, uint8 indexed side, address indexed staker, uint256 amount);
    event Resolved(uint256 indexed matchId, uint8 winnerSide, uint256 reward);
    event Withdrawn(uint256 indexed matchId, address indexed staker, uint256 stake, uint256 reward);
    event DustSwept(uint256 indexed matchId, uint256 amount);

    /// @dev winnerSide: 0 = A, 1 = B, 2 = none (draw / void).
    struct Resolution {
        bool resolved;
        uint8 winnerSide;
        uint256 reward;
        uint256 rewardClaimed;
        uint256 winnerStakeRemaining;
    }

    IERC20 public immutable TL;
    IMatchManagerViews public immutable MATCH_MANAGER;
    ICharacterRegistry public immutable FACTORY;
    IControllerNFT public immutable NFT;
    address public immutable REWARD_POOL;

    mapping(uint256 matchId => mapping(uint8 side => mapping(address staker => uint256))) public stakes;
    mapping(uint256 matchId => mapping(uint8 side => uint256)) public totalStaked;
    mapping(uint256 matchId => Resolution) public resolutions;

    constructor(address tl, address matchManager, address factory, address nft, address rewardPool, address guardian)
        GuardianPausable(guardian)
    {
        TL = IERC20(tl);
        MATCH_MANAGER = IMatchManagerViews(matchManager);
        FACTORY = ICharacterRegistry(factory);
        NFT = IControllerNFT(nft);
        REWARD_POOL = rewardPool;
    }

    /// @notice Stake `amount` of side `side`'s character token on match `matchId`.
    function stake(uint256 matchId, uint8 side, uint256 amount) external nonReentrant whenNotPaused {
        if (side > 1) revert BadSide();
        if (amount == 0) revert ZeroAmount();
        if (!MATCH_MANAGER.stakingOpen(matchId)) revert StakingClosed();
        uint256 idA = MATCH_MANAGER.sideCharacter(matchId, 0);
        uint256 idB = MATCH_MANAGER.sideCharacter(matchId, 1);
        if (msg.sender == NFT.controllerOf(idA) || msg.sender == NFT.controllerOf(idB)) revert ControllerCannotStake();
        uint256 characterId = side == 0 ? idA : idB;
        IERC20 token = IERC20(FACTORY.tokenOf(characterId));
        token.safeTransferFrom(msg.sender, address(this), amount);
        stakes[matchId][side][msg.sender] += amount;
        totalStaked[matchId][side] += amount;
        emit Staked(matchId, side, msg.sender, amount);
    }

    /// @notice Record the outcome and the TL reward already transferred here. MatchManager only.
    function onResolved(uint256 matchId, uint8 winnerSide, uint256 reward) external {
        if (msg.sender != address(MATCH_MANAGER)) revert NotMatchManager();
        Resolution storage r = resolutions[matchId];
        if (r.resolved) revert AlreadyResolved();
        r.resolved = true;
        r.winnerSide = winnerSide;
        r.reward = reward;
        r.winnerStakeRemaining = winnerSide <= 1 ? totalStaked[matchId][winnerSide] : 0;
        // MatchManager only requests a reward when the winning side has stake; should that ever not
        // hold, the reward stays here and sweepDust returns it to RewardPool instead of blocking the
        // match resolution (a revert here would strand escrow and every stake of the match)
        emit Resolved(matchId, winnerSide, reward);
    }

    /// @notice Reward a staker would receive now for `side` of `matchId`.
    function pendingReward(uint256 matchId, uint8 side, address staker) public view returns (uint256) {
        Resolution storage r = resolutions[matchId];
        if (!r.resolved || r.winnerSide != side || r.reward == 0 || totalStaked[matchId][side] == 0) return 0;
        return r.reward * stakes[matchId][side][staker] / totalStaked[matchId][side];
    }

    /// @notice Withdraw your stake on both sides of a resolved match, plus the winner-side reward.
    function withdraw(uint256 matchId) external nonReentrant {
        Resolution storage r = resolutions[matchId];
        if (!r.resolved) revert NotResolved();
        uint256 idA = MATCH_MANAGER.sideCharacter(matchId, 0);
        uint256 idB = MATCH_MANAGER.sideCharacter(matchId, 1);
        uint256 reward = 0;
        uint256 stakeOut = 0;
        for (uint8 side = 0; side < 2; side++) {
            uint256 s = stakes[matchId][side][msg.sender];
            if (s == 0) continue;
            stakes[matchId][side][msg.sender] = 0;
            stakeOut += s;
            if (side == r.winnerSide) {
                uint256 rw = r.reward * s / totalStaked[matchId][side];
                reward += rw;
                r.rewardClaimed += rw;
                r.winnerStakeRemaining -= s;
            }
            IERC20(FACTORY.tokenOf(side == 0 ? idA : idB)).safeTransfer(msg.sender, s);
        }
        if (stakeOut == 0) revert NothingToWithdraw();
        if (reward > 0) TL.safeTransfer(msg.sender, reward);
        emit Withdrawn(matchId, msg.sender, stakeOut, reward);
    }

    /// @notice Return rounding dust to RewardPool once every winning staker has withdrawn.
    function sweepDust(uint256 matchId) external nonReentrant {
        Resolution storage r = resolutions[matchId];
        if (!r.resolved || r.winnerStakeRemaining != 0) revert NothingToSweep();
        uint256 dust = r.reward - r.rewardClaimed;
        if (dust == 0) revert NothingToSweep();
        r.rewardClaimed = r.reward;
        TL.safeTransfer(REWARD_POOL, dust);
        emit DustSwept(matchId, dust);
    }
}
