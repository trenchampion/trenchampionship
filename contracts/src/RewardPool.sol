// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Config} from "./Config.sol";

/// @title RewardPool
/// @notice Holds TL for player rewards. Receives TL by plain transfer (mint share, rake share,
///         trading fees, seed) and pays only by formula: at most 2 % of `available` per match
///         to the StakingVault, 20 % of `available` per season to Rating. Nobody can withdraw.
/// @dev `available` excludes the part of the seed still locked by the linear release schedule.
///      Callers are fixed at deploy (precomputed addresses). Never pausable.
contract RewardPool {
    using SafeERC20 for IERC20;

    error NotMatchManager();
    error NotRating();
    error UnexpectedBalance();

    event MatchRewardPaid(address indexed to, uint256 requested, uint256 paid);
    event SeasonPaid(address indexed to, uint256 paid);

    IERC20 public immutable TL;
    address public immutable MATCH_MANAGER;
    address public immutable RATING;
    uint256 public immutable DEPLOY_TIME;

    constructor(address tl, address matchManager, address rating) {
        TL = IERC20(tl);
        MATCH_MANAGER = matchManager;
        RATING = rating;
        DEPLOY_TIME = block.timestamp;
        // the seed is minted here by TLToken's constructor; a wrong predicted address would otherwise
        // leave a pool that reports the seed as locked while holding nothing
        if (TL.balanceOf(address(this)) != Config.TL_TO_REWARDPOOL_SEED) revert UnexpectedBalance();
    }

    /// @notice Seed still locked: linear release over SEED_RELEASE_PERIOD.
    function lockedSeed() public view returns (uint256) {
        uint256 elapsed = block.timestamp - DEPLOY_TIME;
        if (elapsed >= Config.SEED_RELEASE_PERIOD) return 0;
        return Config.TL_TO_REWARDPOOL_SEED * (Config.SEED_RELEASE_PERIOD - elapsed) / Config.SEED_RELEASE_PERIOD;
    }

    /// @notice TL the formulas may draw from.
    function available() public view returns (uint256) {
        uint256 bal = TL.balanceOf(address(this));
        uint256 locked = lockedSeed();
        return bal > locked ? bal - locked : 0;
    }

    /// @notice Pay staker rewards for one match: min(requested, 2 % of available). MatchManager only.
    function payMatchReward(uint256 requested, address to) external returns (uint256 paid) {
        if (msg.sender != MATCH_MANAGER) revert NotMatchManager();
        uint256 cap = available() * Config.STAKER_REWARD_POOL_CAP_BPS / Config.BPS;
        paid = requested < cap ? requested : cap;
        if (paid > 0) TL.safeTransfer(to, paid);
        emit MatchRewardPaid(to, requested, paid);
    }

    /// @notice Pay the season prize: 20 % of available. Rating only.
    function paySeason(address to) external returns (uint256 paid) {
        if (msg.sender != RATING) revert NotRating();
        paid = available() * Config.SEASON_PAYOUT_BPS / Config.BPS;
        if (paid > 0) TL.safeTransfer(to, paid);
        emit SeasonPaid(to, paid);
    }
}
