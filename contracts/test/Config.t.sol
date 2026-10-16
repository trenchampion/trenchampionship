// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";

/// @dev Structural invariants of the constants: splits sum, pass-through identity, bounds.
contract ConfigTest is Test {
    function test_supplySplit() public pure {
        assertEq(Config.TL_TO_LAUNCHPOOL + Config.TL_TO_REWARDPOOL_SEED, Config.TL_SUPPLY);
    }

    function test_mintFeeSplit() public pure {
        assertEq(Config.MINT_BURN_BPS + Config.MINT_REWARDPOOL_BPS + Config.TREASURY_MINT_BPS, Config.BPS);
    }

    function test_rakeSplitAndPassThrough() public pure {
        assertEq(Config.RAKE_TO_REWARDPOOL_BPS + Config.RAKE_TO_BURN_BPS + Config.RAKE_TO_TREASURY_BPS, Config.RAKE_BPS);
        assertEq(Config.STAKER_REWARD_BPS, Config.RAKE_TO_REWARDPOOL_BPS, "matches must be pass-through");
        assertEq(Config.TOURNAMENT_STAKER_TOTAL_BPS, Config.RAKE_TO_REWARDPOOL_BPS);
        assertEq(
            Config.TOURNAMENT_RAKE_BPS,
            Config.RAKE_TO_REWARDPOOL_BPS + Config.RAKE_TO_BURN_BPS + Config.RAKE_TO_TREASURY_BPS,
            "tournament rake equals the match rake split"
        );
    }

    function test_seasonSplitSums() public pure {
        uint256 sum;
        for (uint256 i = 0; i < 10; i++) {
            sum += Config.seasonSplit(i);
        }
        assertEq(sum, Config.BPS);
        assertEq(Config.seasonSplit(10), 0);
    }

    function test_tournamentPrizeSums() public pure {
        assertEq(
            Config.TOURNAMENT_PRIZE_WINNER_BPS + Config.TOURNAMENT_PRIZE_FINALIST_BPS + 2
                * Config.TOURNAMENT_PRIZE_SEMI_BPS,
            Config.BPS
        );
    }

    function test_ammFees() public pure {
        assertLt(Config.AMM_LP_FEE_BPS + Config.AMM_PROTOCOL_FEE_BPS, Config.BPS, "a swap must return something");
        assertLe(Config.TREASURY_AMM_BPS, Config.BPS);
        assertGt(Config.AMM_MINIMUM_LIQUIDITY, 0, "first-deposit lock must exist");
    }

    function test_bounds() public pure {
        assertLe(Config.TREASURY_TRADE_BPS, Config.BPS);
        assertLe(Config.CREATOR_FEE_MAX_BPS, Config.BPS);
        assertLe(Config.CREATOR_ALLOC_MAX_BPS, Config.BPS);
        assertLt(Config.CHAR_VIRTUAL_TL_MIN, Config.CHAR_VIRTUAL_TL_MAX);
        assertLt(Config.CHAR_SUPPLY_MIN, Config.CHAR_SUPPLY_MAX);
        assertLt(Config.STAKE_MIN, Config.STAKE_MAX);
        assertGe(4 * uint256(Config.TRAIT_MAX), Config.TRAIT_BUDGET, "budget must be reachable under the cap");
    }
}
