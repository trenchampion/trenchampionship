// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BattleEngine} from "../../src/BattleEngine.sol";
import {CharacterFactory} from "../../src/CharacterFactory.sol";
import {CharacterPool} from "../../src/CharacterPool.sol";
import {Config} from "../../src/Config.sol";
import {MatchManager} from "../../src/MatchManager.sol";
import {Rating} from "../../src/Rating.sol";
import {Tournament} from "../../src/Tournament.sol";
import {DeployHelper} from "../helpers/Deploy.sol";

/// @dev Review B (value flows): PoCs for the findings. Each test is self-contained.
contract ReviewBTournamentReplayTest is DeployHelper {
    address[8] owners;
    uint256[8] ids;
    uint256 constant ENTRY = 1000e18;
    bytes32 constant SALT = keccak256("salt");
    address fan = makeAddr("fan"); // the ring's staking address

    function setUp() public {
        _deployProtocolWithTournament();
        owners = [alice, bob, carol, dave, staker1, staker2, makeAddr("eve"), makeAddr("frank")];
        for (uint256 i = 0; i < 8; i++) {
            if (tl.balanceOf(owners[i]) == 0) tl.transfer(owners[i], 2_000_000e18);
            ids[i] = _createFor(owners[i], _gen(), 0);
        }
        // release part of the seed so the 2 % per-match cap does not bind
        vm.warp(block.timestamp + 365 days);
        // the fan buys a few tokens of every character so it can stake on both sides of every match
        tl.transfer(fan, 100_000e18);
        vm.startPrank(fan);
        for (uint256 i = 0; i < 8; i++) {
            CharacterPool pool = CharacterPool(factory.poolOf(ids[i]));
            tl.approve(address(pool), 1000e18);
            pool.buy(1000e18, 0);
            pool.token().approve(address(vault), type(uint256).max);
        }
        vm.stopPrank();
    }

    function _tacticsFor(uint8 mode)
        internal
        pure
        returns (BattleEngine.Tactics memory ta, BattleEngine.Tactics memory tb)
    {
        if (mode == 0) {
            ta = _tactics(2, 2, 2, 4, 4, 3);
            tb = _tactics(0, 0, 0, 4, 4, 3);
        } else {
            ta = _tactics(0, 0, 0, 4, 4, 3);
            tb = _tactics(0, 0, 0, 4, 4, 3);
        }
    }

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

    /// @dev Stake 1 token on both sides of every match of the round, then play it with `mode`.
    function _playRound(uint256 tid, uint8 mode) internal returns (uint256 matches) {
        Tournament.Bracket memory b = tournament.getBracket(tid);
        matches = b.roundMatches.length;
        for (uint256 i = 0; i < matches; i++) {
            vm.startPrank(fan);
            vault.stake(b.roundMatches[i], 0, 1e18);
            vault.stake(b.roundMatches[i], 1, 1e18);
            vm.stopPrank();
            _commit(b.roundMatches[i], mode);
        }
        vm.warp(mm.stakingCloseAt(b.roundMatches[0]));
        for (uint256 i = 0; i < matches; i++) {
            _reveal(b.roundMatches[i], mode);
        }
    }

    /// @notice Hypothesis (refuted): replays double the staker budget. They do not: a drawn match
    ///         requests no reward (winnerSide 2), so each pairing is rewarded at most once and the
    ///         bracket's total staker reward stays <= the 3 % rake share. Kept as a regression check.
    function test_replayKeepsStakerBudgetPassThrough() public {
        address organizer = makeAddr("organizer");
        vm.prank(organizer);
        uint256 tid = tournament.create(8, ENTRY, 0);
        for (uint256 i = 0; i < 8; i++) {
            vm.startPrank(owners[i]);
            tl.approve(address(tournament), ENTRY);
            tournament.register(tid, ids[i]);
            vm.stopPrank();
        }
        uint256 pot = ENTRY * 8;
        uint256 rpBefore = tl.balanceOf(address(rewardPool));
        tournament.start(tid);

        uint256 rewardPaid;
        uint256 matchesPlayed;
        // three rounds; every pairing draws first, then the replay is decided (A wins)
        for (uint256 round = 0; round < 3; round++) {
            matchesPlayed += _playRound(tid, 1); // draw
            tournament.advance(tid); // schedules replays, round does not advance
            matchesPlayed += _playRound(tid, 0); // replay decided
            tournament.advance(tid);
        }
        Tournament.Bracket memory b = tournament.getBracket(tid);
        assertEq(uint8(b.status), uint8(Tournament.Status.Finished));
        assertEq(matchesPlayed, 14, "7 pairings, each played twice");

        // what the stakers (the ring's fan address) can collect
        for (uint256 i = 1; i <= matchesPlayed; i++) {
            uint256 mid = mm.matchCount() - matchesPlayed + i;
            rewardPaid += vault.pendingReward(mid, 0, fan) + vault.pendingReward(mid, 1, fan);
        }
        uint256 rakeIn = pot * Config.RAKE_TO_REWARDPOOL_BPS / Config.BPS; // 3 % of the pot
        uint256 rpAfter = tl.balanceOf(address(rewardPool));
        emit log_named_uint("pot                 ", pot / 1e18);
        emit log_named_uint("rake to RewardPool  ", rakeIn / 1e18);
        emit log_named_uint("staker rewards paid ", rewardPaid / 1e18);
        assertLe(rewardPaid, rakeIn, "pass-through holds with replays");
        assertGe(rpAfter, rpBefore, "RewardPool never loses on a bracket");
        // the ring as a whole (8 entrants + organizer + fan) still loses the 2 % burn
        uint256 prizes;
        for (uint256 i = 0; i < 8; i++) {
            prizes += tournament.claimable(owners[i]);
        }
        prizes += tournament.claimable(organizer);
        assertLt(prizes + rewardPaid, pot, "no profit from the RewardPool");
    }
}

