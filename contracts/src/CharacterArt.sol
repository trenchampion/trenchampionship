// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {BattleEngine} from "./BattleEngine.sol";

/// @title CharacterArt
/// @notice ERC-721 metadata of a character: base64 JSON with the name, a description, the on-chain
///         portrait (base64 SVG rendered by CharacterPortrait) and the attributes. No randomness,
///         no external data.
/// @dev /engine/src/art.ts mirrors this byte for byte and the two are checked against shared
///      vectors (engine/vectors/art-vectors.json).
library CharacterArt {
    using Strings for uint256;

    /// @notice Element names in trait order.
    function elementName(uint8 e) internal pure returns (string memory) {
        if (e == 0) return "Fire";
        if (e == 1) return "Air";
        if (e == 2) return "Earth";
        if (e == 3) return "Water";
        return "Shadow";
    }

    /// @notice Special ability names in trait order.
    function specialName(uint8 s) internal pure returns (string memory) {
        if (s == 1) return "First Strike";
        if (s == 2) return "Armor";
        if (s == 3) return "Endurance";
        if (s == 4) return "Adaptation";
        if (s == 5) return "Pressure";
        if (s == 6) return "Finisher";
        if (s == 7) return "Counterstrike";
        if (s == 8) return "Balance";
        return "None";
    }

    /// @dev Escapes backslash, double quote and control characters for a JSON string.
    function _json(string memory s) private pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length * 6);
        uint256 n;
        for (uint256 i; i < b.length; i++) {
            bytes1 c = b[i];
            if (c == '"' || c == "\\") {
                out[n++] = "\\";
                out[n++] = c;
            } else if (uint8(c) < 0x20) {
                bytes memory hexd = "0123456789abcdef";
                out[n++] = "\\";
                out[n++] = "u";
                out[n++] = "0";
                out[n++] = "0";
                out[n++] = hexd[uint8(c) >> 4];
                out[n++] = hexd[uint8(c) & 0x0f];
            } else {
                out[n++] = c;
            }
        }
        assembly {
            mstore(out, n)
        }
        return string(out);
    }

    /// @notice ERC-721 token URI: base64 JSON with name, description, image (base64 SVG) and
    ///         attributes (the seven traits with max_value, the energy budget from BattleEngine, then
    ///         the portrait attributes).
    /// @param characterId The character id.
    /// @param t The character's traits.
    /// @param name The character token's name.
    /// @param svg The portrait SVG (CharacterPortrait.svg).
    /// @param portraitAttributes Comma-prefixed JSON attribute objects (CharacterPortrait.attributes).
    function tokenURI(
        uint256 characterId,
        BattleEngine.Traits memory t,
        string memory name,
        string memory svg,
        string memory portraitAttributes
    ) internal pure returns (string memory) {
        string memory json = string.concat(
            '{"name":"',
            _json(name),
            '","description":"Trenchampionship character #',
            characterId.toString(),
            ": ",
            elementName(t.element),
            ", "
        );
        json = string.concat(
            json,
            specialName(t.special),
            ", weak to ",
            elementName(t.weakness),
            ". Strength ",
            uint256(t.strength).toString(),
            ", Defense "
        );
        json = string.concat(
            json,
            uint256(t.defense).toString(),
            ", Speed ",
            uint256(t.speed).toString(),
            ", Focus ",
            uint256(t.focus).toString(),
            '.","image":"data:image/svg+xml;base64,'
        );
        json = string.concat(
            json,
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Strength","value":',
            uint256(t.strength).toString(),
            ',"max_value":15},{"trait_type":"Defense","value":',
            uint256(t.defense).toString(),
            ',"max_value":15},{"trait_type":"Speed","value":'
        );
        json = string.concat(
            json,
            uint256(t.speed).toString(),
            ',"max_value":15},{"trait_type":"Focus","value":',
            uint256(t.focus).toString(),
            ',"max_value":15},{"trait_type":"Element","value":"',
            elementName(t.element),
            '"},{"trait_type":"Special","value":"'
        );
        json = string.concat(
            json,
            specialName(t.special),
            '"},{"trait_type":"Weakness","value":"',
            elementName(t.weakness),
            '"},{"trait_type":"Energy","display_type":"number","value":',
            uint256(BattleEngine.energyBudget(t)).toString(),
            "}"
        );
        json = string.concat(json, portraitAttributes, "]}");
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}
