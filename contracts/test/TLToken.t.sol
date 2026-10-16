// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {TLToken} from "../src/TLToken.sol";

contract TLTokenTest is Test {
    address launchPool = makeAddr("launchPool");
    address rewardPool = makeAddr("rewardPool");

    function test_mintsOnceToBothPools() public {
        TLToken tl = new TLToken(launchPool, rewardPool);
        assertEq(tl.totalSupply(), Config.TL_SUPPLY);
        assertEq(tl.balanceOf(launchPool), Config.TL_TO_LAUNCHPOOL);
        assertEq(tl.balanceOf(rewardPool), Config.TL_TO_REWARDPOOL_SEED);
        assertEq(tl.decimals(), 18);
    }

    function test_zeroAddressReverts() public {
        vm.expectRevert(TLToken.ZeroAddress.selector);
        new TLToken(address(0), rewardPool);
        vm.expectRevert(TLToken.ZeroAddress.selector);
        new TLToken(launchPool, address(0));
    }

    function test_holdersCanBurnOnlyTheirOwn() public {
        TLToken tl = new TLToken(launchPool, rewardPool);
        vm.prank(rewardPool);
        tl.burn(1e18);
        assertEq(tl.totalSupply(), Config.TL_SUPPLY - 1e18);
        vm.prank(launchPool);
        vm.expectRevert();
        tl.burnFrom(rewardPool, 1e18);
    }
}
