// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BattleEngine} from "../../src/BattleEngine.sol";
import {CharacterPool} from "../../src/CharacterPool.sol";
import {CharacterToken} from "../../src/CharacterToken.sol";
import {Config} from "../../src/Config.sol";
import {LaunchPool} from "../../src/LaunchPool.sol";
import {TLToken} from "../../src/TLToken.sol";
import {DeployHelper} from "../helpers/Deploy.sol";

/// @dev Random buys and sells on the LaunchPool from a fixed set of actors, with time warps.
contract LaunchPoolHandler is Test {
    TLToken public tl;
    LaunchPool public pool;
    address[] public actors;
    uint256 public ghostK;
    uint256 public ethIn;
    uint256 public ethOut;

    constructor(TLToken tl_, LaunchPool pool_, address[] memory actors_) {
        tl = tl_;
        pool = pool_;
        actors = actors_;
        ghostK = pool.quoteReserve() * pool.tokenReserve();
    }

    function buy(uint256 actorSeed, uint256 amount) external {
        address a = actors[actorSeed % actors.length];
        amount = bound(amount, 1, 20 ether);
        vm.deal(a, a.balance + amount);
        if (pool.capActive()) {
            if (amount > Config.LP_MAX_BUY_PER_TX) amount = Config.LP_MAX_BUY_PER_TX;
            uint256 room = pool.capAllowance() > pool.cappedInflow() ? pool.capAllowance() - pool.cappedInflow() : 0;
            if (room == 0) return;
            if (amount > room) amount = room;
        }
        if (pool.quoteBuy(amount) == 0) return;
        vm.prank(a);
        pool.buy{value: amount}(0);
        ethIn += amount;
        _k();
    }

    function sell(uint256 actorSeed, uint256 fraction) external {
        address a = actors[actorSeed % actors.length];
        uint256 bal = tl.balanceOf(a);
        if (bal == 0) return;
        uint256 amount = bound(fraction, 1, bal);
        if (pool.quoteSell(amount) == 0) return;
        vm.startPrank(a);
        tl.approve(address(pool), amount);
        uint256 out = pool.sell(amount, 0);
        vm.stopPrank();
        ethOut += out;
        _k();
    }

    function warp(uint256 secs) external {
        vm.warp(vm.getBlockTimestamp() + bound(secs, 1, 3 days));
    }

    function _k() internal {
        uint256 k = pool.quoteReserve() * pool.tokenReserve();
        require(k >= ghostK, "k decreased");
        ghostK = k;
    }
}

contract LaunchPoolInvariants is Test {
    TLToken tl;
    LaunchPool pool;
    LaunchPoolHandler handler;
    address founder = makeAddr("founder");
    address rewardPool = makeAddr("rewardPool");
    address[] actors;

    function setUp() public {
        vm.deal(founder, 10 ether);
        vm.startPrank(founder);
        address predicted = vm.computeCreateAddress(founder, vm.getNonce(founder) + 1);
        tl = new TLToken(predicted, rewardPool);
        pool = new LaunchPool{value: 0.2857 ether}(address(tl));
        vm.stopPrank();
        actors.push(founder);
        for (uint256 i = 0; i < 4; i++) {
            actors.push(makeAddr(string.concat("actor", vm.toString(i))));
        }
        handler = new LaunchPoolHandler(tl, pool, actors);
        targetContract(address(handler));
    }

    /// @dev ETH held equals the accounted real reserve.
    function invariant_ethAccounting() public view {
        assertEq(address(pool).balance, pool.realReserve());
    }

    /// @dev TL held equals the accounted token reserve.
    function invariant_tokenAccounting() public view {
        assertEq(tl.balanceOf(address(pool)), pool.tokenReserve());
    }

    /// @dev Every TL on the curve is either in the pool or with an actor (RewardPool seed aside).
    function invariant_conservation() public view {
        uint256 sum = tl.balanceOf(address(pool));
        for (uint256 i = 0; i < actors.length; i++) {
            sum += tl.balanceOf(actors[i]);
        }
        assertEq(sum, Config.TL_TO_LAUNCHPOOL);
    }

    /// @dev The pool never pays out more ETH than it received.
    function invariant_solvency() public view {
        assertLe(handler.ethOut(), handler.ethIn() + 0.2857 ether);
        assertGe(pool.quoteReserve() * pool.tokenReserve(), Config.LP_VIRTUAL_ETH * Config.TL_TO_LAUNCHPOOL);
    }

    /// @dev Net inflow counted for the cap never exceeds the allowance while the cap is active.
    function invariant_capRespected() public view {
        if (pool.capActive()) assertLe(pool.cappedInflow(), pool.capAllowance());
    }
}

