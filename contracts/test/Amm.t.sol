// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AmmFactory} from "../src/AmmFactory.sol";
import {AmmPair} from "../src/AmmPair.sol";
import {CharacterPool} from "../src/CharacterPool.sol";
import {CharacterToken} from "../src/CharacterToken.sol";
import {Config} from "../src/Config.sol";
import {DeployHelper} from "./helpers/Deploy.sol";

/// @dev A token that claims a character id it does not own.
contract FakeCharacterToken is ERC20 {
    uint256 public CHARACTER_ID;

    constructor(uint256 id) ERC20("Fake", "FAKE") {
        CHARACTER_ID = id;
        _mint(msg.sender, 1e24);
    }
}

contract AmmTest is DeployHelper {
    address internal constant LOCK = address(0xdead);

    AmmPair pair;
    CharacterToken token;
    CharacterPool curve;
    uint256 id;

    function setUp() public {
        _deployProtocol();
        id = _createFor(alice, _gen(), 200_000e18);
        token = CharacterToken(factory.tokenOf(id));
        curve = CharacterPool(factory.poolOf(id));
        vm.startPrank(bob);
        tl.approve(address(curve), 100_000e18);
        curve.buy(100_000e18, 0);
        vm.stopPrank();
        pair = AmmPair(amm.createPair(address(token)));
    }

    function _add(address who, uint256 tlAmt, uint256 tokAmt) internal returns (uint256 liquidity) {
        vm.startPrank(who);
        tl.approve(address(pair), tlAmt);
        token.approve(address(pair), tokAmt);
        (,, liquidity) = pair.addLiquidity(tlAmt, tokAmt, 0, 0, who);
        vm.stopPrank();
    }

    function _k() internal view returns (uint256) {
        return pair.reserveTl() * pair.reserveToken();
    }

    // ------------------------------------------------------------------ factory

    function test_createPair_registersAndEmits() public {
        uint256 id2 = _createFor(carol, _gen(), 0);
        address tok2 = factory.tokenOf(id2);
        address predicted = vm.computeCreateAddress(address(amm), vm.getNonce(address(amm)));
        vm.expectEmit(true, true, false, true);
        emit AmmFactory.PairCreated(id2, tok2, predicted, 1);
        address p = amm.createPair(tok2);
        assertEq(p, predicted);
        assertEq(amm.pairOf(tok2), p);
        assertEq(amm.pairOfCharacter(id2), p);
        assertEq(amm.allPairs(1), p);
        assertEq(amm.allPairsLength(), 2);
        AmmPair created = AmmPair(p);
        assertEq(created.CHARACTER_ID(), id2);
        assertEq(address(created.TL()), address(tl));
        assertEq(address(created.TOKEN()), tok2);
        assertEq(created.FACTORY(), address(amm));
        assertEq(created.REWARD_POOL(), address(rewardPool));
        assertEq(created.TREASURY(), treasury);
        assertEq(created.name(), "Trenchampionship LP HERO/TRCH");
        assertEq(created.symbol(), "LP-HERO");
        assertEq(created.decimals(), 18);
        assertEq(created.totalSupply(), 0);
    }

    function test_createPair_revertsDuplicate() public {
        vm.expectRevert(AmmFactory.PairExists.selector);
        amm.createPair(address(token));
    }

    function test_createPair_revertsNonCharacterTokens() public {
        vm.expectRevert(AmmFactory.ZeroAddress.selector);
        amm.createPair(address(0));
        vm.expectRevert(AmmFactory.NotCharacterToken.selector);
        amm.createPair(address(tl));
        vm.expectRevert(AmmFactory.NotCharacterToken.selector);
        amm.createPair(alice); // no code
        vm.expectRevert(AmmFactory.NotCharacterToken.selector);
        amm.createPair(address(nft)); // no CHARACTER_ID()
        FakeCharacterToken fake = new FakeCharacterToken(id);
        vm.expectRevert(AmmFactory.NotCharacterToken.selector);
        amm.createPair(address(fake)); // claims alice's id, but the factory registered another token
        FakeCharacterToken fake2 = new FakeCharacterToken(999);
        vm.expectRevert(AmmFactory.NotCharacterToken.selector);
        amm.createPair(address(fake2)); // unknown id
        vm.expectRevert(AmmFactory.NotCharacterToken.selector);
        amm.createPair(address(pair)); // an LP token is not a character token
    }

    function test_factoryConstructorRejectsZeroAddress() public {
        vm.expectRevert(AmmFactory.ZeroAddress.selector);
        new AmmFactory(address(0), address(factory), address(rewardPool), treasury);
    }

    // one reverting creation per test: forge coverage records only the first reverted CREATE of a call
    function test_pairConstructorRejectsZeroAddress() public {
        vm.expectRevert(AmmPair.ZeroAddress.selector);
        new AmmPair(1, address(tl), address(0), address(rewardPool), treasury, "X");
    }

    // ------------------------------------------------------------------ liquidity

    function test_firstDeposit_locksMinimumLiquidity() public {
        uint256 expected = Math.sqrt(1000e18 * 10_000e18) - Config.AMM_MINIMUM_LIQUIDITY;
        assertEq(pair.quoteLiquidity(1000e18, 10_000e18), expected);
        vm.startPrank(alice);
        tl.approve(address(pair), 1000e18);
        token.approve(address(pair), 10_000e18);
        vm.expectEmit(true, true, false, true);
        emit AmmPair.LiquidityAdded(alice, alice, 1000e18, 10_000e18, expected);
        vm.expectEmit(false, false, false, true);
        emit AmmPair.ReservesUpdated(1000e18, 10_000e18);
        (uint256 tlUsed, uint256 tokUsed, uint256 liq) =
            pair.addLiquidity(1000e18, 10_000e18, 1000e18, 10_000e18, alice);
        vm.stopPrank();
        assertEq(tlUsed, 1000e18);
        assertEq(tokUsed, 10_000e18);
        assertEq(liq, expected);
        assertEq(pair.balanceOf(alice), expected);
        assertEq(pair.balanceOf(LOCK), Config.AMM_MINIMUM_LIQUIDITY);
        assertEq(pair.totalSupply(), expected + Config.AMM_MINIMUM_LIQUIDITY);
        (uint256 rTl, uint256 rTok) = pair.getReserves();
        assertEq(rTl, 1000e18);
        assertEq(rTok, 10_000e18);
        assertEq(tl.balanceOf(address(pair)), 1000e18);
        assertEq(token.balanceOf(address(pair)), 10_000e18);
        assertEq(pair.spotPrice(), 0.1e18);
    }

    function test_firstDeposit_tooSmallReverts() public {
        assertEq(pair.quoteLiquidity(1, 1), 0);
        vm.startPrank(alice);
        tl.approve(address(pair), 1);
        token.approve(address(pair), 1);
        vm.expectRevert(AmmPair.InsufficientLiquidity.selector);
        pair.addLiquidity(1, 1, 0, 0, alice);
        vm.stopPrank();
    }

    function test_addLiquidity_secondDepositFollowsRatio() public {
        uint256 first = _add(alice, 1000e18, 10_000e18);
        uint256 supply = pair.totalSupply();
        // token-rich request: TL is the binding side
        assertEq(pair.quoteLiquidity(500e18, 5000e18), supply * 500e18 / 1000e18);
        uint256 bobTl = tl.balanceOf(bob);
        uint256 bobTok = token.balanceOf(bob);
        vm.startPrank(bob);
        tl.approve(address(pair), 500e18);
        token.approve(address(pair), 20_000e18);
        (uint256 tlUsed, uint256 tokUsed, uint256 liq) = pair.addLiquidity(500e18, 20_000e18, 500e18, 5000e18, bob);
        vm.stopPrank();
        assertEq(tlUsed, 500e18);
        assertEq(tokUsed, 5000e18);
        assertEq(liq, supply * 500e18 / 1000e18);
        assertEq(tl.balanceOf(bob), bobTl - 500e18, "only the used TL is pulled");
        assertEq(token.balanceOf(bob), bobTok - 5000e18, "only the used tokens are pulled");
        assertEq(pair.balanceOf(bob), liq);
        assertEq(pair.balanceOf(alice), first);
        // TL-rich request: tokens are the binding side
        vm.startPrank(bob);
        tl.approve(address(pair), 1000e18);
        token.approve(address(pair), 1500e18);
        (tlUsed, tokUsed,) = pair.addLiquidity(1000e18, 1500e18, 0, 0, bob);
        vm.stopPrank();
        assertEq(tlUsed, 150e18);
        assertEq(tokUsed, 1500e18);
        (uint256 rTl, uint256 rTok) = pair.getReserves();
        assertEq(rTl, 1650e18);
        assertEq(rTok, 16_500e18);
    }

    function test_addLiquidity_reverts() public {
        vm.startPrank(alice);
        tl.approve(address(pair), type(uint256).max);
        token.approve(address(pair), type(uint256).max);
        vm.expectRevert(AmmPair.ZeroAddress.selector);
        pair.addLiquidity(1e18, 1e18, 0, 0, address(0));
        vm.expectRevert(AmmPair.ZeroAmount.selector);
        pair.addLiquidity(0, 1e18, 0, 0, alice);
        vm.expectRevert(AmmPair.ZeroAmount.selector);
        pair.addLiquidity(1e18, 0, 0, 0, alice);
        pair.addLiquidity(1000e18, 10_000e18, 0, 0, alice);
        // ratio forces fewer tokens than the minimum
        vm.expectRevert(AmmPair.SlippageExceeded.selector);
        pair.addLiquidity(100e18, 5000e18, 0, 2000e18, alice);
        // ratio forces less TL than the minimum
        vm.expectRevert(AmmPair.SlippageExceeded.selector);
        pair.addLiquidity(1000e18, 100e18, 500e18, 0, alice);
        // dust that mints no share
        vm.expectRevert(AmmPair.InsufficientLiquidity.selector);
        pair.addLiquidity(1, 1, 0, 0, alice);
        vm.stopPrank();
    }

    function test_removeLiquidity_proRata() public {
        uint256 liq = _add(alice, 1000e18, 10_000e18);
        uint256 supply = pair.totalSupply();
        uint256 half = liq / 2;
        uint256 expTl = half * 1000e18 / supply;
        uint256 expTok = half * 10_000e18 / supply;
        uint256 carolTl = tl.balanceOf(carol);
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit AmmPair.LiquidityRemoved(alice, carol, expTl, expTok, half);
        (uint256 tlOut, uint256 tokOut) = pair.removeLiquidity(half, expTl, expTok, carol);
        assertEq(tlOut, expTl);
        assertEq(tokOut, expTok);
        assertEq(tl.balanceOf(carol), carolTl + expTl);
        assertEq(pair.balanceOf(alice), liq - half);
        assertEq(pair.totalSupply(), supply - half);
        assertEq(pair.reserveTl(), 1000e18 - expTl);
        assertEq(pair.reserveToken(), 10_000e18 - expTok);
        assertEq(tl.balanceOf(address(pair)), pair.reserveTl());
        assertEq(token.balanceOf(address(pair)), pair.reserveToken());
        // the lock can never be redeemed: everything else can
        vm.prank(alice);
        pair.removeLiquidity(liq - half, 0, 0, alice);
        assertEq(pair.totalSupply(), Config.AMM_MINIMUM_LIQUIDITY);
        assertGt(pair.reserveTl(), 0, "the locked shares keep a sliver of both reserves");
        assertGt(pair.reserveToken(), 0);
    }

    function test_removeLiquidity_reverts() public {
        uint256 liq = _add(alice, 1000e18, 10_000e18);
        vm.startPrank(alice);
        vm.expectRevert(AmmPair.ZeroAddress.selector);
        pair.removeLiquidity(1, 0, 0, address(0));
        vm.expectRevert(AmmPair.ZeroAmount.selector);
        pair.removeLiquidity(0, 0, 0, alice);
        vm.expectRevert(AmmPair.InsufficientLiquidity.selector);
        pair.removeLiquidity(1, 0, 0, alice); // one share is worth less than a wei of TL
        vm.expectRevert(AmmPair.SlippageExceeded.selector);
        pair.removeLiquidity(liq, 1000e18 + 1, 0, alice);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, liq, liq + 1));
        pair.removeLiquidity(liq + 1, 0, 0, alice);
        vm.stopPrank();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, bob, 0, liq));
        pair.removeLiquidity(liq, 0, 0, bob);
    }

    // ------------------------------------------------------------------ swaps

    function test_swapTlForToken_feesAndInvariant() public {
        _add(alice, 1000e18, 10_000e18);
        uint256 tlIn = 100e18;
        uint256 protocolFee = tlIn * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
        uint256 net = tlIn - protocolFee;
        uint256 inFee = net * (Config.BPS - Config.AMM_LP_FEE_BPS);
        uint256 expOut = 10_000e18 * inFee / (1000e18 * Config.BPS + inFee);
        assertEq(pair.quoteTlForToken(tlIn), expOut);
        uint256 kBefore = _k();
        uint256 treasuryBefore = tl.balanceOf(treasury);
        uint256 rpBefore = tl.balanceOf(address(rewardPool));
        uint256 daveTok = token.balanceOf(dave);
        vm.startPrank(bob);
        tl.approve(address(pair), tlIn);
        vm.expectEmit(true, true, false, true);
        emit AmmPair.Swap(bob, dave, true, tlIn, expOut, protocolFee);
        uint256 out = pair.swapTlForToken(tlIn, expOut, dave);
        vm.stopPrank();
        assertEq(out, expOut);
        assertEq(token.balanceOf(dave), daveTok + expOut);
        assertEq(pair.reserveTl(), 1000e18 + net, "net TL enters the reserve");
        assertEq(pair.reserveToken(), 10_000e18 - expOut);
        assertGe(_k(), kBefore, "k never decreases");
        uint256 toTreasury = protocolFee * Config.TREASURY_AMM_BPS / Config.BPS;
        assertEq(tl.balanceOf(treasury), treasuryBefore + toTreasury);
        assertEq(tl.balanceOf(address(rewardPool)), rpBefore + protocolFee - toTreasury);
        assertEq(tl.balanceOf(address(pair)), pair.reserveTl(), "no TL is stranded in the pair");
        assertEq(token.balanceOf(address(pair)), pair.reserveToken());
    }

    function test_swapTokenForTl_feesAndInvariant() public {
        _add(alice, 1000e18, 10_000e18);
        uint256 tokIn = 1000e18;
        uint256 inFee = tokIn * (Config.BPS - Config.AMM_LP_FEE_BPS);
        uint256 gross = 1000e18 * inFee / (10_000e18 * Config.BPS + inFee);
        uint256 protocolFee = gross * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
        uint256 expOut = gross - protocolFee;
        assertEq(pair.quoteTokenForTl(tokIn), expOut);
        uint256 kBefore = _k();
        uint256 treasuryBefore = tl.balanceOf(treasury);
        uint256 rpBefore = tl.balanceOf(address(rewardPool));
        uint256 bobTl = tl.balanceOf(bob);
        vm.startPrank(bob);
        token.approve(address(pair), tokIn);
        vm.expectEmit(true, true, false, true);
        emit AmmPair.Swap(bob, bob, false, tokIn, expOut, protocolFee);
        uint256 out = pair.swapTokenForTl(tokIn, expOut, bob);
        vm.stopPrank();
        assertEq(out, expOut);
        assertEq(tl.balanceOf(bob), bobTl + expOut);
        assertEq(pair.reserveTl(), 1000e18 - gross, "the gross amount leaves the reserve");
        assertEq(pair.reserveToken(), 10_000e18 + tokIn);
        assertGe(_k(), kBefore, "k never decreases");
        uint256 toTreasury = protocolFee * Config.TREASURY_AMM_BPS / Config.BPS;
        assertEq(tl.balanceOf(treasury), treasuryBefore + toTreasury);
        assertEq(tl.balanceOf(address(rewardPool)), rpBefore + protocolFee - toTreasury);
        assertEq(tl.balanceOf(address(pair)), pair.reserveTl());
        assertEq(token.balanceOf(address(pair)), pair.reserveToken());
    }

    function test_swap_reverts() public {
        vm.startPrank(bob);
        tl.approve(address(pair), type(uint256).max);
        token.approve(address(pair), type(uint256).max);
        vm.expectRevert(AmmPair.ZeroAddress.selector);
        pair.swapTlForToken(1e18, 0, address(0));
        vm.expectRevert(AmmPair.ZeroAddress.selector);
        pair.swapTokenForTl(1e18, 0, address(0));
        vm.expectRevert(AmmPair.ZeroAmount.selector);
        pair.swapTlForToken(0, 0, bob);
        vm.expectRevert(AmmPair.ZeroAmount.selector);
        pair.swapTokenForTl(0, 0, bob);
        vm.expectRevert(AmmPair.InsufficientLiquidity.selector);
        pair.swapTlForToken(1e18, 0, bob); // empty pair
        vm.expectRevert(AmmPair.InsufficientLiquidity.selector);
        pair.swapTokenForTl(1e18, 0, bob);
        vm.stopPrank();
        assertEq(pair.quoteTlForToken(1e18), 0, "quotes are 0 while empty");
        assertEq(pair.quoteTokenForTl(1e18), 0);
        _add(alice, 1000e18, 10_000e18);
        vm.startPrank(bob);
        vm.expectRevert(AmmPair.SlippageExceeded.selector);
        pair.swapTlForToken(1e18, type(uint256).max, bob);
        vm.expectRevert(AmmPair.SlippageExceeded.selector);
        pair.swapTokenForTl(1e18, type(uint256).max, bob);
        vm.expectRevert(AmmPair.SlippageExceeded.selector);
        pair.swapTokenForTl(1, 0, bob); // one wei of a 0.1 TL token rounds to nothing
        vm.stopPrank();
    }

    function test_donationsAreIgnoredByTheAccounting() public {
        uint256 liq = _add(alice, 1000e18, 10_000e18);
        vm.prank(bob);
        tl.transfer(address(pair), 50e18);
        vm.prank(bob);
        token.transfer(address(pair), 500e18);
        assertEq(pair.reserveTl(), 1000e18, "reserves are storage, never balances");
        assertEq(pair.reserveToken(), 10_000e18);
        assertEq(pair.spotPrice(), 0.1e18);
        // trading and removal use the reserves; the donation stays in the pair, unreachable by design
        uint256 supply = pair.totalSupply();
        vm.prank(alice);
        (uint256 tlOut, uint256 tokOut) = pair.removeLiquidity(liq, 0, 0, alice);
        assertEq(tlOut, liq * 1000e18 / supply);
        assertEq(tokOut, liq * 10_000e18 / supply);
        assertGe(tl.balanceOf(address(pair)), pair.reserveTl() + 50e18);
        assertGe(token.balanceOf(address(pair)), pair.reserveToken() + 500e18);
    }

    function test_views_whenEmpty() public view {
        assertEq(pair.spotPrice(), 0);
        (uint256 a, uint256 b) = pair.getReserves();
        assertEq(a + b, 0);
        assertEq(pair.quoteLiquidity(0, 0), 0);
    }

    // ------------------------------------------------------------------ fuzz

    function testFuzz_kNeverDecreasesAcrossSwaps(uint256 tlIn, uint256 tokIn, uint256 seedTl, uint256 seedTok) public {
        seedTl = bound(seedTl, 1e6, 1_000_000e18);
        seedTok = bound(seedTok, 1e6, token.balanceOf(alice) / 2);
        _add(alice, seedTl, seedTok);
        tlIn = bound(tlIn, 1, tl.balanceOf(bob));
        tokIn = bound(tokIn, 1, token.balanceOf(bob));
        uint256 k0 = _k();
        vm.startPrank(bob);
        tl.approve(address(pair), tlIn);
        if (pair.quoteTlForToken(tlIn) > 0) pair.swapTlForToken(tlIn, 0, bob);
        uint256 k1 = _k();
        assertGe(k1, k0, "TL -> token");
        token.approve(address(pair), tokIn);
        if (pair.quoteTokenForTl(tokIn) > 0) pair.swapTokenForTl(tokIn, 0, bob);
        vm.stopPrank();
        assertGe(_k(), k1, "token -> TL");
        assertGe(tl.balanceOf(address(pair)), pair.reserveTl());
        assertGe(token.balanceOf(address(pair)), pair.reserveToken());
    }

    function testFuzz_swapMatchesQuote(uint256 amountIn, bool tlSide) public {
        _add(alice, 5000e18, 50_000e18);
        vm.startPrank(bob);
        if (tlSide) {
            amountIn = bound(amountIn, 1, tl.balanceOf(bob));
            uint256 q = pair.quoteTlForToken(amountIn);
            tl.approve(address(pair), amountIn);
            if (q == 0) {
                vm.expectRevert(AmmPair.SlippageExceeded.selector);
                pair.swapTlForToken(amountIn, 0, bob);
            } else {
                assertEq(pair.swapTlForToken(amountIn, q, bob), q);
            }
        } else {
            amountIn = bound(amountIn, 1, token.balanceOf(bob));
            uint256 q = pair.quoteTokenForTl(amountIn);
            token.approve(address(pair), amountIn);
            if (q == 0) {
                vm.expectRevert(AmmPair.SlippageExceeded.selector);
                pair.swapTokenForTl(amountIn, 0, bob);
            } else {
                assertEq(pair.swapTokenForTl(amountIn, q, bob), q);
            }
        }
        vm.stopPrank();
    }

    function testFuzz_addThenRemoveNeverProfits(uint256 tlA, uint256 tokA, uint256 tlB, uint256 tokB) public {
        tlA = bound(tlA, 1e9, 500_000e18);
        tokA = bound(tokA, 1e9, token.balanceOf(alice) / 2);
        _add(alice, tlA, tokA);
        tlB = bound(tlB, 1, tl.balanceOf(bob));
        tokB = bound(tokB, 1, token.balanceOf(bob));
        uint256 tlBefore = tl.balanceOf(bob);
        uint256 tokBefore = token.balanceOf(bob);
        if (pair.quoteLiquidity(tlB, tokB) == 0) return;
        vm.startPrank(bob);
        tl.approve(address(pair), tlB);
        token.approve(address(pair), tokB);
        (uint256 tlUsed, uint256 tokUsed, uint256 liq) = pair.addLiquidity(tlB, tokB, 0, 0, bob);
        uint256 supply = pair.totalSupply();
        if (liq * pair.reserveTl() / supply == 0 || liq * pair.reserveToken() / supply == 0) {
            // a dust position that would redeem nothing on one side cannot be burned alone (Uniswap v2 rule)
            vm.expectRevert(AmmPair.InsufficientLiquidity.selector);
            pair.removeLiquidity(liq, 0, 0, bob);
            vm.stopPrank();
            return;
        }
        (uint256 tlOut, uint256 tokOut) = pair.removeLiquidity(liq, 0, 0, bob);
        vm.stopPrank();
        assertLe(tlOut, tlUsed, "rounding favours the pool");
        assertLe(tokOut, tokUsed);
        assertLe(tl.balanceOf(bob), tlBefore);
        assertLe(token.balanceOf(bob), tokBefore);
        assertEq(tl.balanceOf(address(pair)), pair.reserveTl());
        assertEq(token.balanceOf(address(pair)), pair.reserveToken());
    }

    function testFuzz_protocolFeeSplitsExactly(uint256 tlIn) public {
        _add(alice, 1000e18, 10_000e18);
        tlIn = bound(tlIn, 1e15, tl.balanceOf(bob));
        uint256 fee = tlIn * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
        uint256 t0 = tl.balanceOf(treasury);
        uint256 r0 = tl.balanceOf(address(rewardPool));
        vm.startPrank(bob);
        tl.approve(address(pair), tlIn);
        pair.swapTlForToken(tlIn, 0, bob);
        vm.stopPrank();
        assertEq(tl.balanceOf(treasury) - t0 + tl.balanceOf(address(rewardPool)) - r0, fee, "fee fully distributed");
        assertEq(tl.balanceOf(treasury) - t0, fee * Config.TREASURY_AMM_BPS / Config.BPS);
    }
}
