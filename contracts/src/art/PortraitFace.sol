// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PortraitPart} from "./PortraitPart.sol";
import {IPortraitPart, PortraitTypes} from "./PortraitTypes.sol";

/// @title PortraitFace
/// @notice Second section of the portrait: headgear, armour, eyes with brows, nose and mouth,
///         face marks and accessories. Mirrors headgear/armor/eyes/mouth/marks/accessory of
///         engine/src/vectorart.ts byte for byte.
/// @dev Every string.concat takes at most seven arguments (legacy code generator stack limit).
contract PortraitFace is PortraitPart, IPortraitPart {
    string private constant GOLD = "#e2b94d";
    string private constant TEETH = "#efe9dc";

    /// @inheritdoc IPortraitPart
    function render(PortraitTypes.Ctx calldata c) external pure returns (string memory) {
        return string.concat(_headgear(c), _armor(c), _eyes(c), _mouth(c), _marks(c), _accessory(c));
    }

    // ------------------------------------------------------------------ headgear

    /// @dev Headgear from the variant, only without a helmet and not over a hood.
    function _headgear(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.defTier == 2 || c.e == 4) return "";
        if (c.headgear == 1) {
            // bandana with a knot
            string memory s = string.concat(
                '<path d="M156 150 C200 136 312 136 356 150 L352 176 C312 164 200 164 160 176 Z" fill="',
                c.p.cloth,
                '" ',
                _thin(5)
            );
            return string.concat(
                s, '/><path d="M352 160 L392 150 L380 184 L372 174 Z" fill="', c.p.cloth, '" ', _thin(4), "/>"
            );
        }
        if (c.headgear == 2) {
            // circlet
            return string.concat(
                '<path d="M156 152 C200 138 312 138 356 152 L354 166 C312 152 200 152 158 166 Z" fill="url(#mt)" ',
                _thin(4),
                '/><circle cx="256" cy="150" r="8" fill="',
                c.p.iris,
                '" ',
                _thin(3),
                "/>"
            );
        }
        if (c.headgear == 3) {
            // topknot
            string memory s =
                string.concat('<path d="M236 112 C236 84 276 84 276 112 Z" fill="', c.p.ab, '" ', _thin(5));
            return string.concat(
                s, '/><path d="M240 112 L272 112 L268 122 L244 122 Z" fill="', _leather(), '" ', _thin(4), "/>"
            );
        }
        if (c.headgear == 4) {
            // skull cap
            return string.concat(
                '<path d="M160 160 C166 112 206 94 256 94 C306 94 346 112 352 160 L340 164 C330 128 298 114 256 114 C214 114 182 128 172 164 Z" fill="',
                _leather(),
                '" ',
                _thin(5),
                '/><path d="M172 164 L340 164" stroke="',
                c.p.ab,
                '" stroke-width="5"/>'
            );
        }
        if (c.headgear == 5) {
            // feathered band
            string memory s = string.concat(
                '<path d="M156 150 C200 136 312 136 356 150 L352 176 C312 164 200 164 160 176 Z" fill="',
                c.p.cloth,
                '" ',
                _thin(5),
                '/><path d="M330 150 C352 110 382 92 404 96 C390 120 372 142 344 154 Z" fill="',
                c.p.a
            );
            return string.concat(
                s,
                '" ',
                _thin(4),
                '/><path d="M336 150 C356 126 376 108 396 100" fill="none" stroke="',
                c.p.ab,
                '" stroke-width="3"/>'
            );
        }
        return "";
    }

    // ------------------------------------------------------------------ armour

    /// @dev Armour from the defense tier: pauldrons and gorget, then a breastplate and a helmet
    ///      with cheek guards.
    function _armor(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.defTier == 0) return "";
        string memory s = string.concat(
            '<path d="M44 486 C44 404 110 378 196 390 C176 426 146 462 118 512 L42 512 Z" fill="url(#mt)" ',
            _stroke(),
            '/><path d="M468 486 C468 404 402 378 316 390 C336 426 366 462 394 512 L470 512 Z" fill="url(#mt)" ',
            _stroke()
        );
        s = string.concat(
            s,
            '/><path d="M60 470 L120 400 M72 492 L130 420" stroke="#120d16" stroke-opacity="0.35" stroke-width="5"/><path d="M452 470 L392 400 M440 492 L382 420" stroke="#120d16" stroke-opacity="0.35" stroke-width="5"/><path d="M196 390 C230 372 282 372 316 390 L302 424 C280 410 232 410 210 424 Z" fill="url(#mt)" ',
            _stroke(),
            "/>"
        );
        if (c.defTier == 1) return s;
        s = string.concat(
            s,
            '<path d="M140 512 C160 448 212 418 256 418 C300 418 352 448 372 512 Z" fill="url(#mt)" ',
            _stroke(),
            '/><path d="M256 432 L282 470 L256 508 L230 470 Z" fill="',
            c.p.iris,
            '" ',
            _thin(4)
        );
        // helmet: skull, brow ridge, cheek guards and a nasal, with the crest rising behind it
        s = string.concat(
            s,
            '/><path d="M150 200 C148 118 196 82 256 82 C316 82 364 118 362 200 L362 230 C352 238 342 236 338 226 L338 200 C338 150 300 122 256 122 C212 122 174 150 174 200 L174 226 C170 236 160 238 150 230 Z" fill="url(#mt)" ',
            _stroke(),
            '/><path d="M150 230 C150 280 160 310 184 330 L198 300 C186 282 182 258 182 236 Z M362 230 C362 280 352 310 328 330 L314 300 C326 282 330 258 330 236 Z" fill="url(#mt)" ',
            _stroke()
        );
        return string.concat(
            s,
            '/><path d="M138 192 L374 192 L380 212 L132 212 Z" fill="url(#mt)" ',
            _stroke(),
            '/><path d="M244 212 L268 212 L264 272 L248 272 Z" fill="url(#mt)" ',
            _thin(5),
            string.concat('/><path d="M256 122 L256 82" stroke="', c.p.iris, '" stroke-width="6"/>')
        );
    }

    // ------------------------------------------------------------------ eyes

    function _open(PortraitTypes.Ctx calldata c) private pure returns (uint256) {
        return c.focTier == 0 ? 6 : c.focTier == 1 ? 11 : 15;
    }

    function _ir(PortraitTypes.Ctx calldata c) private pure returns (uint256) {
        return c.focTier == 0 ? 7 : c.focTier == 1 ? 9 : 11;
    }

    function _eyeWhite(PortraitTypes.Ctx calldata c, uint256 cx, string memory white)
        private
        pure
        returns (string memory)
    {
        uint256 open = _open(c);
        string memory s;
        if (c.eye == 0) {
            s = string.concat('<path d="M', _u(cx - 26), " 216 C", _u(cx - 14), " ", _u(212 - open), " ");
            s = string.concat(s, _u(cx + 10), " ", _u(210 - open), " ", _u(cx + 26), " 212 C");
            s = string.concat(s, _u(cx + 14), " ", _u(216 + open), " ", _u(cx - 10), " ", _u(216 + open));
            s = string.concat(s, " ", _u(cx - 26), ' 216 Z" fill="', white, '" ', _thin(5), "/>");
            return s;
        }
        if (c.eye == 1) {
            s = string.concat('<ellipse cx="', _u(cx), '" cy="216" rx="', _u(20 + uint256(c.focTier) * 2), '" ry="');
            return string.concat(s, _u(open + 4), '" fill="', white, '" ', _thin(5), "/>");
        }
        s = string.concat('<path d="M', _u(cx - 30), " 214 C", _u(cx - 10), " ", _u(212 - (open * 6) / 10), " ");
        s = string.concat(s, _u(cx + 10), " ", _u(212 - (open * 6) / 10), " ", _u(cx + 30), " 212 C");
        s = string.concat(
            s, _u(cx + 10), " ", _u(216 + (open * 7) / 10), " ", _u(cx - 10), " ", _u(216 + (open * 7) / 10)
        );
        return string.concat(s, " ", _u(cx - 30), ' 214 Z" fill="', white, '" ', _thin(5), "/>");
    }

    function _eye(PortraitTypes.Ctx calldata c, uint256 cx, string memory white, string memory irisColor)
        private
        pure
        returns (string memory s)
    {
        if (c.focTier == 2 || c.e == 4 || c.goldEyes) {
            s = string.concat('<circle cx="', _u(cx), '" cy="216" r="40" fill="url(#gl)"/>');
        }
        s = string.concat(s, _eyeWhite(c, cx, white));
        if (c.goldEyes) {
            s = string.concat(s, '<circle cx="', _u(cx + 4), '" cy="216" r="', _u(_ir(c) + 3), '" fill="');
            s = string.concat(s, GOLD, '" fill-opacity="0.45"/>');
        }
        s = string.concat(s, '<circle cx="', _u(cx + 4), '" cy="216" r="', _u(_ir(c)), '" fill="');
        s = string.concat(s, irisColor, '"/>');
        if (c.e == 0 || c.e == 4) {
            s = string.concat(
                s, '<ellipse cx="', _u(cx + 4), '" cy="216" rx="2.5" ry="', _u(_ir(c) - 1), '" fill="#120d16"/>'
            );
        } else {
            s = string.concat(
                s, '<circle cx="', _u(cx + 4), '" cy="216" r="', _u((_ir(c) + 1) / 2), '" fill="#120d16"/>'
            );
        }
        s = string.concat(s, '<circle cx="', _u(cx - 1), '" cy="211" r="2.5" fill="#fff"/>');
    }

    function _brows(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        uint256 tilt = 4 + uint256(c.focTier) * 5;
        string memory s;
        if (c.brows == 0) {
            s = string.concat('<path d="M186 ', _u(182 + tilt), " C204 174 230 176 248 ", _u(192 - tilt));
            s = string.concat(
                s,
                '" fill="none" stroke="#120d16" stroke-width="11" stroke-linecap="round"/><path d="M326 ',
                _u(182 + tilt),
                " C308 174 282 176 264 ",
                _u(192 - tilt)
            );
            return string.concat(s, '" fill="none" stroke="#120d16" stroke-width="11" stroke-linecap="round"/>');
        }
        if (c.brows == 1) {
            s = string.concat('<path d="M184 ', _u(180 + tilt), " L250 ", _u(188 - tilt));
            s = string.concat(
                s,
                '" stroke="#120d16" stroke-width="14" stroke-linecap="round"/><path d="M328 ',
                _u(180 + tilt),
                " L262 ",
                _u(188 - tilt)
            );
            return string.concat(s, '" stroke="#120d16" stroke-width="14" stroke-linecap="round"/>');
        }
        s = string.concat('<path d="M184 ', _u(180 + tilt), " L212 184 M226 186 L250 ", _u(190 - tilt));
        s = string.concat(
            s,
            '" stroke="#120d16" stroke-width="13" stroke-linecap="round"/><path d="M328 ',
            _u(180 + tilt),
            " L262 ",
            _u(190 - tilt)
        );
        return string.concat(s, '" stroke="#120d16" stroke-width="13" stroke-linecap="round"/>');
    }

    /// @dev Eyes: shape from the variant, openness from focus, slit pupils for Fire and Shadow,
    ///      rare gold eyes; then the eye patch or monocle, then the brows.
    function _eyes(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory white = c.e == 4 ? "#1a1024" : c.e == 0 ? "#fff3e0" : "#f4f6fa";
        string memory irisColor = c.goldEyes ? GOLD : c.iris == 0 ? c.p.iris : c.p.glow;
        string memory s = _eye(c, 220, white, irisColor);
        if (c.accessory != 2) s = string.concat(s, _eye(c, 292, white, irisColor));
        if (c.accessory == 2) {
            s = string.concat(
                s,
                '<path d="M150 160 C200 184 280 190 362 176" fill="none" stroke="#120d16" stroke-width="7"/><path d="M262 198 C280 190 310 190 326 198 L322 236 C306 244 282 244 266 236 Z" fill="#1a1024" ',
                _thin(5),
                "/>"
            );
        }
        if (c.accessory == 3) {
            s = string.concat(
                s,
                '<circle cx="292" cy="216" r="30" fill="none" stroke="',
                GOLD,
                '" stroke-width="6"/><path d="M318 236 C330 256 334 290 324 318" fill="none" stroke="',
                GOLD,
                '" stroke-width="4"/>'
            );
        }
        return string.concat(s, _brows(c));
    }

    // ------------------------------------------------------------------ mouth

    function _teethSnarl(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.e == 3) {
            return string.concat(
                '<path d="M222 298 L230 310 L236 298 L244 310 L250 298 L258 310 L264 298 L272 309 L278 296 L286 306 L292 294" fill="none" stroke="',
                TEETH,
                '" stroke-width="3"/>'
            );
        }
        if (c.e == 4) {
            return string.concat(
                '<path d="M224 298 L232 311 L240 297 L252 312 L262 296 L272 310 L282 294 L292 304" fill="none" stroke="',
                TEETH,
                '" stroke-width="3.5"/>'
            );
        }
        return string.concat('<path d="M220 298 L296 290 L292 300 L224 306 Z" fill="', TEETH, '"/>');
    }

    function _teethRoar(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.e == 3) {
            return string.concat(
                '<path d="M212 290 L220 316 L228 290 L236 312 L244 290 L252 312 L260 290 L268 312 L276 290 L284 314 L292 290 L300 310" fill="none" stroke="',
                TEETH,
                '" stroke-width="3"/>'
            );
        }
        return string.concat(
            '<path d="M212 290 L226 290 L219 318 Z M300 290 L286 290 L293 318 Z M240 292 L250 292 L246 306 Z M272 292 L262 292 L266 306 Z" fill="',
            TEETH,
            '"/>'
        );
    }

    /// @dev Nose and mouth: the shape from strength, the teeth from the species.
    function _mouth(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s = "";
        if (c.e != 1) {
            s = string.concat(
                '<path d="M246 250 L240 268 L256 274 M266 250 L272 268 L256 274" fill="none" stroke="',
                c.s2,
                '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
            );
        }
        if (c.strTier == 0) {
            // grim, closed; a lower-lip shadow
            s = string.concat(
                s,
                '<path d="M226 300 C244 296 268 296 286 302" fill="none" stroke="#120d16" stroke-width="7" stroke-linecap="round"/><path d="M226 300 L222 292 M286 302 L290 294" stroke="#120d16" stroke-width="6" stroke-linecap="round"/><path d="M236 310 C250 316 264 316 278 310" fill="none" stroke="',
                c.s2,
                '" stroke-width="5" stroke-linecap="round"/>'
            );
            if (c.e == 2) {
                // tusks
                s = string.concat(
                    s,
                    '<path d="M228 300 L236 284 L242 302 Z M284 302 L276 284 L270 304 Z" fill="',
                    TEETH,
                    '" ',
                    _thin(3),
                    "/>"
                );
            }
            return s;
        }
        if (c.strTier == 1) {
            // snarl: one corner raised, upper teeth bared
            s = string.concat(
                s,
                '<path d="M212 296 C236 306 276 304 304 288 C294 310 236 318 212 296 Z" fill="#1a0a0e" ',
                _thin(5),
                "/>",
                _teethSnarl(c)
            );
            return string.concat(
                s,
                '<path d="M216 312 C240 320 276 318 302 304" fill="none" stroke="',
                c.s2,
                '" stroke-width="4" stroke-linecap="round"/>'
            );
        }
        // roar: open, fangs, tongue
        s = string.concat(
            s,
            '<path d="M204 286 C232 322 280 322 308 286 C286 300 226 300 204 286 Z" fill="#1a0a0e" ',
            _thin(5),
            "/>",
            _teethRoar(c)
        );
        return string.concat(
            s,
            '<path d="M236 312 C248 320 264 320 276 312" fill="none" stroke="#c2304a" stroke-width="5" stroke-linecap="round"/><path d="M206 300 C230 330 282 330 306 300" fill="none" stroke="',
            c.s2,
            '" stroke-width="4" stroke-linecap="round"/>'
        );
    }

    // ------------------------------------------------------------------ marks and accessories

    function _freckle(string memory x, string memory y, string memory fill) private pure returns (string memory) {
        return string.concat('<circle cx="', x, '" cy="', y, '" r="3.5" fill="', fill, '"/>');
    }

    function _marks(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.marks == 1) {
            // scar over the left cheek
            return string.concat(
                '<path d="M178 236 L200 290 M180 258 L196 250 M188 278 L204 270" fill="none" stroke="',
                c.s2,
                '" stroke-width="5" stroke-linecap="round"/><path d="M178 236 L200 290" stroke="#f4b7a0" stroke-opacity="0.35" stroke-width="3"/>'
            );
        }
        if (c.marks == 2) {
            // freckles
            string memory s =
                string.concat(_freckle("186", "256", c.s2), _freckle("200", "250", c.s2), _freckle("194", "270", c.s2));
            return
                string.concat(
                    s, _freckle("318", "254", c.s2), _freckle("308", "268", c.s2), _freckle("326", "272", c.s2)
                );
        }
        if (c.marks == 3) {
            // war paint: bars across both cheeks
            return string.concat(
                '<path d="M176 246 L232 246 M280 246 L336 246 M182 262 L222 262 M290 262 L330 262" stroke="',
                c.p.a,
                '" stroke-width="9" stroke-linecap="round" stroke-opacity="0.85"/>'
            );
        }
        if (c.marks == 4) {
            // cracks
            return string.concat(
                '<path d="M174 230 L190 254 L180 282 M338 226 L322 250 L332 280 M296 140 L306 162 L296 184" fill="none" stroke="',
                c.s2,
                '" stroke-width="4" stroke-linecap="round"/>'
            );
        }
        if (c.marks == 5) {
            // war paint: three claw slashes under the left eye, one on the right cheek
            return string.concat(
                '<path d="M186 244 L206 284 M200 240 L220 280 M214 238 L234 278 M318 250 L300 286" stroke="',
                c.p.a,
                '" stroke-width="7" stroke-linecap="round" stroke-opacity="0.85"/>'
            );
        }
        if (c.marks == 6) {
            // war paint: chin stripe, brow dots and temple bars
            string memory s = string.concat(
                '<path d="M256 318 L256 338" stroke="',
                c.p.a,
                '" stroke-width="10" stroke-linecap="round" stroke-opacity="0.85"/><circle cx="208" cy="164" r="6" fill="',
                c.p.a,
                '" fill-opacity="0.85"/><circle cx="304" cy="164" r="6" fill="',
                c.p.a
            );
            return string.concat(
                s,
                '" fill-opacity="0.85"/><path d="M164 196 L184 196 M164 212 L184 212 M328 196 L348 196 M328 212 L348 212" stroke="',
                c.p.a,
                '" stroke-width="6" stroke-linecap="round" stroke-opacity="0.85"/>'
            );
        }
        return "";
    }

    function _accessory(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.accessory == 1 && c.e != 4) {
            return string.concat(
                '<circle cx="',
                c.e == 0 ? "150" : "140",
                '" cy="276" r="11" fill="none" stroke="',
                GOLD,
                '" stroke-width="6"/>'
            );
        }
        if (c.accessory == 4) {
            return string.concat(
                '<path d="M196 300 L316 300 L326 336 C290 352 222 352 186 336 Z" fill="',
                c.p.cloth2,
                '" ',
                _thin(5),
                '/><path d="M200 306 C230 300 282 300 312 306" fill="none" stroke="',
                c.p.a,
                '" stroke-opacity="0.6" stroke-width="4"/>'
            );
        }
        if (c.accessory == 5) {
            return string.concat(
                '<path d="M298 140 C330 150 332 196 302 206 C326 194 326 160 298 140 Z M318 214 C340 228 334 256 312 262 C330 250 330 230 318 214 Z" fill="',
                c.p.a,
                '" fill-opacity="0.85"/>'
            );
        }
        return "";
    }
}
