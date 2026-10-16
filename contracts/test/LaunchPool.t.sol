// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Config} from "../src/Config.sol";
import {TLToken} from "../src/TLToken.sol";
import {LaunchPool} from "../src/LaunchPool.sol";

contract LaunchPoolTest is Test {
    TLToken tl;
    LaunchPool pool;

    address founder = makeAddr("founder");
    address rewardPool = makeAddr("rewardPool");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant FOUNDER_ETH = 0.2857 ether; // 20 % of supply at V = 1 ETH

    function setUp() public {
        vm.deal(founder, 10 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        // TLToken needs the LaunchPool address before LaunchPool exists: precompute it.
        vm.startPrank(founder);
        address predicted = vm.computeCreateAddress(founder, vm.getNonce(founder) + 1);
        tl = new TLToken(predicted, rewardPool);
        pool = new LaunchPool{value: FOUNDER_ETH}(address(tl));
        vm.stopPrank();
        assertEq(address(pool), predicted);
    }

    // ------------------------------------------------------------------ deploy and founder

    function test_supplyDistribution() public view {
        assertEq(tl.totalSupply(), Config.TL_SUPPLY);
        assertEq(tl.balanceOf(rewardPool), Config.TL_TO_REWARDPOOL_SEED);
        assertEq(tl.balanceOf(founder) + tl.balanceOf(address(pool)), Config.TL_TO_LAUNCHPOOL);
    }

    function test_founderBuyIsAboutTwentyPercent() public view {
        uint256 got = tl.balanceOf(founder);
        assertApproxEqRel(got, 200_000_000e18, 2e15); // within 0.2 %
        assertEq(pool.realReserve(), FOUNDER_ETH);
        assertEq(address(pool).balance, FOUNDER_ETH);
        assertEq(pool.tokenReserve(), Config.TL_TO_LAUNCHPOOL - got);
        assertEq(pool.cappedInflow(), 0, "founder buy is not counted against the cap");
    }

    function test_deployWithoutFounderBuy() public {
        address deployer = makeAddr("deployer");
        vm.startPrank(deployer);
        address predicted = vm.computeCreateAddress(deployer, vm.getNonce(deployer) + 1);
        TLToken t2 = new TLToken(predicted, rewardPool);
        LaunchPool p2 = new LaunchPool(address(t2));
        vm.stopPrank();
        assertEq(p2.realReserve(), 0);
        assertEq(p2.tokenReserve(), Config.TL_TO_LAUNCHPOOL);
        assertEq(p2.spotPrice(), Config.LP_VIRTUAL_ETH * 1e18 / Config.TL_TO_LAUNCHPOOL);
    }

    function test_deployRevertsIfTokensNotMintedHere() public {
        vm.expectRevert(LaunchPool.UnexpectedBalance.selector);
        new LaunchPool(address(tl)); // a second pool has no TL
    }

    function test_noOwnerNoReceive() public {
        (bool ok,) = address(pool).call{value: 1 ether}("");
        assertFalse(ok, "plain ETH transfers must revert");
    }

    // ------------------------------------------------------------------ cap

    function test_capBlocksBuysAtDeployTime() public {
        vm.prank(alice);
        vm.expectRevert(LaunchPool.ExceedsInflowCap.selector);
        pool.buy{value: 0.1 ether}(0);
    }

    function test_capGrowsLinearly() public {
        vm.warp(vm.getBlockTimestamp() + 12 hours);
        assertEq(pool.capAllowance(), 0.5 ether);
        vm.prank(alice);
        pool.buy{value: 0.5 ether}(0);
        vm.prank(bob);
        vm.expectRevert(LaunchPool.ExceedsInflowCap.selector);
        pool.buy{value: 0.01 ether}(0);
        vm.warp(vm.getBlockTimestamp() + 12 hours);
        assertEq(pool.capAllowance(), 1 ether);
        vm.prank(bob);
        pool.buy{value: 0.5 ether}(0);
        assertEq(pool.cappedInflow(), 1 ether);
    }

    function test_perTxMaxDuringCap() public {
        vm.warp(vm.getBlockTimestamp() + 10 days);
        vm.prank(alice);
        vm.expectRevert(LaunchPool.ExceedsPerTxMax.selector);
        pool.buy{value: 0.5 ether + 1}(0);
        vm.prank(alice);
        pool.buy{value: 0.5 ether}(0);
    }

    function test_capAllowanceSaturatesAfterPeriod() public {
        vm.warp(vm.getBlockTimestamp() + Config.LP_CAP_PERIOD + 10 days);
        assertEq(pool.capAllowance(), Config.LP_CAP_RATE_PER_DAY * Config.LP_CAP_PERIOD / 1 days);
        assertFalse(pool.capActive());
    }

    function test_capLiftsAfterPeriod() public {
        vm.warp(vm.getBlockTimestamp() + Config.LP_CAP_PERIOD);
        assertFalse(pool.capActive());
        assertEq(pool.capAllowance(), 30 ether);
        vm.prank(alice);
        uint256 out = pool.buy{value: 40 ether}(0);
        assertGt(out, 0);
    }

    function test_sellReducesCappedInflow() public {
        vm.warp(vm.getBlockTimestamp() + 1 days);
        vm.startPrank(alice);
        uint256 got = pool.buy{value: 0.5 ether}(0);
        assertEq(pool.cappedInflow(), 0.5 ether);
        tl.approve(address(pool), got);
        uint256 back = pool.sell(got, 0);
        vm.stopPrank();
        assertLe(back, 0.5 ether);
        assertEq(pool.cappedInflow(), 0.5 ether - back);
    }

    function test_sellDuringCapFloorsCappedInflowAtZero() public {
        // founder's purchase was never counted, so a founder sell must not underflow the counter
        vm.warp(vm.getBlockTimestamp() + 1 days);
        vm.startPrank(founder);
        tl.approve(address(pool), 10_000_000e18);
        pool.sell(10_000_000e18, 0);
        vm.stopPrank();
        assertEq(pool.cappedInflow(), 0);
    }

    // ------------------------------------------------------------------ buy / sell

    function test_buyMatchesQuoteAndEmits() public {
        vm.warp(vm.getBlockTimestamp() + 1 days);
        uint256 quoted = pool.quoteBuy(0.5 ether);
        vm.expectEmit(true, false, false, true);
        emit LaunchPool.Buy(alice, 0.5 ether, quoted);
        vm.prank(alice);
        uint256 out = pool.buy{value: 0.5 ether}(quoted);
        assertEq(out, quoted);
        assertEq(tl.balanceOf(alice), quoted);
        assertEq(address(pool).balance, pool.realReserve());
    }

    function test_buySlippage() public {
        vm.warp(vm.getBlockTimestamp() + 1 days);
        uint256 quoted = pool.quoteBuy(0.5 ether);
        vm.prank(alice);
        vm.expectRevert(LaunchPool.SlippageExceeded.selector);
        pool.buy{value: 0.5 ether}(quoted + 1);
    }

    function test_buyZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(LaunchPool.ZeroAmount.selector);
        pool.buy{value: 0}(0);
    }

    function test_sellRoundTripNeverProfits() public {
        vm.warp(vm.getBlockTimestamp() + 3 days);
        vm.startPrank(alice);
        uint256 got = pool.buy{value: 0.5 ether}(0);
        tl.approve(address(pool), got);
        uint256 quoted = pool.quoteSell(got);
        uint256 balBefore = alice.balance;
        uint256 back = pool.sell(got, quoted);
        vm.stopPrank();
        assertEq(back, quoted);
        assertLe(back, 0.5 ether);
        assertEq(alice.balance, balBefore + back);
        assertEq(address(pool).balance, pool.realReserve());
    }

    function test_sellRequiresApproval() public {
        vm.prank(founder);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(pool), 0, 1e18)
        );
        pool.sell(1e18, 0);
    }

    function test_sellZeroAndSlippage() public {
        vm.startPrank(founder);
        vm.expectRevert(LaunchPool.ZeroAmount.selector);
        pool.sell(0, 0);
        tl.approve(address(pool), 1e18);
        vm.expectRevert(LaunchPool.SlippageExceeded.selector);
        pool.sell(1e18, type(uint256).max);
        vm.stopPrank();
    }

    /// @dev Seed TL sold into the pool is only payable while real ETH covers it.
    function test_sellBeyondRealReserveReverts() public {
        // founder sells everything back: pool returns to 0 real ETH, exactly solvent
        vm.startPrank(founder);
        uint256 all = tl.balanceOf(founder);
        tl.approve(address(pool), all);
        uint256 back = pool.sell(all, 0);
        vm.stopPrank();
        assertApproxEqAbs(back, FOUNDER_ETH, 10);
        assertApproxEqAbs(pool.realReserve(), 0, 10);
        // now the RewardPool tries to sell seed TL: nothing real left to pay with
        vm.startPrank(rewardPool);
        tl.approve(address(pool), 1_000_000e18);
        assertEq(pool.quoteSell(1_000_000e18), 0);
        vm.expectRevert(LaunchPool.InsufficientReserve.selector);
        pool.sell(1_000_000e18, 0);
        vm.stopPrank();
    }

    function test_seedCanBeSoldWhileCovered() public {
        vm.warp(vm.getBlockTimestamp() + 30 days);
        vm.prank(alice);
        pool.buy{value: 10 ether}(0);
        vm.startPrank(rewardPool);
        tl.approve(address(pool), 1_000_000e18);
        uint256 out = pool.sell(1_000_000e18, 0);
        vm.stopPrank();
        assertGt(out, 0);
        assertEq(address(pool).balance, pool.realReserve());
    }

    // ------------------------------------------------------------------ fuzz: accounting invariants

    function testFuzz_reserveAccounting(uint96[8] memory buys, uint8 sellMask) public {
        vm.warp(vm.getBlockTimestamp() + Config.LP_CAP_PERIOD);
        uint256 kBefore = pool.quoteReserve() * pool.tokenReserve();
        for (uint256 i = 0; i < 8; i++) {
            uint256 amt = bound(buys[i], 1, 50 ether);
            vm.deal(alice, amt);
            vm.prank(alice);
            pool.buy{value: amt}(0);
            if ((sellMask >> i) & 1 == 1) {
                uint256 half = tl.balanceOf(alice) / 2;
                if (pool.quoteSell(half) > 0) {
                    vm.startPrank(alice);
                    tl.approve(address(pool), half);
                    pool.sell(half, 0);
                    vm.stopPrank();
                }
            }
            assertEq(address(pool).balance, pool.realReserve(), "ETH accounting");
            assertEq(tl.balanceOf(address(pool)), pool.tokenReserve(), "TL accounting");
            uint256 kAfter = pool.quoteReserve() * pool.tokenReserve();
            assertGe(kAfter, kBefore, "k must not decrease");
            kBefore = kAfter;
        }
    }
}
