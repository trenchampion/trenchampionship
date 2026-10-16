// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {AmmPair} from "../../src/AmmPair.sol";
import {CharacterPool} from "../../src/CharacterPool.sol";
import {CharacterToken} from "../../src/CharacterToken.sol";
import {Config} from "../../src/Config.sol";
import {TLToken} from "../../src/TLToken.sol";
import {DeployHelper} from "../helpers/Deploy.sol";

/// @dev Random liquidity changes, swaps in both directions, donations on one AmmPair.
contract AmmHandler is Test {
    TLToken public tl;
    CharacterToken public token;
    AmmPair public pair;
    address[] public actors;
    /// @dev k after the last action; only removeLiquidity may lower it.
    uint256 public ghostK;
    uint256 public swaps;
    uint256 public protocolFees;

    constructor(TLToken tl_, CharacterToken token_, AmmPair pair_, address[] memory actors_) {
        tl = tl_;
        token = token_;
        pair = pair_;
        actors = actors_;
    }

    function add(uint256 actorSeed, uint256 tlAmt, uint256 tokAmt) external {
        address a = actors[actorSeed % actors.length];
        if (tl.balanceOf(a) == 0 || token.balanceOf(a) == 0) return;
        tlAmt = bound(tlAmt, 1, tl.balanceOf(a));
        tokAmt = bound(tokAmt, 1, token.balanceOf(a));
        if (pair.quoteLiquidity(tlAmt, tokAmt) == 0) return;
        vm.startPrank(a);
        tl.approve(address(pair), tlAmt);
        token.approve(address(pair), tokAmt);
        pair.addLiquidity(tlAmt, tokAmt, 0, 0, a);
        vm.stopPrank();
        _kUp();
    }

    function remove(uint256 actorSeed, uint256 fraction) external {
        address a = actors[actorSeed % actors.length];
        uint256 bal = pair.balanceOf(a);
        if (bal == 0) return;
        uint256 liq = bound(fraction, 1, bal);
        uint256 supply = pair.totalSupply();
        if (liq * pair.reserveTl() / supply == 0 || liq * pair.reserveToken() / supply == 0) return;
        vm.prank(a);
        pair.removeLiquidity(liq, 0, 0, a);
        ghostK = pair.reserveTl() * pair.reserveToken();
    }

    function swapTl(uint256 actorSeed, uint256 amount) external {
        address a = actors[actorSeed % actors.length];
        if (tl.balanceOf(a) == 0) return;
        amount = bound(amount, 1, tl.balanceOf(a));
        if (pair.quoteTlForToken(amount) == 0) return;
        vm.startPrank(a);
        tl.approve(address(pair), amount);
        pair.swapTlForToken(amount, 0, a);
        vm.stopPrank();
        swaps++;
        protocolFees += amount * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
        _kUp();
    }

    function swapToken(uint256 actorSeed, uint256 amount) external {
        address a = actors[actorSeed % actors.length];
        if (token.balanceOf(a) == 0) return;
        amount = bound(amount, 1, token.balanceOf(a));
        uint256 q = pair.quoteTokenForTl(amount);
        if (q == 0) return;
        uint256 rTl = pair.reserveTl();
        vm.startPrank(a);
        token.approve(address(pair), amount);
        pair.swapTokenForTl(amount, 0, a);
        vm.stopPrank();
        swaps++;
        protocolFees += (rTl - pair.reserveTl()) - q;
        _kUp();
    }

    function donate(uint256 actorSeed, uint256 tlAmt, uint256 tokAmt) external {
        address a = actors[actorSeed % actors.length];
        tlAmt = bound(tlAmt, 0, tl.balanceOf(a) / 10);
        tokAmt = bound(tokAmt, 0, token.balanceOf(a) / 10);
        vm.startPrank(a);
        if (tlAmt > 0) tl.transfer(address(pair), tlAmt);
        if (tokAmt > 0) token.transfer(address(pair), tokAmt);
        vm.stopPrank();
    }

    function _kUp() internal {
        uint256 k = pair.reserveTl() * pair.reserveToken();
        require(k >= ghostK, "k decreased");
        ghostK = k;
    }
}

contract AmmInvariants is DeployHelper {
    AmmPair pair;
    CharacterToken token;
    CharacterPool curve;
    AmmHandler handler;
    address[] actors;
    uint256 tlTotalAtStart;
    /// @dev Curve fees paid during setUp; the curve is not touched afterwards.
    uint256 rewardPoolAtStart;
    uint256 treasuryAtStart;

    function setUp() public {
        _deployProtocol();
        uint256 id = _createFor(alice, _gen(), 0);
        token = CharacterToken(factory.tokenOf(id));
        curve = CharacterPool(factory.poolOf(id));
        actors = [alice, bob, carol, dave, staker1];
        for (uint256 i = 0; i < actors.length; i++) {
            vm.startPrank(actors[i]);
            tl.approve(address(curve), 150_000e18);
            curve.buy(150_000e18, 0);
            vm.stopPrank();
        }
        pair = AmmPair(amm.createPair(address(token)));
        handler = new AmmHandler(tl, token, pair, actors);
        targetContract(address(handler));
        tlTotalAtStart = _tlTotal();
        rewardPoolAtStart = tl.balanceOf(address(rewardPool));
        treasuryAtStart = tl.balanceOf(treasury);
    }

    function _tlTotal() internal view returns (uint256 sum) {
        sum = tl.balanceOf(address(pair)) + tl.balanceOf(address(rewardPool)) + tl.balanceOf(treasury);
        for (uint256 i = 0; i < actors.length; i++) {
            sum += tl.balanceOf(actors[i]);
        }
    }

    /// @dev Reserves never exceed what the pair actually holds (donations only add).
    function invariant_reservesBacked() public view {
        assertGe(tl.balanceOf(address(pair)), pair.reserveTl());
        assertGe(token.balanceOf(address(pair)), pair.reserveToken());
    }

    /// @dev Every LP share is held by an actor or permanently locked; the lock survives any removal.
    function invariant_lpConservation() public view {
        uint256 sum = pair.balanceOf(address(0xdead));
        for (uint256 i = 0; i < actors.length; i++) {
            sum += pair.balanceOf(actors[i]);
        }
        assertEq(sum, pair.totalSupply());
        if (pair.totalSupply() > 0) assertGe(pair.totalSupply(), Config.AMM_MINIMUM_LIQUIDITY);
    }

    /// @dev TL only moves between the pair, the actors, RewardPool and treasury; nothing is created or lost.
    function invariant_tlConservation() public view {
        assertEq(_tlTotal(), tlTotalAtStart);
    }

    /// @dev Character tokens only move between the pair, the actors and the curve.
    function invariant_tokenConservation() public view {
        uint256 sum = token.balanceOf(address(pair)) + token.balanceOf(address(curve));
        for (uint256 i = 0; i < actors.length; i++) {
            sum += token.balanceOf(actors[i]);
        }
        assertEq(sum, token.totalSupply());
    }

    /// @dev Every wei of protocol fee reached RewardPool or treasury; the pair keeps none of it.
    function invariant_protocolFeesDelivered() public view {
        uint256 delivered =
            tl.balanceOf(address(rewardPool)) - rewardPoolAtStart + tl.balanceOf(treasury) - treasuryAtStart;
        assertEq(delivered, handler.protocolFees());
    }

    /// @dev k is non-decreasing between liquidity removals (the handler also checks after every action).
    function invariant_kTracksGhost() public view {
        assertGe(pair.reserveTl() * pair.reserveToken(), handler.ghostK());
    }
}
