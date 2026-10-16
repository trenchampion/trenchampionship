// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {BattleEngine} from "../src/BattleEngine.sol";
import {CharacterFactory} from "../src/CharacterFactory.sol";
import {CharacterPool} from "../src/CharacterPool.sol";
import {CharacterToken} from "../src/CharacterToken.sol";
import {Config} from "../src/Config.sol";
import {ControllerNFT} from "../src/ControllerNFT.sol";
import {deployPortrait} from "./helpers/ArtDeploy.sol";
import {CreatorVesting} from "../src/CreatorVesting.sol";
import {GuardianPausable} from "../src/GuardianPausable.sol";
import {TLToken} from "../src/TLToken.sol";
import {IActivityLock} from "../src/interfaces/IActivityLock.sol";

contract LockMock is IActivityLock {
    mapping(uint256 => bool) public busy;

    function set(uint256 id, bool b) external {
        busy[id] = b;
    }

    function isBusy(uint256 id) external view returns (bool) {
        return busy[id];
    }
}

contract CharactersTest is Test {
    TLToken tl;
    CharacterFactory factory;
    ControllerNFT nft;
    CreatorVesting vesting;
    LockMock lock;

    address rewardPool = makeAddr("rewardPool");
    address treasury = makeAddr("treasury");
    address guardian = makeAddr("guardian");
    address creator = makeAddr("creator");
    address trader = makeAddr("trader");
    address buyer2 = makeAddr("buyer2");

    BattleEngine.Traits traits = BattleEngine.Traits(11, 11, 12, 11, 0, 1, 3);

    function setUp() public {
        // this test contract plays LaunchPool so it can hand out TL
        tl = new TLToken(address(this), rewardPool);
        factory = new CharacterFactory(address(tl), rewardPool, treasury, guardian);
        lock = new LockMock();
        nft = new ControllerNFT(address(factory), address(lock), address(0), address(0), address(deployPortrait()));
        vesting = new CreatorVesting(address(factory));
        factory.bind(address(nft), address(vesting));
        tl.transfer(creator, 1_000_000e18);
        tl.transfer(trader, 1_000_000e18);
        tl.transfer(buyer2, 1_000_000e18);
    }

    function _tk() internal pure returns (CharacterFactory.Tokenomics memory tk) {
        tk = CharacterFactory.Tokenomics({
            name: "Zmaj",
            symbol: "ZMAJ",
            supply: 1_000_000_000e18,
            virtualTl: 10_000e18,
            creatorAllocBps: 1000,
            vestingDuration: 90 days,
            creatorFeeBps: 50
        });
    }

    function _create(address who, uint256 buyTl) internal returns (uint256 id) {
        vm.startPrank(who);
        tl.approve(address(factory), Config.MINT_FEE + buyTl);
        id = factory.createCharacter(traits, "ipfs://bafy-zmaj", _tk(), buyTl, 0);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ creation

    function test_createCharacter_splitsFeeAndDeploysEverything() public {
        uint256 supplyBefore = tl.totalSupply();
        uint256 id = _create(creator, 0);
        assertEq(id, 1);
        assertEq(factory.characterCount(), 1);
        assertTrue(factory.exists(1));
        assertFalse(factory.exists(0));
        assertFalse(factory.exists(2));
        // 50 % burned, 25 % RewardPool, 25 % treasury
        assertEq(supplyBefore - tl.totalSupply(), 2500e18);
        assertEq(tl.balanceOf(rewardPool), Config.TL_TO_REWARDPOOL_SEED + 1250e18);
        assertEq(tl.balanceOf(treasury), 1250e18);
        assertEq(tl.balanceOf(creator), 1_000_000e18 - Config.MINT_FEE);
        // token and pool
        CharacterToken token = CharacterToken(factory.tokenOf(id));
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        assertEq(token.CHARACTER_ID(), id);
        assertEq(token.name(), "Zmaj");
        assertEq(token.totalSupply(), 1_000_000_000e18);
        assertEq(token.balanceOf(address(pool)), 900_000_000e18);
        assertEq(token.balanceOf(address(vesting)), 100_000_000e18);
        assertEq(pool.tokenReserve(), 900_000_000e18);
        assertEq(pool.realReserve(), 0);
        assertEq(pool.VIRTUAL_TL(), 10_000e18);
        assertEq(pool.CREATOR_FEE_BPS(), 50);
        assertEq(pool.spotPrice(), uint256(10_000e18) * 1e18 / 900_000_000e18);
        // vesting, nft, records
        (address vtoken, address beneficiary, uint256 total,,, uint64 duration) = vesting.schedules(id);
        assertEq(vtoken, address(token));
        assertEq(beneficiary, creator);
        assertEq(total, 100_000_000e18);
        assertEq(duration, 90 days);
        assertEq(nft.ownerOf(id), creator);
        assertEq(nft.controllerOf(id), creator);
        assertEq(pool.controller(), creator);
        assertEq(factory.creatorOf(id), creator);
        assertEq(factory.metadataURI(id), "ipfs://bafy-zmaj");
        bytes memory uri = bytes(nft.tokenURI(id));
        bytes memory prefix = bytes("data:application/json;base64,");
        assertGt(uri.length, prefix.length, "tokenURI is on-chain json");
        for (uint256 i; i < prefix.length; i++) {
            assertEq(uri[i], prefix[i], "tokenURI prefix");
        }
        BattleEngine.Traits memory t = factory.traitsOf(id);
        assertEq(t.strength, 11);
        assertEq(t.special, 1);
    }

    function test_createCharacter_withCreatorBuy() public {
        uint256 id = _create(creator, 1000e18);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        CharacterToken token = CharacterToken(factory.tokenOf(id));
        // fees: 1 % protocol (0.5 % treasury, 0.5 % RP) + 0.5 % creator
        assertEq(pool.realReserve(), 1000e18 - 10e18 - 5e18);
        assertEq(pool.creatorFeeOwed(), 5e18);
        assertEq(tl.balanceOf(treasury), 1250e18 + 5e18);
        assertEq(tl.balanceOf(rewardPool), Config.TL_TO_REWARDPOOL_SEED + 1250e18 + 5e18);
        assertGt(token.balanceOf(creator), 0);
        assertEq(token.balanceOf(creator) + pool.tokenReserve(), 900_000_000e18);
        assertEq(tl.balanceOf(address(pool)), pool.realReserve() + pool.creatorFeeOwed());
        assertEq(tl.allowance(address(factory), address(pool)), 0);
    }

    function test_createCharacter_noAllocationNoVesting() public {
        CharacterFactory.Tokenomics memory tk = _tk();
        tk.creatorAllocBps = 0;
        tk.vestingDuration = 0;
        vm.startPrank(creator);
        tl.approve(address(factory), Config.MINT_FEE);
        uint256 id = factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        vm.stopPrank();
        (address vtoken,,,,,) = vesting.schedules(id);
        assertEq(vtoken, address(0));
        assertEq(CharacterPool(factory.poolOf(id)).tokenReserve(), tk.supply);
    }

    function test_createCharacter_reverts() public {
        CharacterFactory.Tokenomics memory tk = _tk();
        vm.startPrank(creator);
        tl.approve(address(factory), type(uint256).max);

        BattleEngine.Traits memory bad = traits;
        bad.strength = 12; // budget 46
        vm.expectRevert(CharacterFactory.InvalidTraits.selector);
        factory.createCharacter(bad, "ipfs://x", tk, 0, 0);

        bad = traits;
        bad.special = 0;
        vm.expectRevert(CharacterFactory.InvalidSpecial.selector);
        factory.createCharacter(bad, "ipfs://x", tk, 0, 0);

        vm.expectRevert(CharacterFactory.EmptyMetadata.selector);
        factory.createCharacter(traits, "", tk, 0, 0);

        tk.supply = Config.CHAR_SUPPLY_MIN - 1;
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.supply = Config.CHAR_SUPPLY_MAX + 1;
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.virtualTl = Config.CHAR_VIRTUAL_TL_MIN - 1;
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.virtualTl = Config.CHAR_VIRTUAL_TL_MAX + 1;
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.creatorAllocBps = uint16(Config.CREATOR_ALLOC_MAX_BPS + 1);
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.creatorFeeBps = uint16(Config.CREATOR_FEE_MAX_BPS + 1);
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.vestingDuration = uint32(Config.CREATOR_VESTING_MIN - 1);
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.vestingDuration = uint32(Config.CREATOR_VESTING_MAX + 1);
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.name = "";
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.symbol = "";
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        vm.stopPrank();
    }

    function test_validTokenomicsExternal() public view {
        assertTrue(factory.validTokenomics(_tk()));
        CharacterFactory.Tokenomics memory tk = _tk();
        tk.creatorAllocBps = 0;
        tk.vestingDuration = 0;
        assertTrue(factory.validTokenomics(tk), "no allocation needs no vesting");
    }

    function test_createCharacter_slippageOnCreatorBuy() public {
        vm.startPrank(creator);
        tl.approve(address(factory), type(uint256).max);
        vm.expectRevert(CharacterPool.SlippageExceeded.selector);
        factory.createCharacter(traits, "ipfs://x", _tk(), 1000e18, type(uint256).max);
        vm.stopPrank();
    }

    function test_zeroAddressConstructors() public {
        vm.expectRevert(CharacterFactory.ZeroAddress.selector);
        new CharacterFactory(address(0), rewardPool, treasury, guardian);
        vm.expectRevert(CharacterFactory.ZeroAddress.selector);
        new CharacterFactory(address(tl), address(0), treasury, guardian);
        vm.expectRevert(CharacterFactory.ZeroAddress.selector);
        new CharacterFactory(address(tl), rewardPool, address(0), guardian);
        vm.expectRevert(CreatorVesting.ZeroAddress.selector);
        new CreatorVesting(address(0));
    }

    function test_bind() public {
        CharacterFactory f2 = new CharacterFactory(address(tl), rewardPool, treasury, guardian);
        vm.startPrank(creator);
        tl.approve(address(f2), type(uint256).max);
        vm.expectRevert(CharacterFactory.NotBound.selector);
        f2.createCharacter(traits, "ipfs://x", _tk(), 0, 0);
        vm.stopPrank();
        // nft/vesting bound to another factory are refused
        vm.expectRevert(CharacterFactory.NotBound.selector);
        f2.bind(address(nft), address(vesting));
        ControllerNFT n2 = new ControllerNFT(address(f2), address(0), address(0), address(0), address(nft.ART()));
        CreatorVesting v2 = new CreatorVesting(address(f2));
        f2.bind(address(n2), address(v2));
        vm.expectRevert(CharacterFactory.AlreadyBound.selector);
        f2.bind(address(n2), address(v2));
    }

    // ------------------------------------------------------------------ pause

    function test_pauseOnlyBlocksCreation() public {
        vm.prank(trader);
        vm.expectRevert(GuardianPausable.NotGuardian.selector);
        factory.pause();
        vm.prank(guardian);
        factory.pause();
        assertTrue(factory.isPaused());
        vm.startPrank(creator);
        tl.approve(address(factory), type(uint256).max);
        vm.expectRevert(GuardianPausable.Paused.selector);
        factory.createCharacter(traits, "ipfs://x", _tk(), 0, 0);
        vm.stopPrank();
        vm.prank(trader);
        vm.expectRevert(GuardianPausable.NotGuardian.selector);
        factory.unpause();
        vm.prank(guardian);
        factory.unpause();
        assertFalse(factory.isPaused());
        _create(creator, 0);
    }

    function test_guardianExpires() public {
        vm.prank(guardian);
        factory.pause();
        vm.warp(vm.getBlockTimestamp() + Config.PAUSE_EXPIRY);
        assertTrue(factory.paused());
        assertFalse(factory.isPaused(), "a pause dies with the guardian");
        _create(creator, 0);
        vm.prank(guardian);
        vm.expectRevert(GuardianPausable.GuardianExpired.selector);
        factory.pause();
        vm.prank(guardian);
        vm.expectRevert(GuardianPausable.GuardianExpired.selector);
        factory.unpause();
    }

    // ------------------------------------------------------------------ pool

    function test_pool_buySellFeesAndClaims() public {
        uint256 id = _create(creator, 0);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        CharacterToken token = CharacterToken(factory.tokenOf(id));
        uint256 rpBefore = tl.balanceOf(rewardPool);
        uint256 trBefore = tl.balanceOf(treasury);

        vm.startPrank(trader);
        tl.approve(address(pool), type(uint256).max);
        uint256 quoted = pool.quoteBuy(2000e18);
        uint256 out = pool.buy(2000e18, quoted);
        vm.stopPrank();
        assertEq(out, quoted);
        assertEq(token.balanceOf(trader), out);
        assertEq(pool.realReserve(), 2000e18 - 20e18 - 10e18);
        assertEq(pool.creatorFeeOwed(), 10e18);
        assertEq(tl.balanceOf(treasury) - trBefore, 10e18);
        assertEq(tl.balanceOf(rewardPool) - rpBefore, 10e18);

        // sell everything back: a round trip never profits (fees on both legs)
        vm.startPrank(trader);
        token.approve(address(pool), type(uint256).max);
        uint256 q = pool.quoteSell(out);
        uint256 got = pool.sell(out, q);
        vm.stopPrank();
        assertEq(got, q);
        assertLt(got, 2000e18);
        assertEq(token.balanceOf(trader), 0);
        assertEq(tl.balanceOf(address(pool)), pool.realReserve() + pool.creatorFeeOwed());
        assertEq(token.balanceOf(address(pool)), pool.tokenReserve());

        // creator fee claim goes to the controller
        uint256 owed = pool.creatorFeeOwed();
        assertGt(owed, 10e18);
        uint256 cBefore = tl.balanceOf(creator);
        pool.claimCreatorFees();
        assertEq(tl.balanceOf(creator) - cBefore, owed);
        assertEq(pool.creatorFeeOwed(), 0);
        vm.expectRevert(CharacterPool.NothingToClaim.selector);
        pool.claimCreatorFees();
    }

    function test_pool_feeFollowsNftThenRewardPoolAfterRetire() public {
        uint256 id = _create(creator, 0);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        vm.startPrank(trader);
        tl.approve(address(pool), type(uint256).max);
        pool.buy(1000e18, 0);
        vm.stopPrank();
        // transfer the controller: fees go to the new controller
        vm.prank(creator);
        nft.transferFrom(creator, buyer2, id);
        assertEq(pool.controller(), buyer2);
        uint256 b = tl.balanceOf(buyer2);
        pool.claimCreatorFees();
        assertEq(tl.balanceOf(buyer2) - b, 5e18);
        // retire: fees go to RewardPool
        vm.startPrank(trader);
        pool.buy(1000e18, 0);
        vm.stopPrank();
        vm.prank(buyer2);
        nft.retire(id);
        assertEq(pool.controller(), address(0));
        assertTrue(nft.retired(id));
        uint256 rp = tl.balanceOf(rewardPool);
        pool.claimCreatorFees();
        assertEq(tl.balanceOf(rewardPool) - rp, 5e18);
    }

    function test_pool_sellBeyondReserveReverts() public {
        uint256 id = _create(creator, 0);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        CharacterToken token = CharacterToken(factory.tokenOf(id));
        // creator's vested tokens were never bought on the curve: with zero real TL they cannot be sold
        vm.warp(vm.getBlockTimestamp() + 90 days);
        vesting.release(id);
        assertEq(token.balanceOf(creator), 100_000_000e18);
        assertEq(pool.quoteSell(1e18), 0);
        vm.startPrank(creator);
        token.approve(address(pool), type(uint256).max);
        vm.expectRevert(CharacterPool.InsufficientReserve.selector);
        pool.sell(1_000_000e18, 0);
        vm.stopPrank();
        // once a buyer funds the pool, the creator can sell within the real reserve
        vm.startPrank(trader);
        tl.approve(address(pool), type(uint256).max);
        pool.buy(5000e18, 0);
        vm.stopPrank();
        vm.prank(creator);
        uint256 got = pool.sell(1_000_000e18, 0);
        assertGt(got, 0);
        assertEq(tl.balanceOf(address(pool)), pool.realReserve() + pool.creatorFeeOwed());
    }

    function test_pool_zeroAndSlippageAndInit() public {
        uint256 id = _create(creator, 0);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        vm.startPrank(trader);
        tl.approve(address(pool), type(uint256).max);
        vm.expectRevert(CharacterPool.ZeroAmount.selector);
        pool.buy(0, 0);
        vm.expectRevert(CharacterPool.SlippageExceeded.selector);
        pool.buy(1000e18, type(uint256).max);
        vm.expectRevert(CharacterPool.ZeroAmount.selector);
        pool.sell(0, 0);
        pool.buy(1000e18, 0);
        CharacterToken(factory.tokenOf(id)).approve(address(pool), type(uint256).max);
        vm.expectRevert(CharacterPool.SlippageExceeded.selector);
        pool.sell(1e18, type(uint256).max);
        vm.stopPrank();
        vm.expectRevert(CharacterPool.NotFactory.selector);
        pool.initialize(address(1));
        // a bare pool (not initialized) refuses trades
        CharacterPool bare = new CharacterPool(99, address(tl), address(nft), rewardPool, treasury, 1000e18, 0);
        vm.expectRevert(CharacterPool.NotInitialized.selector);
        bare.buy(1e18, 0);
        vm.expectRevert(CharacterPool.NotInitialized.selector);
        bare.sell(1e18, 0);
        bare.initialize(address(tl));
        vm.expectRevert(CharacterPool.AlreadyInitialized.selector);
        bare.initialize(address(tl));
    }

    function test_pool_noCreatorFeeAndNoTreasuryShareBranches() public {
        CharacterFactory.Tokenomics memory tk = _tk();
        tk.creatorFeeBps = 0;
        vm.startPrank(creator);
        tl.approve(address(factory), type(uint256).max);
        uint256 id = factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        vm.stopPrank();
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        vm.startPrank(trader);
        tl.approve(address(pool), type(uint256).max);
        pool.buy(1000e18, 0);
        vm.stopPrank();
        assertEq(pool.creatorFeeOwed(), 0);
        assertEq(pool.realReserve(), 990e18);
    }

    function testFuzz_poolAccounting(uint96[6] memory amounts, uint8 sellMask) public {
        uint256 id = _create(creator, 0);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        CharacterToken token = CharacterToken(factory.tokenOf(id));
        vm.startPrank(trader);
        tl.approve(address(pool), type(uint256).max);
        token.approve(address(pool), type(uint256).max);
        uint256 kBefore = pool.quoteReserve() * pool.tokenReserve();
        for (uint256 i = 0; i < 6; i++) {
            uint256 amt = bound(amounts[i], 1e18, 100_000e18);
            pool.buy(amt, 0);
            if ((sellMask >> i) & 1 == 1) {
                uint256 half = token.balanceOf(trader) / 2;
                if (pool.quoteSell(half) > 0) pool.sell(half, 0);
            }
            assertEq(tl.balanceOf(address(pool)), pool.realReserve() + pool.creatorFeeOwed(), "TL accounting");
            assertEq(token.balanceOf(address(pool)), pool.tokenReserve(), "token accounting");
            uint256 kAfter = pool.quoteReserve() * pool.tokenReserve();
            assertGe(kAfter, kBefore, "k must not decrease");
            kBefore = kAfter;
        }
        vm.stopPrank();
    }

    function test_pool_tinyTradeFeesRoundToZero() public {
        uint256 id = _create(creator, 0);
        CharacterPool pool = CharacterPool(factory.poolOf(id));
        vm.startPrank(trader);
        tl.approve(address(pool), type(uint256).max);
        uint256 out = pool.buy(50, 0); // protocol fee 0, creator fee 0
        vm.stopPrank();
        assertGt(out, 0);
        assertEq(pool.realReserve(), 50);
        assertEq(pool.creatorFeeOwed(), 0);
        vm.prank(trader);
        pool.buy(150, 0); // protocol fee 1 wei: treasury share 0, RewardPool 1
        assertEq(tl.balanceOf(rewardPool), Config.TL_TO_REWARDPOOL_SEED + 1250e18 + 1);
    }

    // ------------------------------------------------------------------ vesting

    function test_vesting_linearRelease() public {
        uint256 id = _create(creator, 0);
        CharacterToken token = CharacterToken(factory.tokenOf(id));
        assertEq(vesting.vested(id), 0);
        vm.expectRevert(CreatorVesting.NothingToRelease.selector);
        vesting.release(id);
        vm.warp(vm.getBlockTimestamp() + 45 days);
        assertEq(vesting.vested(id), 50_000_000e18);
        assertEq(vesting.releasable(id), 50_000_000e18);
        vm.prank(trader); // anyone may trigger
        uint256 rel = vesting.release(id);
        assertEq(rel, 50_000_000e18);
        assertEq(token.balanceOf(creator), 50_000_000e18);
        vm.warp(vm.getBlockTimestamp() + 100 days);
        assertEq(vesting.vested(id), 100_000_000e18);
        vesting.release(id);
        assertEq(token.balanceOf(creator), 100_000_000e18);
        assertEq(vesting.releasable(id), 0);
        assertEq(vesting.vested(777), 0, "unknown schedule vests nothing");
    }

    function test_vesting_accessControl() public {
        uint256 id = _create(creator, 0);
        vm.expectRevert(CreatorVesting.NotFactory.selector);
        vesting.setup(5, address(tl), creator, 1, 30 days);
        vm.prank(address(factory));
        vm.expectRevert(CreatorVesting.AlreadySet.selector);
        vesting.setup(id, address(tl), creator, 1, 30 days);
    }

    // ------------------------------------------------------------------ nft

    function test_nft_lockAndRetire() public {
        uint256 id = _create(creator, 0);
        vm.expectRevert(ControllerNFT.NotFactory.selector);
        nft.mint(trader, 2);
        lock.set(id, true);
        assertTrue(nft.isBusy(id));
        vm.prank(creator);
        vm.expectRevert(ControllerNFT.CharacterBusy.selector);
        nft.transferFrom(creator, trader, id);
        vm.prank(creator);
        vm.expectRevert(ControllerNFT.CharacterBusy.selector);
        nft.retire(id);
        lock.set(id, false);
        vm.prank(creator);
        nft.transferFrom(creator, trader, id);
        assertEq(nft.ownerOf(id), trader);
        vm.prank(creator);
        vm.expectRevert(ControllerNFT.NotController.selector);
        nft.retire(id);
        vm.prank(trader);
        nft.retire(id);
        assertEq(nft.controllerOf(id), address(0));
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, id));
        nft.tokenURI(id);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, id));
        nft.ownerOf(id);
    }

    function test_nft_tournamentLockAndZeroFactory() public {
        address art = address(nft.ART());
        vm.expectRevert(ControllerNFT.ZeroAddress.selector);
        new ControllerNFT(address(0), address(0), address(0), address(0), art);
        vm.expectRevert(ControllerNFT.ZeroAddress.selector);
        new ControllerNFT(address(this), address(0), address(0), address(0), address(0));
        LockMock t = new LockMock();
        ControllerNFT n2 = new ControllerNFT(address(this), address(0), address(t), address(0), art);
        n2.mint(creator, 1);
        t.set(1, true);
        assertTrue(n2.isBusy(1));
        t.set(1, false);
        assertFalse(n2.isBusy(1));
    }

    function test_bindOnlyDeployer() public {
        CharacterFactory f2 = new CharacterFactory(address(tl), rewardPool, treasury, guardian);
        ControllerNFT n2 = new ControllerNFT(address(f2), address(0), address(0), address(0), address(nft.ART()));
        CreatorVesting v2 = new CreatorVesting(address(f2));
        assertEq(f2.DEPLOYER(), address(this));
        vm.prank(trader);
        vm.expectRevert(CharacterFactory.NotDeployer.selector);
        f2.bind(address(n2), address(v2));
        f2.bind(address(n2), address(v2));
        assertEq(address(f2.nft()), address(n2));
    }

    function test_creatorStringBounds() public {
        vm.startPrank(creator);
        tl.approve(address(factory), Config.MINT_FEE);
        CharacterFactory.Tokenomics memory tk = _tk();
        tk.name = string(new bytes(Config.CHAR_NAME_MAX_BYTES + 1));
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        tk.symbol = string(new bytes(Config.CHAR_SYMBOL_MAX_BYTES + 1));
        vm.expectRevert(CharacterFactory.InvalidTokenomics.selector);
        factory.createCharacter(traits, "ipfs://x", tk, 0, 0);
        tk = _tk();
        vm.expectRevert(CharacterFactory.MetadataTooLong.selector);
        factory.createCharacter(traits, string(new bytes(Config.METADATA_URI_MAX_BYTES + 1)), tk, 0, 0);
        // exactly at the bounds is accepted
        tk.name = string(new bytes(Config.CHAR_NAME_MAX_BYTES));
        tk.symbol = string(new bytes(Config.CHAR_SYMBOL_MAX_BYTES));
        uint256 id = factory.createCharacter(traits, string(new bytes(Config.METADATA_URI_MAX_BYTES)), tk, 0, 0);
        vm.stopPrank();
        assertEq(bytes(factory.metadataURI(id)).length, Config.METADATA_URI_MAX_BYTES);
    }
}