/// @dev Random trades on one CharacterPool plus creator-fee claims and vesting releases.
contract CharacterPoolHandler is Test {
    TLToken public tl;
    CharacterPool public pool;
    CharacterToken public token;
    address[] public actors;
    uint256 public ghostK;

    constructor(TLToken tl_, CharacterPool pool_, address[] memory actors_) {
        tl = tl_;
        pool = pool_;
        token = CharacterToken(address(pool_.token()));
        actors = actors_;
        ghostK = pool.quoteReserve() * pool.tokenReserve();
    }

    function buy(uint256 actorSeed, uint256 amount) external {
        address a = actors[actorSeed % actors.length];
        uint256 bal = tl.balanceOf(a);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        if (pool.quoteBuy(amount) == 0) return;
        vm.startPrank(a);
        tl.approve(address(pool), amount);
        pool.buy(amount, 0);
        vm.stopPrank();
        _k();
    }

    function sell(uint256 actorSeed, uint256 fraction) external {
        address a = actors[actorSeed % actors.length];
        uint256 bal = token.balanceOf(a);
        if (bal == 0) return;
        uint256 amount = bound(fraction, 1, bal);
        if (pool.quoteSell(amount) == 0) return;
        vm.startPrank(a);
        token.approve(address(pool), amount);
        pool.sell(amount, 0);
        vm.stopPrank();
        _k();
    }

    function claim() external {
        if (pool.creatorFeeOwed() == 0) return;
        pool.claimCreatorFees();
    }

    function _k() internal {
        uint256 k = pool.quoteReserve() * pool.tokenReserve();
        require(k >= ghostK, "k decreased");
        ghostK = k;
    }
}

contract CharacterPoolInvariants is DeployHelper {
    CharacterPool pool;
    CharacterToken token;
    CharacterPoolHandler handler;
    address[] actors;
    uint256 characterId;

    function setUp() public {
        _deployProtocol();
        characterId = _createFor(alice, _gen(), 500e18);
        pool = CharacterPool(factory.poolOf(characterId));
        token = CharacterToken(factory.tokenOf(characterId));
        actors = [alice, bob, carol, dave, staker1];
        // release some vested tokens into circulation so unbacked supply is part of the test
        handler = new CharacterPoolHandler(tl, pool, actors);
        targetContract(address(handler));
    }

    function invariant_tlAccounting() public view {
        assertEq(tl.balanceOf(address(pool)), pool.realReserve() + pool.creatorFeeOwed());
    }

    function invariant_tokenAccounting() public view {
        assertEq(token.balanceOf(address(pool)), pool.tokenReserve());
    }

    function invariant_kNeverBelowStart() public view {
        assertGe(pool.quoteReserve() * pool.tokenReserve(), pool.VIRTUAL_TL() * 1_000_000_000e18);
    }

    function invariant_tokenConservation() public view {
        uint256 sum = token.balanceOf(address(pool)) + token.balanceOf(address(vesting));
        for (uint256 i = 0; i < actors.length; i++) {
            sum += token.balanceOf(actors[i]);
        }
        assertEq(sum, token.totalSupply());
    }
}