/// @dev Extreme curve parameters the factory allows: supply 1e12 tokens (1e30 wei), virtual 1000 TL,
///      20 % creator allocation, 1 % creator fee. Round trips never profit; the vested allocation can
///      only be sold while the real reserve covers it; TL and token accounting hold throughout.
contract ReviewBPoolExtremesTest is DeployHelper {
    CharacterPool pool;
    uint256 id;

    function setUp() public {
        _deployProtocol();
        CharacterFactory.Tokenomics memory tk = CharacterFactory.Tokenomics({
            name: "Max",
            symbol: "MAX",
            supply: Config.CHAR_SUPPLY_MAX,
            virtualTl: Config.CHAR_VIRTUAL_TL_MIN,
            creatorAllocBps: uint16(Config.CREATOR_ALLOC_MAX_BPS),
            vestingDuration: uint32(Config.CREATOR_VESTING_MIN),
            creatorFeeBps: uint16(Config.CREATOR_FEE_MAX_BPS)
        });
        vm.startPrank(alice);
        tl.approve(address(factory), Config.MINT_FEE);
        id = factory.createCharacter(_gen(), "ipfs://meta", tk, 0, 0);
        vm.stopPrank();
        pool = CharacterPool(factory.poolOf(id));
    }

    function _accounting() internal view {
        assertEq(tl.balanceOf(address(pool)), pool.realReserve() + pool.creatorFeeOwed(), "TL accounting");
        assertEq(pool.token().balanceOf(address(pool)), pool.tokenReserve(), "token accounting");
    }

    function testFuzz_extremeCurveRoundTripsNeverProfit(uint96[6] memory buys) public {
        uint256 spent;
        uint256 got;
        vm.startPrank(bob);
        tl.approve(address(pool), type(uint256).max);
        pool.token().approve(address(pool), type(uint256).max);
        for (uint256 i = 0; i < 6; i++) {
            uint256 amt = bound(uint256(buys[i]), 1, 300_000e18);
            uint256 before = tl.balanceOf(bob);
            try pool.buy(amt, 0) {
                spent += before - tl.balanceOf(bob);
            } catch {}
            _accounting();
            uint256 half = pool.token().balanceOf(bob) / 2;
            if (half > 0) {
                uint256 b0 = tl.balanceOf(bob);
                try pool.sell(half, 0) {
                    got += tl.balanceOf(bob) - b0;
                } catch {}
            }
            _accounting();
        }
        uint256 rest = pool.token().balanceOf(bob);
        if (rest > 0) {
            uint256 b0 = tl.balanceOf(bob);
            try pool.sell(rest, 0) {
                got += tl.balanceOf(bob) - b0;
            } catch {}
        }
        vm.stopPrank();
        _accounting();
        assertLe(got, spent, "round trips never profit");
    }

    function test_vestedAllocationSellsOnlyWhileCovered() public {
        // a small real reserve first: 10 TL
        vm.startPrank(bob);
        tl.approve(address(pool), type(uint256).max);
        pool.buy(10e18, 0);
        vm.stopPrank();
        _accounting();
        vm.warp(block.timestamp + Config.CREATOR_VESTING_MIN);
        vesting.release(id);
        uint256 alloc = pool.token().balanceOf(alice);
        assertEq(alloc, Config.CHAR_SUPPLY_MAX / 5);
        vm.startPrank(alice);
        pool.token().approve(address(pool), alloc);
        // 20 % of supply quotes ~200 TL against a 1000 TL virtual reserve: more than the 9.9 TL real
        // reserve, so the sale is refused (no underflow, no partial payout)
        assertEq(pool.quoteSell(alloc), 0);
        vm.expectRevert(CharacterPool.InsufficientReserve.selector);
        pool.sell(alloc, 0);
        vm.stopPrank();
        // once buyers have put 50k TL in, the whole allocation is covered and sells for <= the reserve
        vm.prank(bob);
        pool.buy(50_000e18, 0);
        uint256 reserve = pool.realReserve();
        vm.prank(alice);
        uint256 got = pool.sell(alloc, 0);
        assertLe(got, reserve);
        assertGt(got, 0);
        _accounting();
        // bob can still sell down to the remaining reserve, never below
        vm.startPrank(bob);
        uint256 bobTokens = pool.token().balanceOf(bob);
        pool.token().approve(address(pool), bobTokens);
        if (pool.quoteSell(bobTokens) == 0) {
            vm.expectRevert(CharacterPool.InsufficientReserve.selector);
            pool.sell(bobTokens, 0);
        } else {
            pool.sell(bobTokens, 0);
        }
        vm.stopPrank();
        _accounting();
    }
}

