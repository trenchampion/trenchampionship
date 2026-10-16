// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {AmmFactory} from "../../src/AmmFactory.sol";
import {BattleEngine} from "../../src/BattleEngine.sol";
import {CharacterFactory} from "../../src/CharacterFactory.sol";
import {CharacterPortrait} from "../../src/CharacterPortrait.sol";
import {Config} from "../../src/Config.sol";
import {ControllerNFT} from "../../src/ControllerNFT.sol";
import {CreatorVesting} from "../../src/CreatorVesting.sol";
import {MatchManager} from "../../src/MatchManager.sol";
import {Rating} from "../../src/Rating.sol";
import {RewardPool} from "../../src/RewardPool.sol";
import {StakingVault} from "../../src/StakingVault.sol";
import {TLToken} from "../../src/TLToken.sol";
import {Tournament} from "../../src/Tournament.sol";
import {deployPortrait} from "./ArtDeploy.sol";

/// @dev Full protocol deployment with precomputed addresses, as the deploy script will do it.
///      The test contract plays LaunchPool (holds the 900 M) and Tournament (may create matches).
abstract contract DeployHelper is Test {
    CharacterPortrait portrait;
    TLToken tl;
    CharacterFactory factory;
    ControllerNFT nft;
    CreatorVesting vesting;
    RewardPool rewardPool;
    StakingVault vault;
    Rating rating;
    MatchManager mm;
    AmmFactory amm;

    address treasury = makeAddr("treasury");
    address guardian = makeAddr("guardian");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address dave = makeAddr("dave");
    address staker1 = makeAddr("staker1");
    address staker2 = makeAddr("staker2");

    Tournament tournament;

    /// @dev Tournament role played by the test contract (for MatchManager unit tests).
    function _deployProtocol() internal {
        _deploy(false);
    }

    /// @dev Real Tournament contract wired into MatchManager and ControllerNFT.
    function _deployProtocolWithTournament() internal {
        _deploy(true);
    }

    function _deploy(bool withTournament) internal {
        uint64 n = vm.getNonce(address(this));
        address predRP = vm.computeCreateAddress(address(this), n + 10);
        address predRating = vm.computeCreateAddress(address(this), n + 12);
        address predMM = vm.computeCreateAddress(address(this), n + 13);
        address predTournament = withTournament ? vm.computeCreateAddress(address(this), n + 14) : address(this);

        portrait = deployPortrait(); // n .. n+5
        tl = new TLToken(address(this), predRP); // n+6
        factory = new CharacterFactory(address(tl), predRP, treasury, guardian); // n+7
        nft = new ControllerNFT(
            address(factory), predMM, withTournament ? predTournament : address(0), predRating, address(portrait)
        ); // n+8
        vesting = new CreatorVesting(address(factory)); // n+9
        rewardPool = new RewardPool(address(tl), predMM, predRating); // n+10
        vault = new StakingVault(address(tl), predMM, address(factory), address(nft), address(rewardPool), guardian); // n+11
        rating = new Rating(address(tl), predMM, address(rewardPool), address(nft)); // n+12
        mm = new MatchManager(
            address(tl),
            address(nft),
            address(factory),
            address(rewardPool),
            address(vault),
            address(rating),
            treasury,
            predTournament,
            guardian
        ); // n+13
        if (withTournament) {
            tournament =
                new Tournament(address(tl), address(mm), address(nft), address(rating), address(rewardPool), treasury); // n+14
            assertEq(address(tournament), predTournament, "Tournament address");
        }
        assertEq(address(rewardPool), predRP, "RewardPool address");
        assertEq(address(rating), predRating, "Rating address");
        assertEq(address(mm), predMM, "MatchManager address");
        factory.bind(address(nft), address(vesting));
        amm = new AmmFactory(address(tl), address(factory), address(rewardPool), treasury); // last, unreferenced

        address[6] memory people = [alice, bob, carol, dave, staker1, staker2];
        for (uint256 i = 0; i < people.length; i++) {
            tl.transfer(people[i], 2_000_000e18);
        }
    }

    function _tokenomics() internal pure returns (CharacterFactory.Tokenomics memory tk) {
        tk = CharacterFactory.Tokenomics({
            name: "Hero",
            symbol: "HERO",
            supply: 1_000_000_000e18,
            virtualTl: 10_000e18,
            creatorAllocBps: 0,
            vestingDuration: 0,
            creatorFeeBps: 50
        });
    }

    /// @dev Create a character for `who` with given traits; `buyTl` of its own token bought on creation.
    function _createFor(address who, BattleEngine.Traits memory t, uint256 buyTl) internal returns (uint256 id) {
        vm.startPrank(who);
        tl.approve(address(factory), Config.MINT_FEE + buyTl);
        id = factory.createCharacter(t, "ipfs://meta", _tokenomics(), buyTl, 0);
        vm.stopPrank();
    }

    function _gen() internal pure returns (BattleEngine.Traits memory) {
        return BattleEngine.Traits(11, 11, 12, 11, 0, 1, 3); // energy 11
    }

    function _tactics(uint8 s0, uint8 s1, uint8 s2, uint8 e0, uint8 e1, uint8 e2)
        internal
        pure
        returns (BattleEngine.Tactics memory t)
    {
        t.stances = [s0, s1, s2];
        t.energies = [e0, e1, e2];
    }
}
