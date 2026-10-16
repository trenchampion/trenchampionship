// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {Deploy} from "../script/Deploy.s.sol";

/// @dev The deploy script must wire every precomputed address correctly and execute the founder buy.
contract DeployScriptTest is Test {
    address treasury = makeAddr("treasury");
    address guardian = makeAddr("guardian");

    function test_deployAllWiresAddresses() public {
        Deploy script = new Deploy();
        vm.deal(address(script), 10 ether);
        // from a test the script contract is the creator, so its own nonce drives the predictions
        Deploy.Deployed memory d = script.deployAll(address(script), treasury, guardian, 0.2857 ether);
        assertEq(d.tl.balanceOf(address(d.rewardPool)), Config.TL_TO_REWARDPOOL_SEED);
        assertEq(d.launchPool.realReserve(), 0.2857 ether);
        assertApproxEqRel(d.tl.balanceOf(address(script)), 200_000_000e18, 2e15, "founder holds ~20%");
        assertEq(address(d.factory.nft()), address(d.nft));
        assertEq(address(d.factory.vesting()), address(d.vesting));
        assertEq(d.rewardPool.MATCH_MANAGER(), address(d.matchManager));
        assertEq(d.rewardPool.RATING(), address(d.rating));
        assertEq(address(d.vault.MATCH_MANAGER()), address(d.matchManager));
        assertEq(d.rating.MATCH_MANAGER(), address(d.matchManager));
        assertEq(d.matchManager.TOURNAMENT(), address(d.tournament));
        assertEq(address(d.nft.MATCH_MANAGER()), address(d.matchManager));
        assertEq(address(d.nft.TOURNAMENT()), address(d.tournament));
        assertEq(address(d.nft.ART()), address(d.portrait));
        assertEq(address(d.portrait.BASE()), address(d.artBase));
        assertEq(address(d.portrait.BODY()), address(d.artBody));
        assertEq(address(d.portrait.FACE()), address(d.artFace));
        assertEq(address(d.portrait.ITEMS()), address(d.artItems));
        assertEq(address(d.portrait.ARMS()), address(d.artArms));
        assertEq(d.factory.GUARDIAN(), guardian);
        assertEq(d.factory.TREASURY(), treasury);
        assertEq(d.nft.FACTORY(), address(d.factory));
        assertEq(d.vesting.FACTORY(), address(d.factory));
        assertEq(d.amm.TL(), address(d.tl));
        assertEq(address(d.amm.CHARACTER_FACTORY()), address(d.factory));
        assertEq(d.amm.REWARD_POOL(), address(d.rewardPool));
        assertEq(d.amm.TREASURY(), treasury);
    }

    function test_deployWithoutFounderBuy() public {
        Deploy script = new Deploy();
        Deploy.Deployed memory d = script.deployAll(address(script), treasury, guardian, 0);
        assertEq(d.launchPool.realReserve(), 0);
        assertEq(d.tl.balanceOf(address(d.launchPool)), Config.TL_TO_LAUNCHPOOL);
    }
}
