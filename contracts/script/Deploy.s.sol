// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {AmmFactory} from "../src/AmmFactory.sol";
import {BattleEngine} from "../src/BattleEngine.sol";
import {CharacterFactory} from "../src/CharacterFactory.sol";
import {CharacterPortrait} from "../src/CharacterPortrait.sol";
import {ControllerNFT} from "../src/ControllerNFT.sol";
import {CreatorVesting} from "../src/CreatorVesting.sol";
import {LaunchPool} from "../src/LaunchPool.sol";
import {MatchManager} from "../src/MatchManager.sol";
import {Rating} from "../src/Rating.sol";
import {RewardPool} from "../src/RewardPool.sol";
import {StakingVault} from "../src/StakingVault.sol";
import {TLToken} from "../src/TLToken.sol";
import {Tournament} from "../src/Tournament.sol";
import {PortraitArms} from "../src/art/PortraitArms.sol";
import {PortraitBase} from "../src/art/PortraitBase.sol";
import {PortraitBody} from "../src/art/PortraitBody.sol";
import {PortraitFace} from "../src/art/PortraitFace.sol";
import {PortraitItems} from "../src/art/PortraitItems.sol";

/// @title Deploy
/// @notice Deploys the whole protocol in one broadcast with precomputed addresses, executes the
///         founder purchase in the LaunchPool constructor and writes the addresses to
///         deployments/<chainId>.json.
/// @dev Environment:
///        DEPLOYER_KEY      private key of the deployer (also the founder; receives the founder TL).
///                          Unset (or 0) for a hardware wallet or keystore: the broadcaster is then
///                          the script sender (`--account`/`--ledger` with `--sender <address>`).
///        TREASURY          address receiving the treasury shares
///        GUARDIAN          address allowed to pause for 365 days (a Safe, or the deployer)
///        FOUNDER_BUY_ETH   wei sent with the LaunchPool deploy (default 0.2857 ether = 20 % at V = 1; 0 disables)
///      Usage:
///        forge script script/Deploy.s.sol --rpc-url $RPC --broadcast --slow --verify
///        forge script script/Deploy.s.sol --rpc-url $RPC --broadcast --slow --account deployer --sender $DEPLOYER
contract Deploy is Script {
    using stdJson for string;

    struct Deployed {
        PortraitBase artBase;
        PortraitBody artBody;
        PortraitFace artFace;
        PortraitItems artItems;
        PortraitArms artArms;
        CharacterPortrait portrait;
        TLToken tl;
        LaunchPool launchPool;
        CharacterFactory factory;
        ControllerNFT nft;
        CreatorVesting vesting;
        RewardPool rewardPool;
        StakingVault vault;
        Rating rating;
        MatchManager matchManager;
        Tournament tournament;
        AmmFactory amm;
    }

    function run() external returns (Deployed memory d) {
        // Only the chains this project targets; a wrong --rpc-url must not deploy anywhere else.
        require(block.chainid == 8453 || block.chainid == 84_532 || block.chainid == 31_337, "unexpected chain id");
        address treasury = vm.envAddress("TREASURY");
        address guardian = vm.envAddress("GUARDIAN");
        require(guardian != address(0), "GUARDIAN is zero");
        // 2/7 ETH = 20 % of the supply at V = 1 ETH (DEPLOY.md 6.1). A malformed value must fail loudly
        // (envUint reverts on parse errors) instead of silently falling back to the default.
        uint256 founderEth = vm.envExists("FOUNDER_BUY_ETH") ? vm.envUint("FOUNDER_BUY_ETH") : 285_714_285_714_285_714;
        uint256 pk = vm.envOr("DEPLOYER_KEY", uint256(0));
        address creator;
        if (pk != 0) {
            creator = vm.addr(pk);
            // A stale DEPLOYER_KEY in .env must never override an explicit --sender (keystore path).
            if (msg.sender != DEFAULT_SENDER && msg.sender != creator) revert("DEPLOYER_KEY and --sender disagree");
            vm.startBroadcast(pk);
        } else {
            // hardware wallet or keystore: forge signs with the account and `--sender` is both
            // msg.sender here and the broadcaster, so its nonce drives the precomputed addresses
            creator = msg.sender;
            vm.startBroadcast();
        }
        console2.log("chain id", block.chainid);
        console2.log("deployer", creator);
        console2.log("founder buy (wei)", founderEth);
        d = deployAll(creator, treasury, guardian, founderEth);
        vm.stopBroadcast();
        _writeAddresses(d);
    }

    /// @notice Deploy everything. `creator` is the account whose nonce the CREATE addresses derive
    ///         from: the broadcaster in `run()`, or this contract when called from a test.
    /// @dev Deploy order fixes the nonces: PortraitBase(n) PortraitBody(n+1) PortraitFace(n+2)
    ///      PortraitItems(n+3) PortraitArms(n+4) CharacterPortrait(n+5) TL(n+6) LaunchPool(n+7)
    ///      Factory(n+8) NFT(n+9) Vesting(n+10) RewardPool(n+11) Vault(n+12) Rating(n+13)
    ///      MatchManager(n+14) Tournament(n+15), then factory.bind (n+16) and AmmFactory(n+17,
    ///      referenced by nobody, so it needs no prediction).
    function deployAll(address creator, address treasury, address guardian, uint256 founderEth)
        public
        payable
        returns (Deployed memory d)
    {
        address[6] memory p = _predict(creator);
        _deployArt(d);
        _deployCore(d, p, treasury, guardian, founderEth);
        _deployGame(d, p, treasury, guardian);
        _check(d, p);
    }

    /// @dev p = [launchPool, factory, rewardPool, rating, matchManager, tournament]
    function _predict(address creator) internal view returns (address[6] memory p) {
        uint64 n = vm.getNonce(creator);
        p[0] = vm.computeCreateAddress(creator, n + 7);
        p[1] = vm.computeCreateAddress(creator, n + 8);
        p[2] = vm.computeCreateAddress(creator, n + 11);
        p[3] = vm.computeCreateAddress(creator, n + 13);
        p[4] = vm.computeCreateAddress(creator, n + 14);
        p[5] = vm.computeCreateAddress(creator, n + 15);
    }

    function _deployArt(Deployed memory d) internal {
        d.artBase = new PortraitBase();
        d.artBody = new PortraitBody();
        d.artFace = new PortraitFace();
        d.artItems = new PortraitItems();
        d.artArms = new PortraitArms();
        d.portrait = new CharacterPortrait(
            [address(d.artBase), address(d.artBody), address(d.artFace), address(d.artItems), address(d.artArms)]
        );
        _checkArt(d.portrait);
    }

    /// @dev Pins the deployed renderer to the TypeScript mirror: the first shared art vector must match, so a
    ///      wrong part order (all five parts share one selector) fails here instead of garbling every portrait
    ///      forever. Reads engine/vectors/art-vectors.json (a local file; nothing on chain depends on it).
    function _checkArt(CharacterPortrait portrait) internal view {
        string memory doc = vm.readFile("../engine/vectors/art-vectors.json");
        uint256[] memory v = doc.readUintArray(".cases[0].traits");
        BattleEngine.Traits memory t = BattleEngine.Traits(
            uint8(v[0]), uint8(v[1]), uint8(v[2]), uint8(v[3]), uint8(v[4]), uint8(v[5]), uint8(v[6])
        );
        uint256 id = vm.parseUint(doc.readString(".cases[0].id"));
        require(keccak256(bytes(portrait.svg(id, t))) == doc.readBytes32(".cases[0].svgKeccak"), "portrait wiring");
    }

    function _deployCore(Deployed memory d, address[6] memory p, address treasury, address guardian, uint256 founderEth)
        internal
    {
        d.tl = new TLToken(p[0], p[2]);
        d.launchPool = new LaunchPool{value: founderEth}(address(d.tl));
        d.factory = new CharacterFactory(address(d.tl), p[2], treasury, guardian);
        d.nft = new ControllerNFT(p[1], p[4], p[5], p[3], address(d.portrait));
        d.vesting = new CreatorVesting(p[1]);
    }

    function _deployGame(Deployed memory d, address[6] memory p, address treasury, address guardian) internal {
        d.rewardPool = new RewardPool(address(d.tl), p[4], p[3]);
        d.vault =
            new StakingVault(address(d.tl), p[4], address(d.factory), address(d.nft), address(d.rewardPool), guardian);
        d.rating = new Rating(address(d.tl), p[4], address(d.rewardPool), address(d.nft));
        d.matchManager = new MatchManager(
            address(d.tl),
            address(d.nft),
            address(d.factory),
            address(d.rewardPool),
            address(d.vault),
            address(d.rating),
            treasury,
            p[5],
            guardian
        );
        d.tournament = new Tournament(
            address(d.tl), address(d.matchManager), address(d.nft), address(d.rating), address(d.rewardPool), treasury
        );
        d.factory.bind(address(d.nft), address(d.vesting));
        d.amm = new AmmFactory(address(d.tl), address(d.factory), address(d.rewardPool), treasury);
    }

    function _check(Deployed memory d, address[6] memory p) internal view {
        require(address(d.factory.nft()) == address(d.nft), "factory nft bind");
        require(address(d.factory.vesting()) == address(d.vesting), "factory vesting bind");
        require(address(d.nft.ART()) == address(d.portrait), "nft art");
        require(address(d.nft.RATING()) == p[3], "nft rating");
        require(address(d.launchPool) == p[0], "launchpool address");
        require(address(d.factory) == p[1], "factory address");
        require(address(d.rewardPool) == p[2], "rewardpool address");
        require(address(d.rating) == p[3], "rating address");
        require(address(d.matchManager) == p[4], "matchmanager address");
        require(address(d.tournament) == p[5], "tournament address");
    }

    function _writeAddresses(Deployed memory d) internal {
        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "PortraitBase", address(d.artBase));
        vm.serializeAddress(key, "PortraitBody", address(d.artBody));
        vm.serializeAddress(key, "PortraitFace", address(d.artFace));
        vm.serializeAddress(key, "PortraitItems", address(d.artItems));
        vm.serializeAddress(key, "PortraitArms", address(d.artArms));
        vm.serializeAddress(key, "CharacterPortrait", address(d.portrait));
        vm.serializeAddress(key, "TLToken", address(d.tl));
        vm.serializeAddress(key, "LaunchPool", address(d.launchPool));
        vm.serializeAddress(key, "CharacterFactory", address(d.factory));
        vm.serializeAddress(key, "ControllerNFT", address(d.nft));
        vm.serializeAddress(key, "CreatorVesting", address(d.vesting));
        vm.serializeAddress(key, "RewardPool", address(d.rewardPool));
        vm.serializeAddress(key, "StakingVault", address(d.vault));
        vm.serializeAddress(key, "Rating", address(d.rating));
        vm.serializeAddress(key, "MatchManager", address(d.matchManager));
        vm.serializeAddress(key, "Tournament", address(d.tournament));
        string memory json = vm.serializeAddress(key, "AmmFactory", address(d.amm));
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
        console2.log("wrote", path);
    }
}
