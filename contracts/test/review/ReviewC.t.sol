// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BattleEngine} from "../../src/BattleEngine.sol";
import {BondingCurve} from "../../src/BondingCurve.sol";
import {CharacterArt} from "../../src/CharacterArt.sol";
import {CharacterFactory} from "../../src/CharacterFactory.sol";
import {CharacterPool} from "../../src/CharacterPool.sol";
import {CharacterPortrait} from "../../src/CharacterPortrait.sol";
import {Config} from "../../src/Config.sol";
import {ControllerNFT} from "../../src/ControllerNFT.sol";
import {GuardianPausable} from "../../src/GuardianPausable.sol";
import {LaunchPool} from "../../src/LaunchPool.sol";
import {MatchManager} from "../../src/MatchManager.sol";
import {Rating} from "../../src/Rating.sol";
import {StakingVault} from "../../src/StakingVault.sol";
import {TLToken} from "../../src/TLToken.sol";
import {Tournament} from "../../src/Tournament.sol";
import {DeployHelper} from "../helpers/Deploy.sol";
import {deployPortrait} from "../helpers/ArtDeploy.sol";

/// @dev Review C PoCs: deployment correctness, access control, reentrancy, token edge cases, pause.

// ---------------------------------------------------------------- helpers

/// @dev Sends ETH into a target by selfdestruct (same-tx creation, so Cancun still transfers the value).
contract EthForcer {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}

/// @dev External wrapper so the full tokenURI path (5 static calls + base64) is measured as one call.
contract UriProbe {
    CharacterPortrait immutable P;

    constructor(CharacterPortrait p) {
        P = p;
    }

    function uri(uint256 id, BattleEngine.Traits calldata t, string calldata name)
        external
        view
        returns (string memory)
    {
        return CharacterArt.tokenURI(id, t, name, P.svg(id, t), P.attributes(id, t));
    }
}

