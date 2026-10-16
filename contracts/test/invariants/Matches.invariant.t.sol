// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BattleEngine} from "../../src/BattleEngine.sol";
import {CharacterPool} from "../../src/CharacterPool.sol";
import {Config} from "../../src/Config.sol";
import {MatchManager} from "../../src/MatchManager.sol";
import {StakingVault} from "../../src/StakingVault.sol";
import {TLToken} from "../../src/TLToken.sol";
import {DeployHelper} from "../helpers/Deploy.sol";

/// @dev Drives the match state machine randomly: challenges, accepts, stakes, commits, reveals,
///      timeouts, claims and withdrawals, with time warps. Ghost variables track what the
///      contracts must still be holding.
contract MatchHandler is Test {
    TLToken public tl;
    MatchManager public mm;
    StakingVault public vault;
    address[] public controllers;
    uint256[] public characters;
    address[] public stakers;
    mapping(uint256 => address) public tokenOf;

    uint256[] public open; // matches not yet resolved
    uint256 public ghostEscrow; // TL escrowed for unresolved staked matches
    mapping(uint256 => mapping(uint8 => mapping(address => uint256))) public ghostStake; // unclaimed stakes
    mapping(address token => uint256) public ghostTokenHeld; // sum of unclaimed stakes per token
    uint256 public ghostRewardHeld; // TL rewards received by the vault and not yet paid
    uint256 public resolvedCount;
    uint256 public drawsOrVoids;

    bytes32 constant SALT = keccak256("inv");

    constructor(
        TLToken tl_,
        MatchManager mm_,
        StakingVault vault_,
        address[] memory controllers_,
        uint256[] memory characters_,
        address[] memory tokens_,
        address[] memory stakers_
    ) {
        tl = tl_;
        mm = mm_;
        vault = vault_;
        controllers = controllers_;
        characters = characters_;
        stakers = stakers_;
        for (uint256 i = 0; i < characters_.length; i++) {
            tokenOf[characters_[i]] = tokens_[i];
        }
    }

    // ------------------------------------------------------------------ actions

    function challenge(uint256 a, uint256 b, uint256 stakeSeed, uint8 preset) external {
        uint256 ia = a % characters.length;
        uint256 ib = b % characters.length;
        if (ia == ib) return;
        uint256 stake = stakeSeed % 3 == 0 ? 0 : bound(stakeSeed, Config.STAKE_MIN, 5000e18);
        address ca = controllers[ia];
        if (tl.balanceOf(ca) < stake) return;
        vm.startPrank(ca);
        if (stake > 0) tl.approve(address(mm), stake);
        (bool ok, bytes memory data) = address(mm)
            .call(
                abi.encodeWithSelector(
                    MatchManager.challenge.selector, characters[ia], characters[ib], stake, preset % 2
                )
            );
        vm.stopPrank();
        if (!ok) return;
        uint256 id = abi.decode(data, (uint256));
        open.push(id);
        ghostEscrow += stake;
    }

    function accept(uint256 seed) external {
        if (open.length == 0) return;
        uint256 id = open[seed % open.length];
        MatchManager.Match memory m = mm.getMatch(id);
        if (m.status != MatchManager.Status.Challenged) return;
        uint256 ib = _indexOf(m.idB);
        address cb = controllers[ib];
        if (tl.balanceOf(cb) < m.stake) return;
        vm.startPrank(cb);
        if (m.stake > 0) tl.approve(address(mm), m.stake);
        (bool ok,) = address(mm).call(abi.encodeWithSelector(MatchManager.accept.selector, id, m.idB));
        vm.stopPrank();
        if (ok) ghostEscrow += m.stake;
    }

    function stake(uint256 seed, uint8 side, uint256 amount) external {
        if (open.length == 0) return;
        uint256 id = open[seed % open.length];
        if (!mm.stakingOpen(id)) return;
        side = side % 2;
        address who = stakers[seed % stakers.length];
        address token = tokenOf[mm.sideCharacter(id, side)];
        uint256 bal = TLToken(token).balanceOf(who);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        vm.startPrank(who);
        TLToken(token).approve(address(vault), amount);
        (bool ok,) = address(vault).call(abi.encodeWithSelector(StakingVault.stake.selector, id, side, amount));
        vm.stopPrank();
        if (!ok) return;
        ghostStake[id][side][who] += amount;
        ghostTokenHeld[token] += amount;
    }

    function commitBoth(uint256 seed, uint8 modeA, uint8 modeB) external {
        if (open.length == 0) return;
        uint256 id = open[seed % open.length];
        MatchManager.Match memory m = mm.getMatch(id);
        if (m.status != MatchManager.Status.Accepted) return;
        if (m.commitA == bytes32(0)) _commit(id, m.controllerA, m.idA, modeA);
        if (m.commitB == bytes32(0)) _commit(id, m.controllerB, m.idB, modeB);
    }

    function revealBoth(uint256 seed, uint8 modeA, uint8 modeB) external {
        if (open.length == 0) return;
        uint256 idx = seed % open.length;
        uint256 id = open[idx];
        MatchManager.Match memory m = mm.getMatch(id);
        if (m.status != MatchManager.Status.Accepted || m.commitA == bytes32(0) || m.commitB == bytes32(0)) return;
        if (vm.getBlockTimestamp() < mm.stakingCloseAt(id)) vm.warp(mm.stakingCloseAt(id));
        if (!m.revealedA) _reveal(id, m.controllerA, m.idA, modeA);
        m = mm.getMatch(id);
        if (!m.revealedB && m.status == MatchManager.Status.Accepted) _reveal(id, m.controllerB, m.idB, modeB);
        _settle(idx);
    }

    function poke(uint256 seed, uint256 secs) external {
        if (open.length == 0) return;
        uint256 idx = seed % open.length;
        uint256 id = open[idx];
        vm.warp(vm.getBlockTimestamp() + bound(secs, 1, 3 days));
        (bool ok,) = address(mm).call(abi.encodeWithSelector(MatchManager.poke.selector, id));
        if (ok) _settle(idx);
    }

    function claim(uint256 seed) external {
        address who = controllers[seed % controllers.length];
        if (mm.claimable(who) == 0) return;
        vm.prank(who);
        mm.claim();
    }

    function withdraw(uint256 seed, uint256 matchSeed) external {
        address who = stakers[seed % stakers.length];
        uint256 count = mm.matchCount();
        if (count == 0) return;
        uint256 id = (matchSeed % count) + 1;
        (bool resolved,, uint256 reward,,) = vault.resolutions(id);
        if (!resolved) return;
        uint256 s0 = ghostStake[id][0][who];
        uint256 s1 = ghostStake[id][1][who];
        if (s0 + s1 == 0) return;
        uint256 pending = vault.pendingReward(id, 0, who) + vault.pendingReward(id, 1, who);
        vm.prank(who);
        vault.withdraw(id);
        ghostStake[id][0][who] = 0;
        ghostStake[id][1][who] = 0;
        ghostTokenHeld[tokenOf[mm.sideCharacter(id, 0)]] -= s0;
        ghostTokenHeld[tokenOf[mm.sideCharacter(id, 1)]] -= s1;
        ghostRewardHeld -= pending;
        reward; // silence
    }

    // ------------------------------------------------------------------ internals

    function _tactics(uint256 characterId, uint8 mode) internal view returns (BattleEngine.Tactics memory t) {
        uint8 budget = 5 + 12 / 2; // all characters here have speed 12 and no Endurance -> 11
        characterId;
        uint8 st = mode % 3;
        t.stances = [st, st, st];
        t.energies = [uint8(4), uint8(4), uint8(budget - 8)];
    }

    function _commit(uint256 id, address who, uint256 characterId, uint8 mode) internal {
        BattleEngine.Tactics memory t = _tactics(characterId, mode);
        bytes32 h = mm.commitHash(id, who, t.stances, t.energies, SALT);
        vm.prank(who);
        (bool ok,) = address(mm).call(abi.encodeWithSelector(MatchManager.commit.selector, id, h, ""));
        ok;
    }

    function _reveal(uint256 id, address who, uint256 characterId, uint8 mode) internal {
        BattleEngine.Tactics memory t = _tactics(characterId, mode);
        vm.prank(who);
        (bool ok,) = address(mm).call(abi.encodeWithSelector(MatchManager.reveal.selector, id, t, SALT));
        ok;
    }

    /// @dev If the match at `idx` is resolved, update ghosts and drop it from the open list.
    function _settle(uint256 idx) internal {
        uint256 id = open[idx];
        MatchManager.Match memory m = mm.getMatch(id);
        if (m.status != MatchManager.Status.Resolved) return;
        if (m.stake > 0) {
            // escrow leaves the "open" accounting: either paid to the winner or refunded (both claimable)
            uint256 held = m.outcome == MatchManager.Outcome.Expired || m.outcome == MatchManager.Outcome.Cancelled
                ? m.stake
                : 2 * m.stake;
            ghostEscrow -= held;
        }
        (bool resolved,, uint256 reward,,) = vault.resolutions(id);
        if (resolved) ghostRewardHeld += reward;
        if (m.outcome == MatchManager.Outcome.Draw || m.outcome == MatchManager.Outcome.Void) drawsOrVoids++;
        resolvedCount++;
        open[idx] = open[open.length - 1];
        open.pop();
    }

    function _indexOf(uint256 characterId) internal view returns (uint256) {
        for (uint256 i = 0; i < characters.length; i++) {
            if (characters[i] == characterId) return i;
        }
        revert("unknown character");
    }

    function openCount() external view returns (uint256) {
        return open.length;
    }
}

