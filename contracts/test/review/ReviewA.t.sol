// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {stdError} from "forge-std/StdError.sol";
import {Config} from "../../src/Config.sol";
import {ControllerNFT} from "../../src/ControllerNFT.sol";
import {MatchManager} from "../../src/MatchManager.sol";
import {Rating} from "../../src/Rating.sol";
import {Tournament} from "../../src/Tournament.sol";
import {DeployHelper} from "../helpers/Deploy.sol";

/// @dev Adversarial review A: permissionless transitions, timestamp edges, stranded funds.
contract ReviewATest is DeployHelper {
    address[8] owners;
    uint256[8] ids;
    uint256 constant ENTRY = 1000e18;
    address attacker = makeAddr("attacker");
    address organizer = makeAddr("organizer");

    function setUp() public {
        _deployProtocolWithTournament();
        owners = [alice, bob, carol, dave, staker1, staker2, makeAddr("eve"), makeAddr("frank")];
        for (uint256 i = 0; i < 8; i++) {
            if (tl.balanceOf(owners[i]) == 0) tl.transfer(owners[i], 2_000_000e18);
            ids[i] = _createFor(owners[i], _gen(), 0);
        }
    }

    // ------------------------------------------------------------------ checked: start() on a nonexistent id

    /// @notice Hypothesis (refuted): start(k) for a not-yet-created id would mark it Running and brick
    ///         every future bracket. It reverts, but only because `_rewardBase` computes `size - 1` with
    ///         size 0 (Panic 0x11): the status/NotFull checks alone would let it through (0 == 0).
    function test_startNonexistentIdReverts() public {
        vm.prank(attacker);
        vm.expectRevert(stdError.arithmeticError);
        tournament.start(1);
        // and a bracket created afterwards is a normal Open one
        vm.prank(organizer);
        uint256 tid = tournament.create(8, ENTRY, 0);
        assertEq(uint8(tournament.getBracket(tid).status), uint8(Tournament.Status.Open));
        vm.startPrank(owners[0]);
        tl.approve(address(tournament), ENTRY);
        tournament.register(tid, ids[0]);
        vm.stopPrank();
    }
}