/// @dev A contract creator whose onERC721Received callback tries to act during createCharacter.
contract CallbackCreator is IERC721Receiver {
    CharacterFactory immutable F;
    ControllerNFT immutable N;
    MatchManager immutable M;
    TLToken immutable T;
    uint8 public mode; // 0 nothing, 1 re-enter createCharacter, 2 retire, 3 challenge open
    bool public reentryBlocked;
    bool public innerDone;

    constructor(CharacterFactory f, ControllerNFT n, MatchManager m, TLToken t) {
        F = f;
        N = n;
        M = m;
        T = t;
    }

    function create(uint8 mode_, BattleEngine.Traits memory tr, CharacterFactory.Tokenomics memory tk)
        external
        returns (uint256)
    {
        mode = mode_;
        T.approve(address(F), type(uint256).max);
        return F.createCharacter(tr, "ipfs://cb", tk, 0, 0);
    }

    function onERC721Received(address, address, uint256 id, bytes calldata) external override returns (bytes4) {
        if (mode == 1) {
            BattleEngine.Traits memory tr = BattleEngine.Traits(11, 11, 12, 11, 0, 1, 3);
            CharacterFactory.Tokenomics memory tk =
                CharacterFactory.Tokenomics("X", "X", 1_000_000e18, 1000e18, 0, 0, 0);
            try F.createCharacter(tr, "ipfs://inner", tk, 0, 0) {
                innerDone = true;
            } catch (bytes memory err) {
                reentryBlocked = bytes4(err) == ReentrancyGuard.ReentrancyGuardReentrantCall.selector;
            }
        } else if (mode == 2) {
            N.retire(id);
            innerDone = true;
        } else if (mode == 3) {
            M.challenge(id, 0, 0, 0);
            innerDone = true;
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}

// ---------------------------------------------------------------- tests

contract ReviewCTest is DeployHelper {
    using stdJson for string;

    uint256[] ids;
    bytes32 constant SALT_A = keccak256("salt-a");
    bytes32 constant SALT_B = keccak256("salt-b");

    receive() external payable {}

    function setUp() public {
        _deployProtocolWithTournament();
        address[4] memory owners = [alice, bob, carol, dave];
        for (uint256 i = 0; i < 8; i++) {
            ids.push(_createFor(owners[i / 2], _gen(), 0));
        }
    }

    function _record(uint256 a, uint256 b, int8 outcome) internal {
        vm.prank(address(mm));
        rating.recordResult(a, b, outcome);
    }

    function _license(uint256 id) internal {
        address o = nft.ownerOf(id);
        vm.startPrank(o);
        tl.approve(address(rating), Config.SEASON_LICENSE);
        rating.license(id);
        vm.stopPrank();
    }

    function _qualify(uint256 id) internal {
        uint256 done;
        for (uint256 i = 0; i < 8 && done < 6; i++) {
            if (ids[i] == id) continue;
            if (nft.ownerOf(ids[i]) == nft.ownerOf(id)) continue;
            _record(id, ids[i], 1);
            _record(id, ids[i], 1);
            done++;
        }
        require(done == 6, "need 6 opponents");
    }

    // ------------------------------------------------------------ H1: season prize stranded at address(0)

    // ------------------------------------------------------------ H2: ERC721 callback during createCharacter

    function test_H2_callbackCannotReenterCreate() public {
        CallbackCreator c = new CallbackCreator(factory, nft, mm, tl);
        tl.transfer(address(c), 20_000e18);
        c.create(1, _gen(), _tokenomics());
        assertTrue(c.reentryBlocked(), "nonReentrant blocks the inner createCharacter");
        assertFalse(c.innerDone());
        assertEq(factory.characterCount(), 9);
    }

    function test_H2_callbackCanRetireBeforeCreatedEvent() public {
        CallbackCreator c = new CallbackCreator(factory, nft, mm, tl);
        tl.transfer(address(c), 20_000e18);
        vm.recordLogs();
        uint256 id = c.create(2, _gen(), _tokenomics());
        assertTrue(c.innerDone());
        assertEq(nft.controllerOf(id), address(0), "retired inside its own creation");
        assertTrue(nft.retired(id));
        // log order: Retired (ControllerNFT) precedes CharacterCreated (factory)
        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint256 iRetired = type(uint256).max;
        uint256 iCreated = type(uint256).max;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == keccak256("Retired(uint256,address)")) iRetired = i;
            if (
                logs[i].topics[0]
                    == keccak256(
                        "CharacterCreated(uint256,address,address,address,string,(uint8,uint8,uint8,uint8,uint8,uint8,uint8),(string,string,uint256,uint256,uint16,uint32,uint16))"
                    )
            ) iCreated = i;
        }
        assertTrue(iRetired != type(uint256).max && iCreated != type(uint256).max, "both events found");
        assertLt(iRetired, iCreated, "Retired is logged before CharacterCreated");
    }

    function test_H2_callbackCanChallengeBeforeCreatedEvent() public {
        CallbackCreator c = new CallbackCreator(factory, nft, mm, tl);
        tl.transfer(address(c), 20_000e18);
        uint256 id = c.create(3, _gen(), _tokenomics());
        assertTrue(c.innerDone());
        assertTrue(mm.isBusy(id), "open challenge created inside the creation tx");
    }

    // ------------------------------------------------------------ H3/H5: founder buy numbers and forced ETH

    function test_H5_founderBuyNumbers() public {
        uint256 n = vm.getNonce(address(this));
        address predLp = vm.computeCreateAddress(address(this), n + 1);
        TLToken t = new TLToken(predLp, address(this));
        uint256 before = t.balanceOf(address(this));
        LaunchPool lp = new LaunchPool{value: 285_714_285_714_285_714}(address(t));
        assertEq(address(lp), predLp);
        uint256 got = t.balanceOf(address(this)) - before;
        console2.log("founder buy 2/7 ETH -> TRCH out (wei)", got);
        console2.log("founder share of supply, bps", got * 10_000 / Config.TL_SUPPLY);
        console2.log("spot after (wei ETH per TRCH, 1e18)", lp.spotPrice());
        console2.log("spot before (wei ETH per TRCH, 1e18)", BondingCurve.spotPrice(1 ether, 900_000_000e18));
        assertApproxEqAbs(got, 200_000_000e18, 1e12, "exactly 20 % up to rounding");
        // the script default 0.2857 ether (not 2/7) gives slightly less than 20 %
        uint256 out2 = BondingCurve.tokensOut(1 ether, 900_000_000e18, 0.2857 ether);
        console2.log("script default 0.2857 ETH -> TRCH out", out2);
        assertLt(out2, 200_000_000e18);
        // the founder can always sell everything back into the real reserve
        t.approve(address(lp), got);
        uint256 ethOut = lp.sell(got, 0);
        assertLe(ethOut, 285_714_285_714_285_714);
        assertGe(ethOut, 285_714_285_714_285_714 - 10);
    }

    function test_H6_forcedEthDoesNotBreakLaunchPool() public {
        uint256 n = vm.getNonce(address(this));
        address predLp = vm.computeCreateAddress(address(this), n + 1);
        TLToken t = new TLToken(predLp, address(this));
        LaunchPool lp = new LaunchPool{value: 285_714_285_714_285_714}(address(t));
        new EthForcer{value: 5 ether}(payable(address(lp)));
        assertEq(address(lp).balance, 5 ether + 285_714_285_714_285_714);
        assertEq(lp.realReserve(), 285_714_285_714_285_714, "accounting ignores forced ETH");
        vm.warp(block.timestamp + 1 days);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 out = lp.buy{value: 0.5 ether}(0);
        assertEq(lp.cappedInflow(), 0.5 ether, "cap unaffected");
        vm.startPrank(alice);
        t.approve(address(lp), out);
        uint256 ethBack = lp.sell(out, 0);
        vm.stopPrank();
        assertLe(ethBack, 0.5 ether);
        // the forced 5 ETH are unreachable: selling all founder TRCH is bounded by realReserve
        assertEq(lp.quoteSell(t.balanceOf(address(this)) * 2), 0);
    }

    // ------------------------------------------------------------ H7: tokenURI gas

    function test_H7_tokenUriGasAcrossVectorsAndExtremes() public {
        CharacterPortrait p = portrait;
        UriProbe probe = new UriProbe(p);
        string memory doc = vm.readFile("../engine/vectors/art-vectors.json");
        uint256 count = doc.readUint(".count");
        uint256 maxGas;
        uint256 maxLen;
        string memory name64 = "0123456789012345678901234567890123456789012345678901234567890123";
        for (uint256 i = 0; i < count; i++) {
            string memory k = string.concat(".cases[", vm.toString(i), "]");
            uint256[] memory v = doc.readUintArray(string.concat(k, ".traits"));
            BattleEngine.Traits memory t = BattleEngine.Traits(
                uint8(v[0]), uint8(v[1]), uint8(v[2]), uint8(v[3]), uint8(v[4]), uint8(v[5]), uint8(v[6])
            );
            uint256 id = vm.parseUint(doc.readString(string.concat(k, ".id")));
            uint256 g = gasleft();
            string memory u = probe.uri(id, t, name64);
            g = g - gasleft();
            if (g > maxGas) maxGas = g;
            if (bytes(u).length > maxLen) maxLen = bytes(u).length;
        }
        console2.log("vectors: max tokenURI gas", maxGas);
        console2.log("vectors: max tokenURI bytes", maxLen);
        // an id with both rare features (gold eyes + aura), every element/special/weakness, top tiers
        uint256 rareId;
        for (uint256 id = 1; id < 100_000; id++) {
            bytes32 h = keccak256(abi.encodePacked(id));
            if (uint8(h[12]) % 16 == 0 && uint8(h[13]) % 16 == 0 && uint8(h[9]) % 6 == 5 && uint8(h[3]) % 6 == 5) {
                rareId = id;
                break;
            }
        }
        require(rareId != 0, "rare id");
        uint256 maxGas2;
        for (uint8 e = 0; e < 5; e++) {
            for (uint8 s = 1; s <= 8; s++) {
                for (uint8 w = 0; w < 5; w++) {
                    BattleEngine.Traits memory t = BattleEngine.Traits(15, 15, 14, 1, e, s, w);
                    uint256 g = gasleft();
                    probe.uri(rareId, t, name64);
                    g = g - gasleft();
                    if (g > maxGas2) maxGas2 = g;
                }
            }
        }
        console2.log("rare id + top tiers: max tokenURI gas", maxGas2);
        // realistic end-to-end: ControllerNFT.tokenURI of a live character
        uint256 g3 = gasleft();
        nft.tokenURI(ids[0]);
        g3 = g3 - gasleft();
        console2.log("ControllerNFT.tokenURI(live) gas", g3);
        assertLt(maxGas, 30_000_000, "below common eth_call gas caps");
        assertLt(maxGas2, 30_000_000, "below common eth_call gas caps");
    }

    // ------------------------------------------------------------ pause matrix

    function _challenge(address who, uint256 idA, uint256 idB, uint256 stake) internal returns (uint256 id) {
        vm.startPrank(who);
        tl.approve(address(mm), stake);
        id = mm.challenge(idA, idB, stake, 0);
        vm.stopPrank();
    }

    function test_P1_everythingButCreateChallengeAcceptStakeWorksWhilePaused() public {
        uint256 cA = ids[0]; // alice
        uint256 cB = ids[2]; // bob
        uint256 stake = 1000e18;
        uint256 matchId = _challenge(alice, cA, cB, stake);
        vm.startPrank(bob);
        tl.approve(address(mm), stake);
        mm.accept(matchId, cB);
        vm.stopPrank();
        // staker1 buys and stakes A tokens before the pause
        CharacterPool poolA = CharacterPool(factory.poolOf(cA));
        vm.startPrank(staker1);
        tl.approve(address(poolA), 5000e18);
        uint256 got = poolA.buy(5000e18, 0);
        poolA.token().approve(address(vault), got);
        vault.stake(matchId, 0, got / 2);
        vm.stopPrank();
        _license(cA);

        vm.startPrank(guardian);
        factory.pause();
        mm.pause();
        vault.pause();
        vm.stopPrank();

        // blocked: create, challenge, accept, stake
        vm.startPrank(staker1);
        poolA.token().approve(address(vault), got);
        vm.expectRevert(GuardianPausable.Paused.selector);
        vault.stake(matchId, 0, 1);
        vm.stopPrank();
        vm.startPrank(carol);
        tl.approve(address(mm), stake);
        vm.expectRevert(GuardianPausable.Paused.selector);
        mm.challenge(ids[4], ids[6], stake, 0);
        vm.stopPrank();

        // not blocked: commit, reveal, claim, withdraw, unlicense, curve sell, tournament, vesting-free paths
        BattleEngine.Tactics memory ta = _tactics(2, 2, 2, 4, 4, 3);
        BattleEngine.Tactics memory tb = _tactics(0, 0, 0, 4, 4, 3);
        bytes32 ha = mm.commitHash(matchId, alice, ta.stances, ta.energies, SALT_A);
        bytes32 hb = mm.commitHash(matchId, bob, tb.stances, tb.energies, SALT_B);
        vm.prank(alice);
        mm.commit(matchId, ha, "");
        vm.prank(bob);
        mm.commit(matchId, hb, "");
        vm.warp(mm.stakingCloseAt(matchId));
        vm.prank(alice);
        mm.reveal(matchId, ta, SALT_A);
        vm.prank(bob);
        mm.reveal(matchId, tb, SALT_B);
        assertEq(uint8(mm.getMatch(matchId).outcome), uint8(MatchManager.Outcome.WinA));
        vm.prank(alice);
        mm.claim();
        vm.prank(staker1);
        vault.withdraw(matchId);
        vm.prank(alice);
        rating.unlicense(cA);
        vm.startPrank(staker1);
        poolA.token().approve(address(poolA), got / 2);
        poolA.sell(got / 2, 0);
        vm.stopPrank();
        // tournaments are never pausable: registering and starting creates tournament matches while paused
        uint256 tId = tournament.create(8, 100e18, 0);
        address[8] memory owners = [alice, alice, bob, bob, carol, carol, dave, dave];
        // one character per controller per bracket: use 8 distinct controllers
        for (uint256 i = 0; i < 8; i++) {
            address o = makeAddr(string.concat("tp", vm.toString(i)));
            tl.transfer(o, 10_000e18);
            vm.prank(owners[i]);
            nft.transferFrom(owners[i], o, ids[i]);
            vm.startPrank(o);
            tl.approve(address(tournament), 100e18);
            tournament.register(tId, ids[i]);
            vm.stopPrank();
        }
        tournament.start(tId);
        assertEq(mm.matchCount(), matchId + 4, "four tournament matches created while MatchManager is paused");

        // after expiry pause is dead and the guardian can do nothing
        vm.warp(factory.DEPLOY_TIME() + Config.PAUSE_EXPIRY);
        assertFalse(factory.isPaused());
        assertFalse(mm.isPaused());
        assertFalse(vault.isPaused());
        vm.startPrank(guardian);
        vm.expectRevert(GuardianPausable.GuardianExpired.selector);
        factory.pause();
        vm.expectRevert(GuardianPausable.GuardianExpired.selector);
        factory.unpause();
        vm.stopPrank();
    }

    // ------------------------------------------------------------ deployer privileges

    function test_A1_bindIsOneShotAndDeployerOnly() public {
        vm.expectRevert(CharacterFactory.AlreadyBound.selector);
        factory.bind(address(nft), address(vesting));
        vm.prank(alice);
        vm.expectRevert(CharacterFactory.NotDeployer.selector);
        factory.bind(address(nft), address(vesting));
        // a fresh factory cannot be bound by a stranger before the deployer does it
        CharacterFactory f2 = new CharacterFactory(address(tl), address(rewardPool), treasury, guardian);
        vm.prank(alice);
        vm.expectRevert(CharacterFactory.NotDeployer.selector);
        f2.bind(address(nft), address(vesting));
        // and the deployer cannot bind an NFT that points elsewhere
        vm.expectRevert(CharacterFactory.NotBound.selector);
        f2.bind(address(nft), address(vesting));
    }
}