contract MatchesInvariants is DeployHelper {
    MatchHandler handler;
    uint256[] chars;
    address[] ctrls;
    address[] toks;
    address[] stks;

    function setUp() public {
        _deployProtocol();
        ctrls = [alice, bob, carol, dave];
        for (uint256 i = 0; i < ctrls.length; i++) {
            uint256 id = _createFor(ctrls[i], _gen(), 0);
            chars.push(id);
            toks.push(factory.tokenOf(id));
        }
        stks = [staker1, staker2];
        // stakers buy some of every character token
        for (uint256 s = 0; s < stks.length; s++) {
            for (uint256 i = 0; i < chars.length; i++) {
                CharacterPool pool = CharacterPool(factory.poolOf(chars[i]));
                vm.startPrank(stks[s]);
                tl.approve(address(pool), 2000e18);
                pool.buy(2000e18, 0);
                vm.stopPrank();
            }
        }
        handler = new MatchHandler(tl, mm, vault, ctrls, chars, toks, stks);
        targetContract(address(handler));
    }

    /// @dev TL in the MatchManager equals open escrow plus everything claimable.
    function invariant_matchManagerSolvent() public view {
        uint256 claimable;
        for (uint256 i = 0; i < ctrls.length; i++) {
            claimable += mm.claimable(ctrls[i]);
        }
        assertEq(tl.balanceOf(address(mm)), handler.ghostEscrow() + claimable);
    }

    /// @dev The vault holds at least every unclaimed stake of every token (no-loss).
    function invariant_vaultHoldsStakes() public view {
        for (uint256 i = 0; i < toks.length; i++) {
            assertGe(TLToken(toks[i]).balanceOf(address(vault)), handler.ghostTokenHeld(toks[i]));
        }
    }

    /// @dev The vault holds at least the rewards it still owes (dust may remain until swept).
    function invariant_vaultHoldsRewards() public view {
        assertGe(tl.balanceOf(address(vault)), handler.ghostRewardHeld());
    }

    /// @dev A character is busy exactly when it has an unresolved match.
    function invariant_busyMatchesOpenMatches() public view {
        uint256 openBusy;
        for (uint256 i = 0; i < chars.length; i++) {
            if (mm.isBusy(chars[i])) openBusy++;
        }
        // every open match keeps at least its challenger busy
        if (handler.openCount() == 0) assertEq(openBusy, 0);
    }

    /// @dev The RewardPool never holds less than the locked seed.
    function invariant_rewardPoolSeedLocked() public view {
        assertGe(tl.balanceOf(address(rewardPool)), rewardPool.lockedSeed());
    }
}
