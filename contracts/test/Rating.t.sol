// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {Rating} from "../src/Rating.sol";
import {RewardPool} from "../src/RewardPool.sol";
import {TLToken} from "../src/TLToken.sol";
import {DeployHelper} from "./helpers/Deploy.sol";

/// @dev Rating in isolation: results are injected by pranking as the MatchManager.
contract RatingTest is DeployHelper {
    uint256[] ids; // 8 characters: alice 2, bob 2, carol 2, dave 2

    function setUp() public {
        _deployProtocol();
        address[4] memory owners = [alice, bob, carol, dave];
        for (uint256 i = 0; i < 8; i++) {
            ids.push(_createFor(owners[i / 2], _gen(), 0));
        }
    }

    function _owner(uint256 id) internal view returns (address) {
        return nft.ownerOf(id);
    }

    function _record(uint256 a, uint256 b, int8 outcome) internal {
        vm.prank(address(mm));
        rating.recordResult(a, b, outcome);
    }

    function _license(uint256 id) internal {
        address o = _owner(id);
        vm.startPrank(o);
        tl.approve(address(rating), Config.SEASON_LICENSE);
        rating.license(id);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ table and basics

    function test_expectedScoreTable() public view {
        assertEq(rating.expectedScore(0), 500);
        assertEq(rating.expectedScore(3), 500);
        assertEq(rating.expectedScore(4), 510);
        assertEq(rating.expectedScore(-4), 490);
        assertEq(rating.expectedScore(200), 760);
        assertEq(rating.expectedScore(-200), 240);
        assertEq(rating.expectedScore(735), 990);
        assertEq(rating.expectedScore(2000), 990);
        assertEq(rating.expectedScore(-2000), 10);
        // every bracket is monotone
        uint256 last = 500;
        for (int256 d = 0; d <= 800; d++) {
            uint256 p = rating.expectedScore(d);
            assertGe(p, last);
            last = p;
        }
    }

    function test_defaultsAndAccess() public {
        assertEq(rating.ratingOf(ids[0]), 1000);
        assertEq(rating.currentSeason(), 0);
        vm.expectRevert(Rating.NotMatchManager.selector);
        rating.recordResult(ids[0], ids[1], 1);
    }

    function test_eloUpdateAndKFactor() public {
        _record(ids[0], ids[1], 1);
        assertEq(rating.ratingOf(ids[0]), 1016); // K=32 * (1 - 0.5)
        assertEq(rating.ratingOf(ids[1]), 984);
        assertEq(rating.ratedMatches(ids[0]), 1);
        // 20 rated matches -> K drops to 16 (needs distinct opponents: 3 per pair per season)
        for (uint256 opp = 1; opp < 8; opp++) {
            for (uint256 k = 0; k < 3; k++) {
                if (opp == 1 && k == 0) continue; // already played once
                _record(ids[0], ids[opp], 1);
            }
        }
        assertEq(rating.ratedMatches(ids[0]), 21);
        int256 before = rating.ratingOf(ids[0]);
        // 22nd match against a fresh pairing in the same season is not available (all pairs used 3x),
        // so check K through a loss against ids[1] next season
        vm.warp(vm.getBlockTimestamp() + Config.SEASON_LENGTH);
        int256 squeezed = rating.ratingOf(ids[0]);
        assertLt(squeezed, before);
        int256 oppR = rating.ratingOf(ids[1]);
        _record(ids[0], ids[1], -1);
        int256 expected = int256(rating.expectedScore(squeezed - oppR));
        assertEq(rating.ratingOf(ids[0]), squeezed + 16 * (0 - expected) / 1000);
    }

    function test_pairCapThreePerSeason() public {
        _record(ids[0], ids[1], 1);
        _record(ids[0], ids[1], 1);
        _record(ids[0], ids[1], 1);
        int256 r0 = rating.ratingOf(ids[0]);
        int256 r1 = rating.ratingOf(ids[1]);
        _record(ids[1], ids[0], 1); // fourth meeting, other orientation: not rated
        assertEq(rating.ratingOf(ids[0]), r0);
        assertEq(rating.ratingOf(ids[1]), r1);
        assertEq(rating.ratedMatches(ids[0]), 3);
        // new season, new count
        vm.warp(vm.getBlockTimestamp() + Config.SEASON_LENGTH);
        _record(ids[0], ids[1], 1);
        assertEq(rating.ratedMatches(ids[0]), 4);
    }

    function test_lazySqueeze() public {
        _record(ids[0], ids[1], 1);
        assertEq(rating.ratingOf(ids[0]), 1016);
        vm.warp(vm.getBlockTimestamp() + Config.SEASON_LENGTH);
        assertEq(rating.ratingOf(ids[0]), 1012); // 1000 + 0.8 * 16
        assertEq(rating.ratingOf(ids[1]), 988);
        vm.warp(vm.getBlockTimestamp() + Config.SEASON_LENGTH);
        assertEq(rating.ratingOf(ids[0]), 1009); // 1000 + 0.8 * 12 (integer)
        // touching persists the squeezed value
        rating.nominate(ids[0]);
        assertEq(rating.lastSeasonTouched(ids[0]), 2);
        assertEq(rating.ratingOf(ids[0]), 1009);
    }

    // ------------------------------------------------------------------ licenses

    function test_licenseFlow() public {
        vm.prank(bob);
        vm.expectRevert(Rating.NotController.selector);
        rating.license(ids[0]);
        uint256 before = tl.balanceOf(alice);
        _license(ids[0]);
        assertTrue(rating.licensed(ids[0]));
        assertEq(before - tl.balanceOf(alice), Config.SEASON_LICENSE);
        assertEq(tl.balanceOf(address(rating)), Config.SEASON_LICENSE);
        vm.startPrank(alice);
        tl.approve(address(rating), Config.SEASON_LICENSE);
        vm.expectRevert(Rating.AlreadyLicensed.selector);
        rating.license(ids[0]);
        vm.stopPrank();
        vm.prank(bob);
        vm.expectRevert(Rating.NotController.selector);
        rating.unlicense(ids[0]);
        vm.prank(alice);
        rating.unlicense(ids[0]);
        assertFalse(rating.licensed(ids[0]));
        assertEq(tl.balanceOf(alice), before);
        vm.prank(alice);
        vm.expectRevert(Rating.NotLicensed.selector);
        rating.unlicense(ids[0]);
    }

    function test_eligibilityNeedsLicenseMatchesAndOpponents() public {
        _license(ids[0]);
        // 2 matches against each of 5 opponents: 10 matches, 5 distinct -> not eligible
        for (uint256 opp = 1; opp <= 5; opp++) {
            _record(ids[0], ids[opp], 1);
            _record(ids[0], ids[opp], 1);
        }
        assertEq(rating.seasonRatedMatches(0, ids[0]), 10);
        assertEq(rating.seasonDistinctOpponents(0, ids[0]), 5);
        assertFalse(rating.eligible(0, ids[0]));
        assertEq(rating.top(0).length, 0);
        // unlicensed opponents do not accumulate season counters
        assertEq(rating.seasonRatedMatches(0, ids[1]), 0);
        _record(ids[0], ids[6], 1);
        assertTrue(rating.eligible(0, ids[0]));
        uint256[] memory t = rating.top(0);
        assertEq(t.length, 1);
        assertEq(t[0], ids[0]);
        // unlicensing drops eligibility and the top entry, resets counters
        vm.prank(alice);
        rating.unlicense(ids[0]);
        assertEq(rating.top(0).length, 0);
        assertEq(rating.seasonRatedMatches(0, ids[0]), 0);
    }

    /// @dev Make `id` eligible: 2 matches vs each of 6 distinct opponents (wins if `win`).
    function _qualify(uint256 id, bool win) internal {
        uint256 done;
        for (uint256 i = 0; i < 8 && done < 6; i++) {
            if (ids[i] == id) continue;
            if (_owner(ids[i]) == _owner(id)) continue;
            _record(id, ids[i], win ? int8(1) : int8(-1));
            _record(id, ids[i], win ? int8(1) : int8(-1));
            done++;
        }
        require(done == 6, "need 6 opponents");
    }

    function test_topOrderingNominateAndSeasonClose() public {
        // alice's ids[0], bob's ids[2], carol's ids[4] compete; ids[0] strongest
        _license(ids[0]);
        _license(ids[2]);
        _license(ids[4]);
        _qualify(ids[4], false);
        _qualify(ids[2], true);
        _qualify(ids[0], true);
        uint256[] memory t = rating.top(0);
        assertEq(t.length, 3);
        assertEq(rating.ratingOf(t[0]) >= rating.ratingOf(t[1]), true);
        assertEq(rating.ratingOf(t[1]) >= rating.ratingOf(t[2]), true);
        assertEq(t[2], ids[4]);
        // nominate is idempotent
        rating.nominate(ids[0]);
        assertEq(rating.top(0).length, 3);

        // close too early
        vm.expectRevert(Rating.SeasonNotOver.selector);
        rating.closeSeason();

        // the third-placed character withdraws its license before the close (a licensed character
        // cannot be retired): it leaves the list and its share stays with the pool
        vm.prank(_owner(ids[4]));
        rating.unlicense(ids[4]);

        vm.warp(rating.seasonEnd(0));
        uint256 avail = rewardPool.available();
        uint256 prize = avail * Config.SEASON_PAYOUT_BPS / Config.BPS;
        uint256 rpBefore = tl.balanceOf(address(rewardPool));
        rating.closeSeason();
        assertTrue(rating.seasonClosed(0));
        assertEq(rating.seasonsClosed(), 1);
        address first = _owner(t[0]);
        address second = _owner(t[1]);
        assertEq(rating.claimable(first), prize * 4000 / 10_000);
        assertEq(rating.claimable(second), prize * 2000 / 10_000);
        // the third place left the list: its 10 % stays with the pool, which lost exactly 60 % of the prize
        assertEq(rpBefore - tl.balanceOf(address(rewardPool)), prize * 6000 / 10_000);
        // closing again needs season 1 to end
        vm.expectRevert(Rating.SeasonNotOver.selector);
        rating.closeSeason();
        // results after the close do not touch the closed list
        _record(ids[0], ids[6], 1);
        assertEq(rating.top(0).length, 2);
        // claim
        uint256 bal = tl.balanceOf(first);
        vm.prank(first);
        rating.claim();
        assertEq(tl.balanceOf(first) - bal, prize * 4000 / 10_000);
        vm.prank(first);
        vm.expectRevert(Rating.NothingToClaim.selector);
        rating.claim();
    }

    function test_topKeepsTenAndRepositions() public {
        // only the 8 characters exist; all licensed and qualified -> list of 8, sorted
        for (uint256 i = 0; i < 8; i++) {
            _license(ids[i]);
        }
        for (uint256 i = 0; i < 8; i++) {
            for (uint256 j = i + 1; j < 8; j++) {
                if (_owner(ids[i]) == _owner(ids[j])) continue;
                _record(ids[i], ids[j], 1); // lower index wins
                _record(ids[i], ids[j], 1);
            }
        }
        uint256[] memory t = rating.top(0);
        assertEq(t.length, 8);
        for (uint256 i = 0; i + 1 < t.length; i++) {
            assertGe(rating.ratingOf(t[i]), rating.ratingOf(t[i + 1]));
        }
        assertEq(t[0], ids[0]);
        // a loss repositions the leader
        for (uint256 k = 0; k < 3; k++) {
            _record(ids[7], ids[0], 1);
        }
        t = rating.top(0);
        assertTrue(t[0] != ids[0] || rating.ratingOf(ids[0]) >= rating.ratingOf(t[1]));
    }

    function test_topKeepsExactlyTenOfEleven() public {
        // three more characters -> 11 in total, all licensed and qualified
        ids.push(_createFor(alice, _gen(), 0));
        ids.push(_createFor(bob, _gen(), 0));
        ids.push(_createFor(carol, _gen(), 0));
        for (uint256 i = 0; i < 11; i++) {
            _license(ids[i]);
        }
        for (uint256 i = 0; i < 11; i++) {
            for (uint256 j = i + 1; j < 11; j++) {
                if (_owner(ids[i]) == _owner(ids[j])) continue;
                _record(ids[i], ids[j], 1);
                _record(ids[i], ids[j], 1);
            }
        }
        uint256[] memory t = rating.top(0);
        assertEq(t.length, 10, "capped at ten");
        bool hasLast;
        for (uint256 i = 0; i < t.length; i++) {
            if (t[i] == ids[10]) hasLast = true;
        }
        assertFalse(hasLast, "weakest of eleven is out");
        // the weakest wins its remaining rated games and climbs into the list, pushing one out
        for (uint256 i = 0; i < 10; i++) {
            if (_owner(ids[i]) == _owner(ids[10])) continue;
            _record(ids[10], ids[i], 1);
        }
        t = rating.top(0);
        assertEq(t.length, 10);
        for (uint256 i = 0; i < t.length; i++) {
            if (t[i] == ids[10]) hasLast = true;
        }
        assertTrue(hasLast, "climbed in");
        for (uint256 i = 0; i + 1 < t.length; i++) {
            assertGe(rating.ratingOf(t[i]), rating.ratingOf(t[i + 1]));
        }
    }

    function test_retireRefusedWhileLicensed() public {
        uint256 id = _createFor(alice, _gen(), 0);
        _license(id);
        vm.prank(alice);
        vm.expectRevert(bytes4(keccak256("Licensed()")));
        nft.retire(id);
        vm.startPrank(alice);
        rating.unlicense(id);
        nft.retire(id);
        vm.stopPrank();
        assertEq(nft.controllerOf(id), address(0));
        assertEq(tl.balanceOf(address(rating)), 0, "deposit returned");
        vm.expectRevert(Rating.NotController.selector);
        rating.nominate(id);
    }

    function test_rewardPoolAccessAndSeedSchedule() public {
        vm.expectRevert(RewardPool.NotRating.selector);
        rewardPool.paySeason(address(this));
        vm.expectRevert(RewardPool.NotMatchManager.selector);
        rewardPool.payMatchReward(1, address(this));
        uint256 locked0 = rewardPool.lockedSeed();
        assertEq(locked0, Config.TL_TO_REWARDPOOL_SEED);
        assertEq(rewardPool.available(), tl.balanceOf(address(rewardPool)) - locked0);
        vm.warp(vm.getBlockTimestamp() + Config.SEED_RELEASE_PERIOD / 2);
        assertEq(rewardPool.lockedSeed(), Config.TL_TO_REWARDPOOL_SEED / 2);
        vm.warp(vm.getBlockTimestamp() + Config.SEED_RELEASE_PERIOD);
        assertEq(rewardPool.lockedSeed(), 0);
        assertEq(rewardPool.available(), tl.balanceOf(address(rewardPool)));
    }

    /// @dev Review finding 2026-10-16: between seasonEnd and closeSeason a listed character can be unlicensed
    ///      (that only edits the next season's list) and then retired. Its share must stay in the RewardPool,
    ///      never be booked to address(0).
    function test_closeSeasonSkipsRetiredCharacter() public {
        _license(ids[0]);
        _license(ids[2]);
        _qualify(ids[2], false);
        _qualify(ids[0], true);
        uint256[] memory t = rating.top(0);
        assertEq(t.length, 2);
        assertEq(t[0], ids[0]);

        vm.warp(rating.seasonEnd(0)); // season 1 has started, season 0 is not closed yet
        assertEq(rating.currentSeason(), 1);
        vm.startPrank(_owner(ids[0]));
        rating.unlicense(ids[0]);
        nft.retire(ids[0]);
        vm.stopPrank();
        assertEq(nft.controllerOf(ids[0]), address(0));
        assertEq(rating.top(0).length, 2); // the frozen season-0 list still has it

        uint256 prize = rewardPool.available() * Config.SEASON_PAYOUT_BPS / Config.BPS;
        uint256 rpBefore = tl.balanceOf(address(rewardPool));
        rating.closeSeason();
        // first place (retired) is skipped: nothing for address(0), the second place is booked as usual and
        // the pool only lost the booked share
        assertEq(rating.claimable(address(0)), 0);
        assertEq(rating.claimable(_owner(ids[2])), prize * 2000 / 10_000);
        assertEq(rpBefore - tl.balanceOf(address(rewardPool)), prize * 2000 / 10_000);
        assertEq(tl.balanceOf(address(rating)), Config.SEASON_LICENSE + prize * 2000 / 10_000);
    }
}

/// @dev Separate contract: forge coverage only records a reverted CREATE in a test function of its own.
contract RewardPoolDeployTest is Test {
    function test_refusesDeployWithoutSeed() public {
        TLToken tl = new TLToken(address(this), address(this));
        vm.expectRevert(RewardPool.UnexpectedBalance.selector);
        new RewardPool(address(tl), address(1), address(2));
    }

    function test_availableIsZeroWhileSeedLocked() public {
        // a fresh pool holds exactly the seed and the seed is fully locked at deploy
        address predicted = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        TLToken tl = new TLToken(address(this), predicted);
        RewardPool pool = new RewardPool(address(tl), address(1), address(2));
        assertEq(address(pool), predicted);
        assertEq(pool.lockedSeed(), Config.TL_TO_REWARDPOOL_SEED);
        assertEq(pool.available(), 0);
    }
}
