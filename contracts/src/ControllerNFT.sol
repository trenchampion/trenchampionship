// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IActivityLock} from "./interfaces/IActivityLock.sol";
import {ICharacterArt} from "./interfaces/ICharacterArt.sol";
import {ILicenseLock} from "./interfaces/ILicenseLock.sol";
import {BattleEngine} from "./BattleEngine.sol";
import {CharacterArt} from "./CharacterArt.sol";

interface ICharacterInfo {
    function traitsOf(uint256 characterId) external view returns (BattleEngine.Traits memory);
    function tokenOf(uint256 characterId) external view returns (address);
}

/// @title ControllerNFT
/// @notice One 1/1 token per character: the right to lead it into matches, receive its stakes,
///         season rewards and creator fees, and to retire it. Not transferable while the
///         character is engaged in a match or tournament; retire() burns it for good, and is refused
///         while the character holds a season license (the deposit must be withdrawn first).
///         tokenURI renders the character's portrait on chain from its id and traits
///         (CharacterPortrait, fixed at deploy) and wraps it in the metadata (CharacterArt).
contract ControllerNFT is ERC721 {
    error NotFactory();
    error NotController();
    error CharacterBusy();
    error Licensed();
    error ZeroAddress();

    event Retired(uint256 indexed characterId, address indexed by);

    address public immutable FACTORY;
    IActivityLock public immutable MATCH_MANAGER;
    IActivityLock public immutable TOURNAMENT;
    ILicenseLock public immutable RATING;
    ICharacterArt public immutable ART;

    mapping(uint256 characterId => bool) public retired;

    /// @param factory CharacterFactory (only minter).
    /// @param matchManager Lock oracle; address(0) disables the check (tests only).
    /// @param tournament Lock oracle; address(0) disables the check.
    /// @param rating License oracle (Rating); address(0) disables the check (tests only).
    /// @param art Portrait renderer (CharacterPortrait); immutable, no owner can swap it.
    constructor(address factory, address matchManager, address tournament, address rating, address art)
        ERC721("Trenchampionship Controller", "TRCHC")
    {
        if (factory == address(0) || art == address(0)) revert ZeroAddress();
        FACTORY = factory;
        MATCH_MANAGER = IActivityLock(matchManager);
        TOURNAMENT = IActivityLock(tournament);
        RATING = ILicenseLock(rating);
        ART = ICharacterArt(art);
    }

    /// @notice Mint the controller of a new character. Factory only.
    function mint(address to, uint256 characterId) external {
        if (msg.sender != FACTORY) revert NotFactory();
        _safeMint(to, characterId);
    }

    /// @notice Burn the controller: the character can never fight again. Token and pool live on.
    ///         Refused while busy or while a season license deposit is held (unlicense first).
    function retire(uint256 characterId) external {
        if (ownerOf(characterId) != msg.sender) revert NotController();
        if (isBusy(characterId)) revert CharacterBusy();
        if (address(RATING) != address(0) && RATING.licensed(characterId)) revert Licensed();
        retired[characterId] = true;
        _burn(characterId);
        emit Retired(characterId, msg.sender);
    }

    /// @notice Current controller, or address(0) when retired or nonexistent.
    function controllerOf(uint256 characterId) external view returns (address) {
        return _ownerOf(characterId);
    }

    /// @notice True while any activity lock reports the character engaged.
    function isBusy(uint256 characterId) public view returns (bool) {
        if (address(MATCH_MANAGER) != address(0) && MATCH_MANAGER.isBusy(characterId)) return true;
        if (address(TOURNAMENT) != address(0) && TOURNAMENT.isBusy(characterId)) return true;
        return false;
    }

    /// @inheritdoc ERC721
    /// @dev Base64 JSON with the on-chain SVG; the creator's metadataURI stored in the factory is
    ///      an independent reference and does not influence the artwork.
    function tokenURI(uint256 characterId) public view override returns (string memory) {
        _requireOwned(characterId);
        ICharacterInfo info = ICharacterInfo(FACTORY);
        BattleEngine.Traits memory t = info.traitsOf(characterId);
        return CharacterArt.tokenURI(
            characterId,
            t,
            IERC20Metadata(info.tokenOf(characterId)).name(),
            ART.svg(characterId, t),
            ART.attributes(characterId, t)
        );
    }

    /// @dev Transfers (not mints) are refused while the character is busy.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && isBusy(tokenId)) revert CharacterBusy();
        return super._update(to, tokenId, auth);
    }
}
