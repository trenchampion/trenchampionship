// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BattleEngine} from "../src/BattleEngine.sol";
import {CharacterPool} from "../src/CharacterPool.sol";
import {Config} from "../src/Config.sol";
import {ControllerNFT} from "../src/ControllerNFT.sol";
import {GuardianPausable} from "../src/GuardianPausable.sol";
import {MatchManager} from "../src/MatchManager.sol";
import {StakingVault} from "../src/StakingVault.sol";
import {DeployHelper} from "./helpers/Deploy.sol";

contract MatchesTest is DeployHelper {
    uint256 cA; // alice
    uint256 cB; // bob
    uint256 cC; // carol
    uint256 cA2; // alice's second character

    bytes32 constant SALT_A = keccak256("salt-a");
    bytes32 constant SALT_B = keccak256("salt-b");

    function setUp() public {
        _deployProtocol();
        cA = _createFor(alice, _gen(), 0);
        cB = _createFor(bob, _gen(), 0);
        cC = _createFor(carol, _gen(), 0);
        cA2 = _createFor(alice, _gen(), 0);
        // stakers buy character tokens
        _buyTokens(staker1, cA, 5000e18);
        _buyTokens(staker2, cB, 5000e18);
        _buyTokens(staker1, cB, 1000e18);
    }

    function _buyTokens(address who, uint256 id, uint256 tlIn) internal {
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        vm.startPrank(who);
        tl.approve(address(pool), tlIn);
        pool.buy(tlIn, 0);
        vm.stopPrank();
    }

    function _winA() internal pure returns (BattleEngine.Tactics memory a, BattleEngine.Tactics memory b) {
        a = _tactics(2, 2, 2, 4, 4, 3); // Counter beats Attack: +8 each round
        b = _tactics(0, 0, 0, 4, 4, 3);
    }

    function _drawT() internal pure returns (BattleEngine.Tactics memory a, BattleEngine.Tactics memory b) {
        a = _tactics(0, 0, 0, 4, 4, 3);
        b = _tactics(0, 0, 0, 4, 4, 3);
    }

    function _challenge(address who, uint256 idA, uint256 idB, uint256 stake, uint8 preset)
        internal
        returns (uint256 id)
    {
        vm.startPrank(who);
        if (stake > 0) tl.approve(address(mm), stake);
        id = mm.challenge(idA, idB, stake, preset);
        vm.stopPrank();
    }

    function _accept(address who, uint256 matchId, uint256 idB, uint256 stake) internal {
        vm.startPrank(who);
        if (stake > 0) tl.approve(address(mm), stake);
        mm.accept(matchId, idB);
        vm.stopPrank();
    }

    function _commitBoth(uint256 matchId, BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) internal {
        bytes32 ha = mm.commitHash(matchId, alice, ta.stances, ta.energies, SALT_A);
        bytes32 hb = mm.commitHash(matchId, bob, tb.stances, tb.energies, SALT_B);
        vm.prank(alice);
        mm.commit(matchId, ha, hex"aa");
        vm.prank(bob);
        mm.commit(matchId, hb, hex"bb");
    }

    function _revealBoth(uint256 matchId, BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) internal {
        vm.prank(alice);
        mm.reveal(matchId, ta, SALT_A);
        vm.prank(bob);
        mm.reveal(matchId, tb, SALT_B);
    }

    function _stake(address who, uint256 matchId, uint8 side, uint256 amount) internal {
        uint256 id = side == 0 ? cA : cB;
        vm.startPrank(who);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        pool.token().approve(address(vault), amount);
        vault.stake(matchId, side, amount);
        vm.stopPrank();
    }

    function _tokenBal(address who, uint256 id) internal view returns (uint256) {
        return CharacterPool(factory.poolOf(id)).token().balanceOf(who);
    }

    // ------------------------------------------------------------------ challenge

    function test_challengeEscrowsAndLocks() public {
        uint256 before = tl.balanceOf(alice);
        uint256 matchId = _challenge(alice, cA, cB, 1000e18, 1);
        assertEq(matchId, 1);
        assertEq(before - tl.balanceOf(alice), 1000e18);
        assertEq(tl.balanceOf(address(mm)), 1000e18);
        assertTrue(mm.isBusy(cA));
        assertFalse(mm.isBusy(cB));
        MatchManager.Match memory m = mm.getMatch(matchId);
        assertEq(uint8(m.status), uint8(MatchManager.Status.Challenged));
        assertEq(m.rewardBase, 2000e18);
        assertFalse(m.open);
        // NFT locked while challenged
        vm.prank(alice);
        vm.expectRevert(ControllerNFT.CharacterBusy.selector);
        nft.transferFrom(alice, dave, cA);
    }

    function test_challengeReverts() public {
        vm.startPrank(alice);
        tl.approve(address(mm), type(uint256).max);
        vm.expectRevert(MatchManager.NotController.selector);
        mm.challenge(cB, cA, 1000e18, 1);
        vm.expectRevert(MatchManager.BadStake.selector);
        mm.challenge(cA, cB, Config.STAKE_MIN - 1, 1);
        vm.expectRevert(MatchManager.BadStake.selector);
        mm.challenge(cA, cB, Config.STAKE_MAX + 1, 1);
        vm.expectRevert(MatchManager.BadPreset.selector);
        mm.challenge(cA, cB, 1000e18, 2);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.challenge(cA, cA, 1000e18, 1);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.challenge(cA, cA2, 1000e18, 1); // same controller
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.challenge(cA, 999, 1000e18, 1); // nonexistent
        vm.stopPrank();
        vm.prank(carol);
        nft.retire(cC);
        vm.prank(alice);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.challenge(cA, cC, 1000e18, 1); // retired
    }

    function test_cancelAndClaim() public {
        uint256 matchId = _challenge(alice, cA, cB, 1000e18, 1);
        vm.prank(bob);
        vm.expectRevert(MatchManager.NotController.selector);
        mm.cancel(matchId);
        vm.prank(alice);
        mm.cancel(matchId);
        assertFalse(mm.isBusy(cA));
        assertEq(mm.claimable(alice), 1000e18);
        vm.prank(alice);
        vm.expectRevert(MatchManager.BadStatus.selector);
        mm.cancel(matchId);
        uint256 before = tl.balanceOf(alice);
        vm.prank(alice);
        mm.claim();
        assertEq(tl.balanceOf(alice) - before, 1000e18);
        vm.prank(alice);
        vm.expectRevert(MatchManager.NothingToClaim.selector);
        mm.claim();
    }

    function test_expiredChallengeRefundsViaPoke() public {
        uint256 matchId = _challenge(alice, cA, cB, 1000e18, 1);
        vm.expectRevert(MatchManager.NothingToDo.selector);
        mm.poke(matchId);
        vm.warp(vm.getBlockTimestamp() + Config.ACCEPT_WINDOW + 1);
        mm.poke(matchId);
        assertEq(mm.claimable(alice), 1000e18);
        assertEq(uint8(mm.getMatch(matchId).outcome), uint8(MatchManager.Outcome.Expired));
        vm.prank(bob);
        vm.expectRevert(MatchManager.BadStatus.selector);
        mm.accept(matchId, cB);
    }

    // ------------------------------------------------------------------ accept

    function test_acceptSetsDeadlines() public {
        uint256 matchId = _challenge(alice, cA, cB, 1000e18, 0);
        vm.prank(carol);
        vm.expectRevert(MatchManager.NotController.selector);
        mm.accept(matchId, cB);
        vm.prank(bob);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.accept(matchId, cC);
        _accept(bob, matchId, cB, 1000e18);
        assertTrue(mm.isBusy(cB));
        uint64 t0 = uint64(vm.getBlockTimestamp());
        assertEq(mm.stakingCloseAt(matchId), t0 + 1 hours);
        assertEq(mm.commitDeadline(matchId), t0 + 2 hours);
        assertTrue(mm.stakingOpen(matchId));
        assertEq(mm.sideCharacter(matchId, 0), cA);
        assertEq(mm.sideCharacter(matchId, 1), cB);
        assertEq(tl.balanceOf(address(mm)), 2000e18);
    }

    function test_acceptTooLate() public {
        uint256 matchId = _challenge(alice, cA, cB, 1000e18, 1);
        vm.warp(vm.getBlockTimestamp() + Config.ACCEPT_WINDOW + 1);
        vm.startPrank(bob);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(MatchManager.TooLate.selector);
        mm.accept(matchId, cB);
        vm.stopPrank();
    }

    function test_openChallenge() public {
        uint256 matchId = _challenge(alice, cA, 0, 500e18, 1);
        assertTrue(mm.getMatch(matchId).open);
        vm.prank(bob);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.accept(matchId, 0);
        vm.startPrank(alice);
        tl.approve(address(mm), 500e18);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.accept(matchId, cA2); // challenger cannot accept their own open challenge
        vm.stopPrank();
        _accept(carol, matchId, cC, 500e18);
        assertEq(mm.sideCharacter(matchId, 1), cC);
        assertEq(mm.getMatch(matchId).controllerB, carol);
    }

    function test_pauseBlocksOnlyChallengeAndAccept() public {
        uint256 open = _challenge(alice, cA, cB, 1000e18, 1);
        vm.prank(guardian);
        mm.pause();
        vm.startPrank(alice);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(GuardianPausable.Paused.selector);
        mm.challenge(cA2, cC, 1000e18, 1);
        vm.stopPrank();
        vm.startPrank(bob);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(GuardianPausable.Paused.selector);
        mm.accept(open, cB);
        vm.stopPrank();
        // cancel and claim still work
        vm.prank(alice);
        mm.cancel(open);
        vm.prank(alice);
        mm.claim();
        vm.prank(guardian);
        mm.unpause();
        _challenge(alice, cA, cB, 1000e18, 1);
    }

    // ------------------------------------------------------------------ commit / reveal / resolve

    function test_fullMatchWinA_payoutsStakersRatingCooldown() public {
        uint256 stake = 1000e18;
        uint256 matchId = _challenge(alice, cA, cB, stake, 1);
        _accept(bob, matchId, cB, stake);
        // staking window
        _stake(staker1, matchId, 0, 2000e18);
        _stake(staker2, matchId, 1, 3000e18);
        _stake(staker1, matchId, 1, 500e18);
        assertEq(vault.totalStaked(matchId, 0), 2000e18);
        assertEq(vault.totalStaked(matchId, 1), 3500e18);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(matchId, ta, tb);
        // too early to reveal: staking still open
        vm.prank(alice);
        vm.expectRevert(MatchManager.TooEarly.selector);
        mm.reveal(matchId, ta, SALT_A);
        vm.warp(mm.stakingCloseAt(matchId));
        assertFalse(mm.stakingOpen(matchId));

        uint256 rpBefore = tl.balanceOf(address(rewardPool));
        uint256 supplyBefore = tl.totalSupply();
        uint256 availBefore = rewardPool.available();
        _revealBoth(matchId, ta, tb);

        MatchManager.Match memory m = mm.getMatch(matchId);
        assertEq(uint8(m.outcome), uint8(MatchManager.Outcome.WinA));
        assertEq(uint8(m.status), uint8(MatchManager.Status.Resolved));
        assertFalse(mm.isBusy(cA));
        assertFalse(mm.isBusy(cB));
        // winner 95 %, 3 % to RewardPool, 2 % burned
        uint256 total = 2 * stake;
        assertEq(mm.claimable(alice), total * 9500 / 10_000);
        assertEq(mm.claimable(bob), 0);
        assertEq(supplyBefore - tl.totalSupply(), total * 200 / 10_000);
        uint256 requested = total * Config.STAKER_REWARD_BPS / Config.BPS;
        uint256 cap = (availBefore + total * 300 / 10_000) * Config.STAKER_REWARD_POOL_CAP_BPS / Config.BPS;
        uint256 expectedReward = requested < cap ? requested : cap;
        assertEq(tl.balanceOf(address(rewardPool)), rpBefore + total * 300 / 10_000 - expectedReward);
        assertEq(tl.balanceOf(address(vault)), expectedReward);
        // rating: A up, B down
        assertEq(rating.ratingOf(cA), 1016);
        assertEq(rating.ratingOf(cB), 984);
        // stakers: winner side shares the reward, loser side gets stake only
        assertEq(vault.pendingReward(matchId, 0, staker1), expectedReward);
        assertEq(vault.pendingReward(matchId, 1, staker2), 0);
        uint256 tokA = _tokenBal(staker1, cA);
        uint256 tokB = _tokenBal(staker1, cB);
        uint256 tlBefore = tl.balanceOf(staker1);
        vm.prank(staker1);
        vault.withdraw(matchId);
        assertEq(_tokenBal(staker1, cA) - tokA, 2000e18);
        assertEq(_tokenBal(staker1, cB) - tokB, 500e18);
        assertEq(tl.balanceOf(staker1) - tlBefore, expectedReward);
        vm.prank(staker1);
        vm.expectRevert(StakingVault.NothingToWithdraw.selector);
        vault.withdraw(matchId);
        vm.prank(staker2);
        vault.withdraw(matchId);
        // dust: single winner staker took everything, nothing to sweep
        vm.expectRevert(StakingVault.NothingToSweep.selector);
        vault.sweepDust(matchId);
        // cooldown blocks a new staked match of the same pair, not a friendly one
        vm.startPrank(alice);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(MatchManager.Cooldown.selector);
        mm.challenge(cA, cB, 1000e18, 1);
        mm.challenge(cA, cB, 0, 1); // friendly
        vm.stopPrank();
        vm.warp(vm.getBlockTimestamp() + Config.PAIR_COOLDOWN);
        _challenge(alice, cA, cB, 1000e18, 1);
        // winner claims
        uint256 b = tl.balanceOf(alice);
        vm.prank(alice);
        mm.claim();
        assertEq(tl.balanceOf(alice) - b, total * 9500 / 10_000);
    }

    function test_drawRefundsAndNoRating() public {
        uint256 matchId = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, matchId, cB, 1000e18);
        _stake(staker1, matchId, 0, 1000e18);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _drawT();
        _commitBoth(matchId, ta, tb);
        vm.warp(mm.stakingCloseAt(matchId));
        uint256 rp = tl.balanceOf(address(rewardPool));
        _revealBoth(matchId, ta, tb);
        assertEq(uint8(mm.getMatch(matchId).outcome), uint8(MatchManager.Outcome.Draw));
        assertEq(mm.claimable(alice), 1000e18);
        assertEq(mm.claimable(bob), 1000e18);
        assertEq(tl.balanceOf(address(rewardPool)), rp);
        assertEq(rating.ratingOf(cA), 1000);
        assertEq(vault.pendingReward(matchId, 0, staker1), 0);
        vm.prank(staker1);
        vault.withdraw(matchId);
        // draw sets the cooldown
        vm.startPrank(alice);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(MatchManager.Cooldown.selector);
        mm.challenge(cA, cB, 1000e18, 1);
        vm.stopPrank();
    }

    function test_commitAndRevealGuards() public {
        uint256 matchId = _challenge(alice, cA, cB, 1000e18, 0);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        bytes32 ha = mm.commitHash(matchId, alice, ta.stances, ta.energies, SALT_A);
        vm.prank(alice);
        vm.expectRevert(MatchManager.BadStatus.selector);
        mm.commit(matchId, ha, "");
        _accept(bob, matchId, cB, 1000e18);
        vm.prank(carol);
        vm.expectRevert(MatchManager.NotParticipant.selector);
        mm.commit(matchId, ha, "");
        vm.prank(alice);
        vm.expectRevert(MatchManager.NotCommitted.selector);
        mm.reveal(matchId, ta, SALT_A);
        vm.prank(alice);
        mm.commit(matchId, ha, hex"01");
        vm.prank(alice);
        vm.expectRevert(MatchManager.AlreadyCommitted.selector);
        mm.commit(matchId, ha, "");
        bytes32 hb = mm.commitHash(matchId, bob, tb.stances, tb.energies, SALT_B);
        vm.prank(bob);
        mm.commit(matchId, hb, "");
        vm.warp(mm.stakingCloseAt(matchId));
        vm.prank(alice);
        vm.expectRevert(MatchManager.BadReveal.selector);
        mm.reveal(matchId, ta, SALT_B);
        // invalid tactics with a matching commit
        BattleEngine.Tactics memory bad = _tactics(0, 0, 0, 5, 5, 5);
        uint256 m2 = _challenge(alice, cA, cC, 0, 0);
        _accept(carol, m2, cC, 0);
        bytes32 hBad = mm.commitHash(m2, alice, bad.stances, bad.energies, SALT_A);
        bytes32 hCarol = mm.commitHash(m2, carol, tb.stances, tb.energies, SALT_B);
        vm.prank(alice);
        mm.commit(m2, hBad, "");
        vm.prank(carol);
        mm.commit(m2, hCarol, "");
        vm.warp(mm.stakingCloseAt(m2));
        vm.prank(alice);
        vm.expectRevert(MatchManager.InvalidTactics.selector);
        mm.reveal(m2, bad, SALT_A);
        // back to match 1: proper reveal, then double reveal, then late reveal by B
        vm.prank(alice);
        mm.reveal(matchId, ta, SALT_A);
        vm.prank(alice);
        vm.expectRevert(MatchManager.AlreadyRevealed.selector);
        mm.reveal(matchId, ta, SALT_A);
        vm.warp(mm.revealDeadline(matchId) + 1);
        vm.prank(bob);
        vm.expectRevert(MatchManager.TooLate.selector);
        mm.reveal(matchId, tb, SALT_B);
        // poke -> forfeit, A wins; rating counts it as a loss for B
        mm.poke(matchId);
        assertEq(uint8(mm.getMatch(matchId).outcome), uint8(MatchManager.Outcome.WinA));
        assertEq(mm.claimable(alice), 2000e18 * 9500 / 10_000);
        assertEq(rating.ratingOf(cB), 984);
        vm.expectRevert(MatchManager.NothingToDo.selector);
        mm.poke(matchId);
    }

    function test_commitTimeouts() public {
        // nobody commits -> void, both refunded, stakers withdraw
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m1, cB, 1000e18);
        uint256 s2Before = _tokenBal(staker2, cB);
        _stake(staker2, m1, 1, 1000e18);
        assertEq(_tokenBal(staker2, cB), s2Before - 1000e18);
        vm.expectRevert(MatchManager.NothingToDo.selector);
        mm.poke(m1);
        vm.warp(mm.commitDeadline(m1) + 1);
        vm.prank(alice);
        vm.expectRevert(MatchManager.TooLate.selector);
        mm.commit(m1, bytes32(uint256(1)), "");
        mm.poke(m1);
        assertEq(uint8(mm.getMatch(m1).outcome), uint8(MatchManager.Outcome.Void));
        assertEq(mm.claimable(alice), 1000e18);
        assertEq(mm.claimable(bob), 1000e18);
        assertEq(rating.ratingOf(cA), 1000);
        vm.prank(staker2);
        vault.withdraw(m1);
        assertEq(_tokenBal(staker2, cB), s2Before);
        // void sets no cooldown: same pair again immediately, one commits -> forfeit for the other
        uint256 m2 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m2, cB, 1000e18);
        (, BattleEngine.Tactics memory tb) = _winA();
        bytes32 hb2 = mm.commitHash(m2, bob, tb.stances, tb.energies, SALT_B);
        vm.prank(bob);
        mm.commit(m2, hb2, "");
        vm.warp(mm.commitDeadline(m2) + 1);
        mm.poke(m2);
        assertEq(uint8(mm.getMatch(m2).outcome), uint8(MatchManager.Outcome.WinB));
        assertEq(mm.claimable(bob), 1000e18 + 2000e18 * 9500 / 10_000);
        assertEq(rating.ratingOf(cB), 1016);
    }

    function test_revealTimeoutBothSilentIsVoid() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m1, cB, 1000e18);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(m1, ta, tb);
        vm.warp(mm.stakingCloseAt(m1));
        vm.expectRevert(MatchManager.NothingToDo.selector);
        mm.poke(m1);
        vm.warp(mm.revealDeadline(m1) + 1);
        mm.poke(m1);
        assertEq(uint8(mm.getMatch(m1).outcome), uint8(MatchManager.Outcome.Void));
        assertEq(mm.claimable(alice), 1000e18);
    }

    function test_revealDeadlineStartsAtLaterOfCommitsAndStakingClose() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 1);
        _accept(bob, m1, cB, 1000e18);
        uint64 close = mm.stakingCloseAt(m1);
        // commits land after the staking window closed: reveal window starts at the second commit
        vm.warp(close + 10 hours);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(m1, ta, tb);
        assertEq(mm.revealDeadline(m1), uint64(vm.getBlockTimestamp()) + 24 hours);
    }

    function test_friendlyMatchHasNoEscrowStakingRatingOrCooldown() public {
        uint256 m1 = _challenge(alice, cA, cB, 0, 0);
        _accept(bob, m1, cB, 0);
        assertEq(tl.balanceOf(address(mm)), 0);
        assertFalse(mm.stakingOpen(m1));
        vm.startPrank(staker1);
        CharacterPool(factory.poolOf(cA)).token().approve(address(vault), 1e18);
        vm.expectRevert(StakingVault.StakingClosed.selector);
        vault.stake(m1, 0, 1e18);
        vm.stopPrank();
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(m1, ta, tb);
        vm.warp(mm.stakingCloseAt(m1));
        _revealBoth(m1, ta, tb);
        assertEq(uint8(mm.getMatch(m1).outcome), uint8(MatchManager.Outcome.WinA));
        assertEq(rating.ratingOf(cA), 1000);
        assertEq(mm.claimable(alice), 0);
        _challenge(alice, cA, cB, 1000e18, 1); // no cooldown after a friendly
    }

    // ------------------------------------------------------------------ staking guards

    function test_stakingGuards() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        vm.startPrank(staker1);
        CharacterPool(factory.poolOf(cA)).token().approve(address(vault), type(uint256).max);
        vm.expectRevert(StakingVault.StakingClosed.selector);
        vault.stake(m1, 0, 1e18); // not accepted yet
        vm.stopPrank();
        _accept(bob, m1, cB, 1000e18);
        vm.startPrank(staker1);
        vm.expectRevert(StakingVault.BadSide.selector);
        vault.stake(m1, 2, 1e18);
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vault.stake(m1, 0, 0);
        vm.stopPrank();
        // controllers cannot stake on their own match
        _buyTokens(alice, cA, 100e18);
        vm.startPrank(alice);
        CharacterPool(factory.poolOf(cA)).token().approve(address(vault), type(uint256).max);
        vm.expectRevert(StakingVault.ControllerCannotStake.selector);
        vault.stake(m1, 0, 1e18);
        vm.stopPrank();
        // paused vault blocks stake only
        vm.prank(guardian);
        vault.pause();
        vm.startPrank(staker1);
        vm.expectRevert(GuardianPausable.Paused.selector);
        vault.stake(m1, 0, 1e18);
        vm.stopPrank();
        vm.prank(guardian);
        vault.unpause();
        _stake(staker1, m1, 0, 1e18);
        // withdraw before resolution is refused
        vm.prank(staker1);
        vm.expectRevert(StakingVault.NotResolved.selector);
        vault.withdraw(m1);
        vm.warp(mm.stakingCloseAt(m1));
        vm.startPrank(staker1);
        vm.expectRevert(StakingVault.StakingClosed.selector);
        vault.stake(m1, 0, 1e18);
        vm.stopPrank();
        vm.expectRevert(StakingVault.NotMatchManager.selector);
        vault.onResolved(m1, 0, 0);
    }

    function test_rewardSplitAndDust() public {
        uint256 stake = 1000e18;
        uint256 m1 = _challenge(alice, cA, cB, stake, 0);
        _accept(bob, m1, cB, stake);
        _stake(staker1, m1, 0, 1000e18);
        _buyTokens(staker2, cA, 2000e18);
        _stake(staker2, m1, 0, 2000e18 + 1); // odd total forces dust
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(m1, ta, tb);
        vm.warp(mm.stakingCloseAt(m1));
        _revealBoth(m1, ta, tb);
        (,, uint256 reward,,) = vault.resolutions(m1);
        uint256 total = vault.totalStaked(m1, 0);
        uint256 r1 = reward * 1000e18 / total;
        uint256 r2 = reward * (2000e18 + 1) / total;
        assertEq(vault.pendingReward(m1, 0, staker1), r1);
        assertEq(vault.pendingReward(m1, 0, staker2), r2);
        vm.expectRevert(StakingVault.NothingToSweep.selector);
        vault.sweepDust(m1); // winners have not withdrawn yet
        vm.prank(staker1);
        vault.withdraw(m1);
        vm.prank(staker2);
        vault.withdraw(m1);
        uint256 dust = reward - r1 - r2;
        if (dust > 0) {
            uint256 rp = tl.balanceOf(address(rewardPool));
            vault.sweepDust(m1);
            assertEq(tl.balanceOf(address(rewardPool)) - rp, dust);
            vm.expectRevert(StakingVault.NothingToSweep.selector);
            vault.sweepDust(m1);
        }
        assertEq(tl.balanceOf(address(vault)), 0);
    }

    function test_rewardCappedByPoolAvailability() public {
        // maximum stake: requested 3 % of 2M TL = 60k, far above 2 % of what is available early
        uint256 stake = Config.STAKE_MAX;
        uint256 m1 = _challenge(alice, cA, cB, stake, 0);
        _accept(bob, m1, cB, stake);
        _stake(staker1, m1, 0, 1000e18);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(m1, ta, tb);
        vm.warp(mm.stakingCloseAt(m1));
        uint256 availBefore = rewardPool.available();
        _revealBoth(m1, ta, tb);
        (,, uint256 reward,,) = vault.resolutions(m1);
        uint256 cap = (availBefore + 2 * stake * 300 / 10_000) * 200 / 10_000;
        assertEq(reward, cap);
        assertLt(reward, 2 * stake * 300 / 10_000);
    }

    // ------------------------------------------------------------------ tournament hook

    function test_tournamentMatch() public {
        vm.prank(carol);
        vm.expectRevert(MatchManager.NotTournament.selector);
        mm.createTournamentMatch(cA, cB, 1000e18);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.createTournamentMatch(cA, cA2, 1000e18); // same controller
        uint256 m1 = mm.createTournamentMatch(cA, cB, 1000e18);
        MatchManager.Match memory m = mm.getMatch(m1);
        assertTrue(m.tournament);
        assertEq(uint8(m.status), uint8(MatchManager.Status.Accepted));
        assertEq(m.preset, 2);
        assertEq(m.stake, 0);
        assertEq(m.rewardBase, 1000e18);
        assertTrue(mm.stakingOpen(m1));
        assertTrue(mm.isBusy(cA) && mm.isBusy(cB));
        _stake(staker1, m1, 0, 500e18);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(m1, ta, tb);
        vm.warp(mm.stakingCloseAt(m1));
        _revealBoth(m1, ta, tb);
        assertEq(uint8(mm.getMatch(m1).outcome), uint8(MatchManager.Outcome.WinA));
        assertEq(mm.claimable(alice), 0, "escrow lives in the Tournament contract");
        assertEq(rating.ratingOf(cA), 1016);
        assertGt(vault.pendingReward(m1, 0, staker1), 0);
    }

    function test_winBByBattleAndTacticsOf() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m1, cB, 1000e18);
        (BattleEngine.Tactics memory tb, BattleEngine.Tactics memory ta) = _winA(); // swapped: B counters A
        _commitBoth(m1, ta, tb);
        vm.warp(mm.stakingCloseAt(m1));
        _revealBoth(m1, ta, tb);
        assertEq(uint8(mm.getMatch(m1).outcome), uint8(MatchManager.Outcome.WinB));
        assertEq(mm.claimable(bob), 2000e18 * 9500 / 10_000);
        assertEq(mm.claimable(alice), 0);
        assertEq(rating.ratingOf(cB), 1016);
        BattleEngine.Tactics memory stored = mm.tacticsOf(m1, 1);
        assertEq(stored.stances[0], tb.stances[0]);
        assertEq(stored.energies[2], tb.energies[2]);
    }

    function test_revealOnWrongStatusAndDoubleCommitB() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        vm.prank(alice);
        vm.expectRevert(MatchManager.BadStatus.selector);
        mm.reveal(m1, ta, SALT_A);
        _accept(bob, m1, cB, 1000e18);
        bytes32 hb = mm.commitHash(m1, bob, tb.stances, tb.energies, SALT_B);
        vm.prank(bob);
        mm.commit(m1, hb, "");
        vm.prank(bob);
        vm.expectRevert(MatchManager.AlreadyCommitted.selector);
        mm.commit(m1, hb, "");
    }

    function test_forfeitWhenOnlyChallengerCommits() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m1, cB, 1000e18);
        (BattleEngine.Tactics memory ta,) = _winA();
        bytes32 ha = mm.commitHash(m1, alice, ta.stances, ta.energies, SALT_A);
        vm.prank(alice);
        mm.commit(m1, ha, "");
        vm.warp(mm.commitDeadline(m1) + 1);
        mm.poke(m1);
        assertEq(uint8(mm.getMatch(m1).outcome), uint8(MatchManager.Outcome.WinA));
        assertEq(mm.claimable(alice), 2000e18 * 9500 / 10_000);
    }

    function test_forfeitWhenOnlyOpponentReveals() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m1, cB, 1000e18);
        (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb) = _winA();
        _commitBoth(m1, ta, tb);
        vm.warp(mm.stakingCloseAt(m1));
        vm.prank(bob);
        mm.reveal(m1, tb, SALT_B);
        vm.warp(mm.revealDeadline(m1) + 1);
        mm.poke(m1);
        assertEq(uint8(mm.getMatch(m1).outcome), uint8(MatchManager.Outcome.WinB));
        assertEq(mm.claimable(bob), 2000e18 * 9500 / 10_000);
        assertEq(rating.ratingOf(cA), 984);
    }

    function test_acceptRefusedForSameController() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        vm.prank(bob);
        nft.transferFrom(bob, alice, cB);
        vm.startPrank(alice);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(MatchManager.BadOpponent.selector);
        mm.accept(m1, cB);
        vm.stopPrank();
    }

    function test_pairBusyBlocksStackedChallenges() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        assertEq(mm.activePairs(mm.pairKey(cA, cB)), 1);
        vm.startPrank(alice);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(MatchManager.PairBusy.selector);
        mm.challenge(cA, cB, 1000e18, 0);
        vm.stopPrank();
        vm.startPrank(bob);
        tl.approve(address(mm), 1000e18);
        vm.expectRevert(MatchManager.PairBusy.selector);
        mm.challenge(cB, cA, 1000e18, 0);
        vm.stopPrank();
        // a friendly challenge of the same pair is still allowed
        vm.prank(alice);
        mm.challenge(cA, cB, 0, 0);
        // cancelling the staked one frees the pair
        vm.prank(alice);
        mm.cancel(m1);
        assertEq(mm.activePairs(mm.pairKey(cA, cB)), 0);
        _challenge(alice, cA, cB, 1000e18, 0);
    }

    function test_emptyCommitRefused() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m1, cB, 1000e18);
        vm.prank(alice);
        vm.expectRevert(MatchManager.EmptyCommit.selector);
        mm.commit(m1, bytes32(0), "");
    }

    function test_vaultResolutionGuards() public {
        uint256 m1 = _challenge(alice, cA, cB, 1000e18, 0);
        _accept(bob, m1, cB, 1000e18);
        vm.startPrank(address(mm));
        vault.onResolved(m1, 0, 1); // a reward without stakers never blocks the resolution
        assertEq(vault.pendingReward(m1, 0, staker1), 0);
        vm.expectRevert(StakingVault.AlreadyResolved.selector);
        vault.onResolved(m1, 2, 0);
        vm.stopPrank();
    }

    function test_presetDurationsAndCommitHash() public {
        assertEq(mm.presetDuration(0), 1 hours);
        assertEq(mm.presetDuration(1), 24 hours);
        assertEq(mm.presetDuration(2), 12 hours);
        vm.expectRevert(MatchManager.BadPreset.selector);
        mm.presetDuration(3);
        uint8[3] memory s = [0, 1, 2];
        uint8[3] memory e = [4, 4, 3];
        assertEq(mm.commitHash(1, alice, s, e, SALT_A), keccak256(abi.encode(uint256(1), alice, s, e, SALT_A)));
        assertEq(mm.pairKey(cA, cB), mm.pairKey(cB, cA));
    }
}
