// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BattleEngine} from "../src/BattleEngine.sol";
import {CharacterPool} from "../src/CharacterPool.sol";
import {Config} from "../src/Config.sol";
import {ControllerNFT} from "../src/ControllerNFT.sol";
import {MatchManager} from "../src/MatchManager.sol";
import {Tournament} from "../src/Tournament.sol";
import {DeployHelper} from "./helpers/Deploy.sol";

contract TournamentTest is DeployHelper {
    address[8] owners;
    uint256[8] ids;
    uint256 constant ENTRY = 1000e18;
    bytes32 constant SALT = keccak256("salt");

    function setUp() public {
        _deployProtocolWithTournament();
        owners = [alice, bob, carol, dave, staker1, staker2, makeAddr("eve"), makeAddr("frank")];
        for (uint256 i = 0; i < 8; i++) {
            if (tl.balanceOf(owners[i]) == 0) tl.transfer(owners[i], 2_000_000e18);
            ids[i] = _createFor(owners[i], _gen(), 0);
        }
    }

    address organizer = makeAddr("organizer");

    function _create(uint16 feeBps) internal returns (uint256 tid) {
        vm.prank(organizer);
        tid = tournament.create(8, ENTRY, feeBps);
    }

    function _register(uint256 tid, uint256 i) internal {
        vm.startPrank(owners[i]);
        tl.approve(address(tournament), ENTRY);
        tournament.register(tid, ids[i]);
        vm.stopPrank();
    }

    function _fill(uint256 tid) internal {
        for (uint256 i = 0; i < 8; i++) {
            _register(tid, i);
        }
    }

    /// @dev Commit for both sides: `mode` 0 = A wins, 1 = B wins, 2 = draw.
    function _commit(uint256 matchId, uint8 mode) internal {
        MatchManager.Match memory m = mm.getMatch(matchId);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _tacticsFor(mode);
        bytes32 ha = mm.commitHash(matchId, m.controllerA, ta.stances, ta.energies, SALT);
        bytes32 hb = mm.commitHash(matchId, m.controllerB, tb.stances, tb.energies, SALT);
        vm.prank(m.controllerA);
        mm.commit(matchId, ha, "");
        vm.prank(m.controllerB);
        mm.commit(matchId, hb, "");
    }

    function _reveal(uint256 matchId, uint8 mode) internal {
        MatchManager.Match memory m = mm.getMatch(matchId);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _tacticsFor(mode);
        vm.prank(m.controllerA);
        mm.reveal(matchId, ta, SALT);
        vm.prank(m.controllerB);
        mm.reveal(matchId, tb, SALT);
    }

    function _tacticsFor(uint8 mode)
        internal
        pure
        returns (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb)
    {
        if (mode == 0) {
            ta = _tactics(2, 2, 2, 4, 4, 3);
            tb = _tactics(0, 0, 0, 4, 4, 3);
        } else if (mode == 1) {
            ta = _tactics(0, 0, 0, 4, 4, 3);
            tb = _tactics(2, 2, 2, 4, 4, 3);
        } else {
            ta = _tactics(0, 0, 0, 4, 4, 3);
            tb = _tactics(0, 0, 0, 4, 4, 3);
        }
    }

    /// @dev Play the whole current round with the same outcome mode for every match.
    function _playRound(uint256 tid, uint8 mode) internal {
        Tournament.Bracket memory b = tournament.getBracket(tid);
        for (uint256 i = 0; i < b.roundMatches.length; i++) {
            _commit(b.roundMatches[i], mode);
        }
        vm.warp(mm.stakingCloseAt(b.roundMatches[0]));
        for (uint256 i = 0; i < b.roundMatches.length; i++) {
            _reveal(b.roundMatches[i], mode);
        }
    }

    // ------------------------------------------------------------------ organisation

    function test_createReverts() public {
        vm.expectRevert(Tournament.BadSize.selector);
        tournament.create(7, ENTRY, 0);
        vm.expectRevert(Tournament.BadEntry.selector);
        tournament.create(8, Config.STAKE_MIN - 1, 0);
        vm.expectRevert(Tournament.BadFee.selector);
        tournament.create(8, ENTRY, uint16(Config.TOURNAMENT_ORGANIZER_FEE_MAX_BPS + 1));
        uint256 tid = _create(100);
        Tournament.Bracket memory b = tournament.getBracket(tid);
        assertEq(b.organizer, organizer);
        assertEq(b.size, 8);
        assertEq(uint8(b.status), uint8(Tournament.Status.Open));
        assertEq(tournament.pot(tid), 8 * ENTRY);
    }

    function test_registerGuardsAndLock() public {
        uint256 tid = _create(0);
        vm.startPrank(bob);
        tl.approve(address(tournament), ENTRY);
        vm.expectRevert(Tournament.NotController.selector);
        tournament.register(tid, ids[0]);
        vm.stopPrank();
        _register(tid, 0);
        assertTrue(tournament.isBusy(ids[0]));
        assertTrue(nft.isBusy(ids[0]));
        vm.prank(alice);
        vm.expectRevert(ControllerNFT.CharacterBusy.selector);
        nft.transferFrom(alice, bob, ids[0]);
        vm.startPrank(alice);
        tl.approve(address(tournament), ENTRY);
        vm.expectRevert(Tournament.AlreadyRegistered.selector);
        tournament.register(tid, ids[0]);
        // same controller, second character
        uint256 extra = factory.characterCount();
        vm.stopPrank();
        uint256 aliceSecond = _createFor(alice, _gen(), 0);
        assertEq(aliceSecond, extra + 1);
        vm.startPrank(alice);
        tl.approve(address(tournament), ENTRY);
        vm.expectRevert(Tournament.ControllerAlreadyIn.selector);
        tournament.register(tid, aliceSecond);
        vm.stopPrank();
        // a character cannot sit in two brackets
        uint256 tid2 = _create(0);
        vm.startPrank(alice);
        tl.approve(address(tournament), ENTRY);
        vm.expectRevert(Tournament.AlreadyRegistered.selector);
        tournament.register(tid2, ids[0]);
        vm.stopPrank();
        assertEq(tl.balanceOf(address(tournament)), ENTRY);
        vm.expectRevert(Tournament.NotFull.selector);
        tournament.start(tid);
    }

    function test_unregisterAndCancel() public {
        uint256 tid = _create(0);
        _register(tid, 0);
        _register(tid, 1);
        vm.prank(bob);
        vm.expectRevert(Tournament.NotRegistered.selector);
        tournament.unregister(tid, ids[2]);
        vm.prank(bob);
        vm.expectRevert(Tournament.NotController.selector);
        tournament.unregister(tid, ids[0]);
        vm.prank(alice);
        tournament.unregister(tid, ids[0]);
        assertFalse(tournament.isBusy(ids[0]));
        assertEq(tournament.claimable(alice), ENTRY);
        _register(tid, 0); // can come back
        vm.expectRevert(Tournament.RegistrationOpen.selector);
        tournament.cancel(tid);
        vm.warp(vm.getBlockTimestamp() + Config.TOURNAMENT_REGISTRATION_WINDOW + 1);
        tournament.cancel(tid);
        assertEq(uint8(tournament.getBracket(tid).status), uint8(Tournament.Status.Cancelled));
        assertEq(tournament.claimable(alice), 2 * ENTRY);
        assertEq(tournament.claimable(bob), ENTRY);
        assertFalse(tournament.isBusy(ids[1]));
        vm.prank(alice);
        vm.expectRevert(Tournament.BadStatus.selector);
        tournament.unregister(tid, ids[0]);
        vm.expectRevert(Tournament.BadStatus.selector);
        tournament.cancel(tid);
        uint256 before = tl.balanceOf(alice);
        vm.prank(alice);
        tournament.claim();
        assertEq(tl.balanceOf(alice) - before, 2 * ENTRY);
        vm.prank(alice);
        vm.expectRevert(Tournament.NothingToClaim.selector);
        tournament.claim();
    }

    function test_cancelRefusedWhenFull() public {
        uint256 tid = _create(0);
        _fill(tid);
        vm.warp(vm.getBlockTimestamp() + Config.TOURNAMENT_REGISTRATION_WINDOW + 1);
        vm.expectRevert(Tournament.Full.selector);
        tournament.cancel(tid);
        vm.startPrank(makeAddr("late"));
        vm.expectRevert(Tournament.Full.selector);
        tournament.register(tid, ids[0]);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ bracket

    function test_fullBracketWithPrizes() public {
        uint256 tid = _create(100); // 1 % organizer fee
        _fill(tid);
        uint256 potBefore = tl.balanceOf(address(tournament));
        assertEq(potBefore, 8 * ENTRY);
        tournament.start(tid);
        Tournament.Bracket memory b = tournament.getBracket(tid);
        assertEq(uint8(b.status), uint8(Tournament.Status.Running));
        assertEq(b.round, 1);
        assertEq(b.roundMatches.length, 4);
        // equal ratings -> seeded by lower id; bracket 1v8, 2v7, 3v6, 4v5
        assertEq(b.alive[0], ids[0]);
        assertEq(b.alive[1], ids[7]);
        assertEq(b.alive[2], ids[1]);
        assertEq(b.alive[3], ids[6]);
        MatchManager.Match memory m = mm.getMatch(b.roundMatches[0]);
        assertTrue(m.tournament);
        assertEq(m.rewardBase, 8 * ENTRY * Config.TOURNAMENT_STAKER_TOTAL_BPS / (Config.STAKER_REWARD_BPS * 7));
        assertTrue(mm.stakingOpen(b.roundMatches[0]));
        vm.expectRevert(Tournament.RoundNotFinished.selector);
        tournament.advance(tid);
        vm.expectRevert(Tournament.BadStatus.selector);
        tournament.start(tid);

        _playRound(tid, 0); // A (higher seed) wins every match
        tournament.advance(tid);
        b = tournament.getBracket(tid);
        assertEq(b.round, 2);
        assertEq(b.alive.length, 4);
        assertEq(b.alive[0], ids[0]);
        assertEq(b.alive[1], ids[1]);
        _playRound(tid, 1); // B wins semifinals: ids[1] and ids[3] advance
        tournament.advance(tid);
        b = tournament.getBracket(tid);
        assertEq(b.round, 3);
        assertEq(b.alive.length, 2);
        assertEq(b.semifinalLosers.length, 2);
        assertEq(b.semifinalLosers[0], ids[0]);
        assertEq(b.semifinalLosers[1], ids[2]);
        uint256 rpBefore = tl.balanceOf(address(rewardPool));
        uint256 supplyBefore = tl.totalSupply();
        _playRound(tid, 0); // ids[1] beats ids[3]
        tournament.advance(tid);
        b = tournament.getBracket(tid);
        assertEq(uint8(b.status), uint8(Tournament.Status.Finished));
        assertEq(b.winner, ids[1]);
        assertEq(b.finalist, ids[3]);
        for (uint256 i = 0; i < 8; i++) {
            assertFalse(tournament.isBusy(ids[i]));
        }
        uint256 total = 8 * ENTRY;
        uint256 fee = total * 100 / 10_000;
        uint256 toRP = total * 300 / 10_000;
        uint256 toBurn = total * 200 / 10_000;
        uint256 prizePool = total - fee - toRP - toBurn;
        assertEq(tl.balanceOf(address(rewardPool)) - rpBefore, toRP);
        assertEq(supplyBefore - tl.totalSupply(), toBurn);
        assertEq(tournament.claimable(owners[1]), prizePool * 6000 / 10_000);
        assertEq(tournament.claimable(owners[3]), prizePool * 2500 / 10_000);
        assertEq(tournament.claimable(owners[0]), prizePool * 750 / 10_000);
        assertEq(tournament.claimable(owners[2]), prizePool * 750 / 10_000);
        uint256 dust =
            prizePool - prizePool * 6000 / 10_000 - prizePool * 2500 / 10_000 - 2 * (prizePool * 750 / 10_000);
        assertEq(tournament.claimable(organizer), fee + dust);
        // everything claimable is backed
        uint256 sum;
        for (uint256 i = 0; i < 8; i++) {
            sum += tournament.claimable(owners[i]);
        }
        sum += tournament.claimable(organizer);
        assertEq(sum, tl.balanceOf(address(tournament)));
        vm.prank(owners[1]);
        tournament.claim();
        assertEq(tl.balanceOf(owners[1]), 2_000_000e18 - Config.MINT_FEE - ENTRY + prizePool * 6000 / 10_000);
        // rating moved through MatchManager
        assertGt(rating.ratingOf(ids[1]), 1000);
        vm.expectRevert(Tournament.BadStatus.selector);
        tournament.advance(tid);
    }

    function test_drawReplayThenTiebreak() public {
        uint256 tid = _create(0);
        _fill(tid);
        tournament.start(tid);
        Tournament.Bracket memory b = tournament.getBracket(tid);
        uint256 first = b.roundMatches[0];
        // match 0 draws, the others are decided
        _commit(first, 2);
        for (uint256 i = 1; i < 4; i++) {
            _commit(b.roundMatches[i], 0);
        }
        vm.warp(mm.stakingCloseAt(first));
        _reveal(first, 2);
        for (uint256 i = 1; i < 4; i++) {
            _reveal(b.roundMatches[i], 0);
        }
        tournament.advance(tid); // schedules a replay, round does not advance
        b = tournament.getBracket(tid);
        assertEq(b.round, 1);
        uint256 replay = b.roundMatches[0];
        assertTrue(replay != first);
        assertTrue(tournament.replayed(tid, replay));
        vm.expectRevert(Tournament.RoundNotFinished.selector);
        tournament.advance(tid);
        // replay draws again -> tiebreak: equal rating, lower id advances
        _commit(replay, 2);
        vm.warp(mm.stakingCloseAt(replay));
        _reveal(replay, 2);
        tournament.advance(tid);
        b = tournament.getBracket(tid);
        assertEq(b.round, 2);
        assertEq(b.alive[0], ids[0]);
    }

    function test_voidMatchDecidedByRating() public {
        uint256 tid = _create(0);
        _fill(tid);
        tournament.start(tid);
        Tournament.Bracket memory b = tournament.getBracket(tid);
        // ids[7] earns rating in a side match first? Not possible while busy; instead make the void
        // pairing resolve by lower id and check the rest of the bracket proceeds.
        uint256 silent = b.roundMatches[0];
        for (uint256 i = 1; i < 4; i++) {
            _commit(b.roundMatches[i], 0);
        }
        vm.warp(mm.commitDeadline(silent) + 1);
        mm.poke(silent); // void: nobody committed
        for (uint256 i = 1; i < 4; i++) {
            mm.poke(b.roundMatches[i]); // both committed, nobody revealed -> void as well
        }
        tournament.advance(tid);
        b = tournament.getBracket(tid);
        assertEq(b.round, 2);
        assertEq(b.alive[0], ids[0]); // lower id of (ids[0], ids[7])
        assertEq(b.alive[1], ids[1]);
    }

    function test_seedingByRating() public {
        // give ids[7] a rating edge through a normal match before registering
        vm.startPrank(owners[7]);
        tl.approve(address(mm), 500e18);
        uint256 mid = mm.challenge(ids[7], ids[6], 500e18, 0);
        vm.stopPrank();
        vm.startPrank(owners[6]);
        tl.approve(address(mm), 500e18);
        mm.accept(mid, ids[6]);
        vm.stopPrank();
        _commit(mid, 0);
        vm.warp(mm.stakingCloseAt(mid));
        _reveal(mid, 0);
        assertEq(rating.ratingOf(ids[7]), 1016);
        uint256 tid = _create(0);
        _fill(tid);
        tournament.start(tid);
        Tournament.Bracket memory b = tournament.getBracket(tid);
        assertEq(b.players[0], ids[7], "top seed");
        assertEq(b.players[7], ids[6], "lowest seed lost rating");
        assertEq(b.alive[0], ids[7]);
        assertEq(b.alive[1], ids[6]);
    }

    function test_zeroFeeBracketLowerSeedsWin() public {
        uint256 tid = _create(0);
        // register in reverse order so seeding has to reorder equal ratings by id
        for (uint256 i = 8; i > 0; i--) {
            _register(tid, i - 1);
        }
        tournament.start(tid);
        Tournament.Bracket memory b = tournament.getBracket(tid);
        assertEq(b.players[0], ids[0]);
        assertEq(b.players[7], ids[7]);
        _playRound(tid, 1); // B (lower seed) wins everywhere
        tournament.advance(tid);
        _playRound(tid, 1);
        tournament.advance(tid);
        _playRound(tid, 1);
        tournament.advance(tid);
        b = tournament.getBracket(tid);
        assertEq(uint8(b.status), uint8(Tournament.Status.Finished));
        // round 1: 8v1 -> ids[7], 7v2 -> ids[6], 6v3 -> ids[5], 5v4 -> ids[4]; then B again: ids[6], ids[4]; final: ids[4]
        assertEq(b.winner, ids[4]);
        assertEq(b.finalist, ids[6]);
        assertEq(tournament.claimable(organizer), 0, "no fee, no dust at these amounts");
        uint256 total = 8 * ENTRY;
        uint256 prizePool = total - total * 500 / 10_000;
        assertEq(tournament.claimable(owners[4]), prizePool * 6000 / 10_000);
    }

    function test_stakingInTournamentMatch() public {
        uint256 tid = _create(0);
        _fill(tid);
        tournament.start(tid);
        Tournament.Bracket memory b = tournament.getBracket(tid);
        uint256 mid = b.roundMatches[0];
        // an outsider buys tokens of the top seed and stakes
        address fan = makeAddr("fan");
        tl.transfer(fan, 10_000e18);
        CharacterPool pool = CharacterPool(factory.poolOf(ids[0]));
        vm.startPrank(fan);
        tl.approve(address(pool), 1000e18);
        pool.buy(1000e18, 0);
        pool.token().approve(address(vault), 100e18);
        vault.stake(mid, 0, 100e18);
        vm.stopPrank();
        _playRound(tid, 0);
        assertGt(vault.pendingReward(mid, 0, fan), 0);
    }
}
