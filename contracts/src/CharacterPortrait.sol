// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {BattleEngine} from "./BattleEngine.sol";
import {ICharacterArt} from "./interfaces/ICharacterArt.sol";
import {IPortraitPart, PortraitTypes} from "./art/PortraitTypes.sol";

/// @title CharacterPortrait
/// @notice Deterministic on-chain portrait of a character (CharacterArt v2): a 512x512 cel-shaded
///         vector bust whose species, jaw, eyes, mouth, crest, armour, item and badge follow the
///         traits, and whose skin, marks, ears, accessory, background, outfit, brows, metal, iris,
///         headgear, eye shape, item design and two rare features (gold eyes, aura) follow the
///         keccak of the id. No randomness, no external data, no owner, no upgrade path.
/// @dev The five rendering parts are separate contracts (bytecode size) called with static calls;
///      no delegatecall. engine/src/vectorart.ts mirrors the whole image byte for byte and the two
///      are checked against shared vectors (engine/vectors/art-vectors.json).
contract CharacterPortrait is ICharacterArt {
    error ZeroAddress();

    IPortraitPart public immutable BASE;
    IPortraitPart public immutable BODY;
    IPortraitPart public immutable FACE;
    IPortraitPart public immutable ITEMS;
    IPortraitPart public immutable ARMS;

    /// @param parts The five rendering parts in order: base, body, face, items, arms.
    constructor(address[5] memory parts) {
        bool missing = false;
        for (uint256 i; i < 5; i++) {
            missing = missing || parts[i] == address(0);
        }
        if (missing) revert ZeroAddress();
        BASE = IPortraitPart(parts[0]);
        BODY = IPortraitPart(parts[1]);
        FACE = IPortraitPart(parts[2]);
        ITEMS = IPortraitPart(parts[3]);
        ARMS = IPortraitPart(parts[4]);
    }

    /// @inheritdoc ICharacterArt
    function svg(uint256 characterId, BattleEngine.Traits calldata t) external view returns (string memory) {
        PortraitTypes.Ctx memory c = _ctx(characterId, t);
        string memory s =
            string.concat('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">', BASE.render(c));
        s = string.concat(s, BODY.render(c));
        s = string.concat(s, FACE.render(c));
        // exactly one of the two item parts draws the special's item, the other returns ""
        s = string.concat(s, ITEMS.render(c), ARMS.render(c));
        return string.concat(s, _badge(c), "</svg>");
    }

    // ------------------------------------------------------------------ context

    function _el(uint8 i) private pure returns (uint8) {
        return i < 5 ? i : 4;
    }

    function _tier(uint8 v) private pure returns (uint8) {
        return v <= 9 ? 0 : v <= 12 ? 1 : 2;
    }

    /// @dev The fifteen id-hashed variants, one byte of the keccak each.
    function _variants(uint256 characterId) private pure returns (PortraitTypes.Ctx memory c) {
        bytes32 h = keccak256(abi.encodePacked(characterId));
        c.seed = h;
        c.skin = uint8(h[0]) % 3;
        c.marks = uint8(h[1]) % 7;
        c.ears = uint8(h[2]) % 3;
        c.accessory = uint8(h[3]) % 6;
        c.background = uint8(h[4]) % 6;
        c.outfit = uint8(h[5]) % 6;
        c.brows = uint8(h[6]) % 3;
        c.metal = uint8(h[7]) % 2;
        c.iris = uint8(h[8]) % 2;
        c.headgear = uint8(h[9]) % 6;
        c.eye = uint8(h[10]) % 3;
        c.itemStyle = uint8(h[11]) % 2;
        c.goldEyes = uint8(h[12]) % 16 == 0;
        c.aura = uint8(h[13]) % 16 == 0;
    }

    function _ctx(uint256 characterId, BattleEngine.Traits calldata t)
        private
        pure
        returns (PortraitTypes.Ctx memory c)
    {
        c = _variants(characterId);
        c.e = _el(t.element);
        c.special = t.special;
        c.weakness = _el(t.weakness);
        c.strTier = _tier(t.strength);
        c.defTier = _tier(t.defense);
        c.spdTier = _tier(t.speed);
        c.focTier = _tier(t.focus);
        c.p = _pal(c.e);
        (c.s0, c.s1, c.s2) = _skin(c.e, c.skin);
        PortraitTypes.Pal memory w = _pal(c.weakness);
        c.wa = w.a;
        c.wab = w.ab;
        c.head = _headPath(c.e, c.strTier);
    }

    // ------------------------------------------------------------------ palettes

    function _pal(uint8 e) private pure returns (PortraitTypes.Pal memory) {
        if (e == 0) {
            return PortraitTypes.Pal(
                "#3a0e08", "#120503", "#ff6a2a", "#ffb13a", "#c85a12", "#ffcf4a", "#ffd98a", "#4a1a12", "#24090a"
            );
        }
        if (e == 1) {
            return PortraitTypes.Pal(
                "#0d2638", "#040c14", "#79c9ff", "#6fc3f5", "#2f7fb8", "#49b6ff", "#d6f0ff", "#1f3d55", "#0f2030"
            );
        }
        if (e == 2) {
            return PortraitTypes.Pal(
                "#142a10", "#060e06", "#86c95e", "#8a5a2c", "#4e2f14", "#c4ef5e", "#d9f3a8", "#2f4420", "#172410"
            );
        }
        if (e == 3) {
            return PortraitTypes.Pal(
                "#071a3c", "#030a18", "#3f86ff", "#34d8c0", "#178f7f", "#78eeff", "#b8f4ff", "#17305e", "#0b1a34"
            );
        }
        return PortraitTypes.Pal(
            "#1c0f30", "#07040d", "#a46cff", "#a56dff", "#5a2fb8", "#ff4fd0", "#eadcff", "#2c1a4c", "#150c26"
        );
    }

    /// @dev Skin tones (light, base, shade): three per species.
    function _skin(uint8 e, uint8 i) private pure returns (string memory, string memory, string memory) {
        if (e == 0) {
            if (i == 0) return ("#f5996a", "#d9542a", "#8c2f14");
            if (i == 1) return ("#f7a67c", "#e2673a", "#9a3a1a");
            return ("#e58a62", "#b8401f", "#6e220f");
        }
        if (e == 1) {
            if (i == 0) return ("#f2fbff", "#cfe6f3", "#8fb3c9");
            if (i == 1) return ("#ecf6fc", "#bcd8e8", "#7a9fb8");
            return ("#f8fcff", "#dbeaf3", "#9ab8cb");
        }
        if (e == 2) {
            if (i == 0) return ("#9ccb7a", "#6fa14a", "#3f6a2a");
            if (i == 1) return ("#bfae78", "#8f7f4c", "#5a4e2a");
            return ("#8fbf66", "#5f8c3c", "#355a22");
        }
        if (e == 3) {
            if (i == 0) return ("#86b4ff", "#4b86f2", "#2a55b4");
            if (i == 1) return ("#78cbee", "#3a97cf", "#20608e");
            return ("#9aafff", "#5a78e0", "#2f49a3");
        }
        if (i == 0) return ("#8e6ed0", "#5c3f90", "#2c1c4c");
        if (i == 1) return ("#7a5aad", "#4d3570", "#22163a");
        return ("#9c7fd9", "#6a47a0", "#35245e");
    }

    // ------------------------------------------------------------------ head silhouettes

    function _u(uint256 v) private pure returns (string memory) {
        return Strings.toString(v);
    }

    /// @dev Head outline per species; `j` is the jaw tier (0 narrow, 1 regular, 2 heavy).
    function _headPath(uint8 e, uint8 j) private pure returns (string memory) {
        uint256 jx = 76 + uint256(j) * 14;
        uint256 cw = 30 + uint256(j) * 16;
        if (e == 0) {
            string memory s = string.concat(
                "M194 102 L318 102 C348 112 356 150 356 196 C356 236 ",
                _u(264 + jx),
                " 262 ",
                _u(256 + jx),
                " 288 C",
                _u(248 + jx)
            );
            s = string.concat(s, " 312 ", _u(262 + cw), " 332 256 342 C", _u(250 - cw), " 332 ", _u(264 - jx));
            return string.concat(
                s, " 312 ", _u(256 - jx), " 288 C", _u(248 - jx), " 262 156 236 156 196 C156 150 164 112 194 102 Z"
            );
        }
        if (e == 1) {
            string memory s = string.concat(
                "M256 90 C310 90 344 130 344 196 C344 240 ", _u(250 + jx), " 268 ", _u(246 + jx), " 294 C", _u(238 + jx)
            );
            s = string.concat(s, " 318 ", _u(256 + cw), " 338 256 346 C", _u(256 - cw), " 338 ", _u(274 - jx));
            return string.concat(
                s, " 318 ", _u(266 - jx), " 294 C", _u(262 - jx), " 268 168 240 168 196 C168 130 202 90 256 90 Z"
            );
        }
        if (e == 2) {
            string memory s = string.concat(
                "M164 104 L348 104 C366 110 370 160 368 206 C366 244 ",
                _u(278 + jx),
                " 270 ",
                _u(274 + jx),
                " 296 C",
                _u(266 + jx)
            );
            s = string.concat(s, " 318 ", _u(276 + cw), " 334 256 340 C", _u(236 - cw), " 334 ", _u(246 - jx));
            return string.concat(
                s, " 318 ", _u(238 - jx), " 296 C", _u(234 - jx), " 270 146 244 144 206 C142 160 146 110 164 104 Z"
            );
        }
        if (e == 3) {
            string memory s = string.concat(
                "M256 84 C326 84 354 136 354 200 C354 244 ", _u(256 + jx), " 272 ", _u(252 + jx), " 296 C", _u(244 + jx)
            );
            s = string.concat(s, " 322 ", _u(260 + cw), " 340 256 348 C", _u(252 - cw), " 340 ", _u(268 - jx));
            return string.concat(
                s, " 322 ", _u(260 - jx), " 296 C", _u(256 - jx), " 272 158 244 158 200 C158 136 186 84 256 84 Z"
            );
        }
        string memory d = string.concat(
            "M256 100 C320 100 350 140 350 200 C350 236 ", _u(242 + jx), " 250 ", _u(236 + jx), " 282 C", _u(232 + jx)
        );
        d = string.concat(d, " 312 ", _u(256 + cw), " 334 256 340 C", _u(256 - cw), " 334 ", _u(280 - jx));
        return string.concat(
            d, " 312 ", _u(276 - jx), " 282 C", _u(270 - jx), " 250 162 236 162 200 C162 140 192 100 256 100 Z"
        );
    }

    // ------------------------------------------------------------------ badge

    /// @dev Weakness badge, bottom left, in the colours of the element the character is weak to.
    function _badge(PortraitTypes.Ctx memory c) private pure returns (string memory) {
        string memory g;
        if (c.weakness == 0) {
            g = string.concat(
                '<path d="M60 408 C78 420 72 440 60 444 C50 440 44 428 52 418 C54 426 58 426 60 420 Z" fill="',
                c.wa,
                '"/>'
            );
        } else if (c.weakness == 1) {
            g = string.concat(
                '<path d="M42 418 L74 418 M46 428 L78 428 M50 438 L70 438" fill="none" stroke="',
                c.wa,
                '" stroke-width="5" stroke-linecap="round"/>'
            );
        } else if (c.weakness == 2) {
            g = string.concat(
                '<path d="M46 420 L74 420 L78 440 L42 440 Z" fill="',
                c.wab,
                '"/><path d="M50 420 L70 420 L72 430 L48 430 Z" fill="',
                c.wa,
                '"/>'
            );
        } else if (c.weakness == 3) {
            g = string.concat(
                '<path d="M42 422 C50 412 58 432 66 422 C72 414 76 426 78 422 M42 436 C50 426 58 446 66 436 C72 428 76 440 78 436" fill="none" stroke="',
                c.wa,
                '" stroke-width="5" stroke-linecap="round"/>'
            );
        } else {
            g = string.concat(
                '<path d="M66 412 C50 414 42 434 56 446 C44 440 44 418 66 412 Z" fill="',
                c.wa,
                '"/><circle cx="66" cy="444" r="4" fill="',
                c.wa,
                '"/>'
            );
        }
        return string.concat(
            '<circle cx="60" cy="428" r="34" fill="#100b14" fill-opacity="0.9" stroke="',
            c.wa,
            '" stroke-width="4"/>',
            g
        );
    }

    // ------------------------------------------------------------------ metadata attributes

    function _attr(string memory key, string memory value) private pure returns (string memory) {
        return string.concat(',{"trait_type":"', key, '","value":"', value, '"}');
    }

    function _pick3(uint8 i, string memory a, string memory b, string memory d) private pure returns (string memory) {
        return i == 0 ? a : i == 1 ? b : d;
    }

    function _marksName(uint8 m) private pure returns (string memory) {
        if (m == 1) return "Scar";
        if (m == 2) return "Freckles";
        if (m == 3) return "War Paint Bars";
        if (m == 4) return "Cracks";
        if (m == 5) return "War Paint Slashes";
        if (m == 6) return "War Paint Chin";
        return "None";
    }

    function _accessoryName(uint8 a, uint8 e) private pure returns (string memory) {
        if (a == 1) return e == 4 ? "None" : "Earring";
        if (a == 2) return "Eye Patch";
        if (a == 3) return "Monocle";
        if (a == 4) return "Bandana";
        if (a == 5) return "Tattoo";
        return "None";
    }

    function _headgearName(uint8 h, uint8 e, uint8 defTier) private pure returns (string memory) {
        if (defTier == 2) return "Helmet";
        if (e == 4) return "Hood";
        if (h == 1) return "Bandana";
        if (h == 2) return "Circlet";
        if (h == 3) return "Topknot";
        if (h == 4) return "Skull Cap";
        if (h == 5) return "Feathered Band";
        return "None";
    }

    function _outfitName(uint8 o, uint8 defTier) private pure returns (string memory) {
        if (defTier == 1) return "Pauldrons";
        if (defTier == 2) return "Full Plate";
        if (o == 1) return "Harness";
        if (o == 2) return "Cloak";
        if (o == 3) return "Chainmail";
        if (o == 4) return "Fur Collar";
        if (o == 5) return "Bandolier";
        return "Bare";
    }

    function _itemName(uint8 special, uint8 style) private pure returns (string memory) {
        bool alt = style == 1;
        if (special == 1) return alt ? "Kris" : "Dagger";
        if (special == 2) return alt ? "Round Shield" : "Kite Shield";
        if (special == 3) return alt ? "Vial" : "Flask";
        if (special == 4) return alt ? "Floating Orb" : "Orb";
        if (special == 5) return alt ? "Flanged Mace" : "Spiked Mace";
        if (special == 6) return alt ? "Cleaver" : "Greatsword";
        if (special == 7) return alt ? "Twin Hooks" : "Sickle";
        if (special == 8) return alt ? "Standing Scales" : "Scales";
        return alt ? "Gnarled Staff" : "Staff";
    }

    function _backgroundName(uint8 b) private pure returns (string memory) {
        if (b == 0) return "Rings";
        if (b == 1) return "Beams";
        if (b == 2) return "Stars";
        if (b == 3) return "Ruins";
        if (b == 4) return "Cave";
        return "Battlefield";
    }

    /// @inheritdoc ICharacterArt
    /// @dev JSON attribute objects, each prefixed with a comma, describing what the portrait shows
    ///      (so marketplaces can compute rarity). Mirrors characterAttributes in engine/src/art.ts.
    function attributes(uint256 characterId, BattleEngine.Traits calldata t) external pure returns (string memory) {
        PortraitTypes.Ctx memory c = _variants(characterId);
        c.e = _el(t.element);
        c.defTier = _tier(t.defense);
        string memory s = _attr("Skin", _pick3(c.skin, "Pale", "Warm", "Deep"));
        s = string.concat(s, _attr("Eye Shape", _pick3(c.eye, "Almond", "Round", "Narrow")));
        s = string.concat(s, _attr("Brows", _pick3(c.brows, "Arched", "Straight", "Split")));
        s = string.concat(s, _attr("Ears", _pick3(c.ears, "Small", "Regular", "Large")));
        s = string.concat(s, _attr("Marks", _marksName(c.marks)), _attr("Accessory", _accessoryName(c.accessory, c.e)));
        s = string.concat(s, _attr("Headgear", _headgearName(c.headgear, c.e, c.defTier)));
        s = string.concat(
            s, _attr("Outfit", _outfitName(c.outfit, c.defTier)), _attr("Metal", c.metal == 0 ? "Steel" : "Gold")
        );
        s = string.concat(s, _attr("Eyes", c.goldEyes ? "Gold" : c.iris == 0 ? "Bright" : "Pale"));
        s = string.concat(s, _attr("Item", _itemName(t.special, c.itemStyle)));
        return
            string.concat(
                s, _attr("Background", _backgroundName(c.background)), _attr("Aura", c.aura ? "Halo" : "None")
            );
    }
}
