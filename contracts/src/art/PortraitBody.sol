// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PortraitPart} from "./PortraitPart.sol";
import {IPortraitPart, PortraitTypes} from "./PortraitTypes.sol";

/// @title PortraitBody
/// @notice Second section of the portrait: the species crest and the body (shoulders, outfit,
///         neck, ears, head with cel shading and texture, species extras). Mirrors crest/body of
///         engine/src/vectorart.ts byte for byte.
/// @dev Every string.concat takes at most seven arguments (legacy code generator stack limit).
contract PortraitBody is PortraitPart, IPortraitPart {
    /// @inheritdoc IPortraitPart
    function render(PortraitTypes.Ctx calldata c) external pure returns (string memory) {
        return string.concat(_crest(c), _body(c));
    }

    // ------------------------------------------------------------------ crest

    function _crestFire(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        int256 h = c.spdTier == 0 ? int256(40) : c.spdTier == 1 ? int256(80) : int256(120);
        string memory a = string.concat(_n(110 - h / 2), " 160 ", _n(70 - h), " 192 ", _n(64 - h));
        string memory b = string.concat(_n(96 - (h * 6) / 10), " 190 ", _n(112 - (h * 3) / 10));
        string memory s = string.concat('<path d="M186 120 C150 ', a, " C176 ", b, ' 222 108 Z" fill="', c.p.ab);
        s = string.concat(s, '" ', _stroke(), "/>");
        a = string.concat(_n(110 - h / 2), " 352 ", _n(70 - h), " 320 ", _n(64 - h));
        b = string.concat(_n(96 - (h * 6) / 10), " 322 ", _n(112 - (h * 3) / 10));
        s = string.concat(s, '<path d="M326 120 C362 ', a, " C336 ", b, ' 290 108 Z" fill="', c.p.ab);
        return string.concat(
            s,
            '" ',
            _stroke(),
            '/><path d="M196 100 C236 76 276 76 316 100 L316 110 C276 92 236 92 196 110 Z" fill="',
            c.p.a,
            '" fill-opacity="0.7"/>'
        );
    }

    function _feather(PortraitTypes.Ctx calldata c, uint256 row, uint256 i) private pure returns (string memory) {
        uint256 dx = 12 + i * 15 + row * 8;
        uint256 len = 56 + uint256(c.spdTier) * 26 + row * 10 - i * 8;
        string memory d = string.concat("M", _u(228 + i * 10), " ", _u(112 - row * 8), " C", _u(244 + dx));
        d = string.concat(
            d, " ", _u(80 - uint256(c.spdTier) * 8 - row * 10), " ", _u(274 + dx + len / 2), " ", _u(58 - row * 8)
        );
        d = string.concat(d, " ", _u(284 + dx + len), " ", _u(68 + i * 14 - row * 6), " C", _u(284 + dx + len / 2));
        d = string.concat(d, " ", _u(88 + i * 14 - row * 6), " ", _u(264 + dx), " ", _u(114 - row * 8));
        d = string.concat(d, " ", _u(228 + i * 10), " ", _u(130 - row * 8), " Z");
        return string.concat(
            '<path d="', d, '" fill="', row == 1 ? c.p.ab : (i % 2 == 0 ? c.p.a : c.p.ab), '" ', _stroke(), "/>"
        );
    }

    function _crestAir(PortraitTypes.Ctx calldata c) private pure returns (string memory s) {
        uint256 n = 3 + c.spdTier;
        // two rows of feathers, the back row darker
        for (uint256 i; i < n; i++) {
            s = string.concat(s, _feather(c, 1, i));
        }
        for (uint256 i; i < n; i++) {
            s = string.concat(s, _feather(c, 0, i));
        }
    }

    function _crestEarth(PortraitTypes.Ctx calldata c) private pure returns (string memory s) {
        uint256 n = 2 + c.spdTier;
        uint256 big = c.spdTier == 0 ? 34 : c.spdTier == 1 ? 56 : 80;
        for (uint256 i; i < n + 1; i++) {
            uint256 x = 180 + (i * 152) / n;
            uint256 h = i % 2 == 0 ? big : (big * 7) / 10;
            s = string.concat(s, '<path d="M', _u(x - 26), " 120 L", _u(x), " ", _u(116 - h));
            s = string.concat(s, " L", _u(x + 26), ' 120 Z" fill="', c.p.ab, '" ', _stroke(), "/>");
        }
    }

    function _crestWater(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        int256 h = c.spdTier == 0 ? int256(56) : c.spdTier == 1 ? int256(96) : int256(136);
        string memory s =
            string.concat('<path d="M204 120 C218 ', _n(114 - h), " 294 ", _n(114 - h), ' 308 120 Z" fill="', c.p.a);
        s = string.concat(s, '" ', _stroke(), '/><path d="M228 116 C240 ', _n(112 - h / 2), " 272 ", _n(112 - h / 2));
        return string.concat(s, ' 284 116" fill="none" stroke="', c.p.ab, '" stroke-width="5"/>');
    }

    function _crestShadow(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        int256 h = c.spdTier == 0 ? int256(40) : c.spdTier == 1 ? int256(84) : int256(128);
        string memory a = string.concat(_n(124 - (h * 6) / 10), " 142 ", _n(94 - h), " 164 ", _n(88 - h));
        string memory b = string.concat(_n(114 - (h * 7) / 10), " 176 ", _n(118 - (h * 4) / 10));
        string memory s = string.concat('<path d="M170 130 C140 ', a, " C160 ", b, ' 206 118 Z" fill="#1a1024" ');
        s = string.concat(s, _stroke(), "/>");
        a = string.concat(_n(124 - (h * 6) / 10), " 370 ", _n(94 - h), " 348 ", _n(88 - h));
        b = string.concat(_n(114 - (h * 7) / 10), " 336 ", _n(118 - (h * 4) / 10));
        s = string.concat(s, '<path d="M342 130 C372 ', a, " C352 ", b, ' 306 118 Z" fill="#1a1024" ');
        return string.concat(s, _stroke(), "/>");
    }

    /// @dev Crest from the species and the speed tier.
    function _crest(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.e == 0) return _crestFire(c);
        if (c.e == 1) return _crestAir(c);
        if (c.e == 2) return _crestEarth(c);
        if (c.e == 3) return _crestWater(c);
        return _crestShadow(c);
    }

    // ------------------------------------------------------------------ body

    function _fur() private pure returns (string memory d) {
        for (uint256 i; i < 14; i++) {
            uint256 x = 60 + i * 30;
            uint256 y = 440 - (i < 7 ? 13 - 2 * i : 2 * i - 13) * 5;
            d = string.concat(d, "M", _u(x), " ", _u(y + 40), " C", _u(x + 4));
            d = string.concat(d, " ", _u(y + 10), " ", _u(x + 10), " ", _u(y - 4));
            d = string.concat(d, " ", _u(x + 15), " ", _u(y - 14), " C", _u(x + 20));
            d = string.concat(d, " ", _u(y - 2), " ", _u(x + 26), " ", _u(y + 10));
            d = string.concat(d, " ", _u(x + 30), " ", _u(y + 40), " ");
        }
    }

    function _outfit(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.outfit == 1) {
            // leather harness
            return string.concat(
                '<path d="M150 392 L330 512 L296 512 L130 400 Z M362 392 L182 512 L216 512 L382 400 Z" fill="',
                _leather(),
                '" ',
                _thin(5),
                '/><path d="M232 440 L280 440 L282 468 L230 468 Z" fill="url(#mt)" ',
                _thin(5),
                "/>"
            );
        }
        if (c.outfit == 2) {
            // cloak with a glowing trim and a clasp
            string memory s = string.concat(
                '<path d="M40 512 C48 420 130 380 256 376 C382 380 464 420 472 512 Z" fill="',
                c.p.cloth,
                '" ',
                _stroke(),
                '/><path d="M256 376 C382 380 464 420 472 512 L300 512 C300 450 284 404 256 376 Z" fill="',
                c.p.cloth2
            );
            return string.concat(
                s,
                '"/><path d="M56 480 C100 410 180 384 256 382 C332 384 412 410 456 480" fill="none" stroke="',
                c.p.glow,
                '" stroke-opacity="0.55" stroke-width="8" stroke-linecap="round"/><circle cx="256" cy="404" r="12" fill="url(#mt)" ',
                _thin(4),
                "/>"
            );
        }
        if (c.outfit == 3) {
            // chainmail
            return string.concat(
                '<path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="#3a3f48" ',
                _stroke(),
                '/><path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="url(#ch)" fill-opacity="0.7"/><path d="M196 380 C230 366 282 366 316 380 L306 404 C282 394 230 394 206 404 Z" fill="',
                _leather(),
                '" ',
                _thin(5),
                "/>"
            );
        }
        if (c.outfit == 4) {
            // fur collar
            string memory s = string.concat('<path d="', _fur(), '" fill="', c.p.cloth2, '" ', _thin(5));
            return string.concat(
                s,
                '/><path d="M40 512 C60 470 140 452 256 450 C372 452 452 470 472 512 Z" fill="',
                c.p.cloth,
                '" ',
                _thin(5),
                "/>"
            );
        }
        if (c.outfit == 5) {
            // bandolier with pouches
            return string.concat(
                '<path d="M150 392 L330 512 L296 512 L130 400 Z" fill="',
                _leather(),
                '" ',
                _thin(5),
                '/><path d="M196 426 L222 426 L224 452 L198 452 Z M236 452 L262 452 L264 478 L238 478 Z M276 480 L302 480 L304 506 L278 506 Z" fill="',
                c.p.ab,
                string.concat('" ', _thin(4), "/>")
            );
        }
        return string.concat(
            '<path d="M92 470 L124 420 M112 480 L136 442" stroke="', c.s2, '" stroke-width="5" stroke-linecap="round"/>'
        );
    }

    /// @dev Ear scale in twentieths (0.8, 1, 1.25) applied around the centre line, rounded half up.
    function _w(uint256 x, uint256 k) private pure returns (string memory) {
        if (x >= 256) return _u(256 + ((x - 256) * k + 10) / 20);
        return _u(256 - ((256 - x) * k + 10) / 20);
    }

    function _mk(uint256 v, uint256 k) private pure returns (uint256) {
        return (v * k + 10) / 20;
    }

    function _earsFire(PortraitTypes.Ctx calldata c, uint256 k) private pure returns (string memory) {
        string memory y = _u(230 - _mk(90, k));
        string memory s = string.concat('<path d="M', _w(160, k), " 230 L", _w(104, k), " ", y, " L");
        s = string.concat(s, _w(172, k), ' 190 Z" fill="', c.s1, '" ', _stroke(), '/><path d="M');
        s = string.concat(s, _w(352, k), " 230 L", _w(408, k), " ", y, " L");
        return string.concat(s, _w(340, k), ' 190 Z" fill="', c.s1, '" ', _stroke(), "/>");
    }

    function _earsAir(PortraitTypes.Ctx calldata c, uint256 k) private pure returns (string memory) {
        string memory s = string.concat('<path d="M168 226 C', _w(126, k), " 206 ", _w(110, k), " 250 ", _w(132, k));
        s = string.concat(s, ' 288 C150 270 162 266 170 272 Z" fill="', c.s0, '" ', _stroke(), "/>");
        s = string.concat(s, '<path d="M344 226 C', _w(386, k), " 206 ", _w(402, k), " 250 ", _w(380, k));
        return string.concat(s, ' 288 C362 270 350 266 342 272 Z" fill="', c.s0, '" ', _stroke(), "/>");
    }

    function _earsEarth(PortraitTypes.Ctx calldata c, uint256 k) private pure returns (string memory) {
        string memory s = string.concat('<path d="M150 220 C', _w(118, k), " 214 ", _w(110, k), " 258 ", _w(130, k));
        s = string.concat(s, ' 282 C146 268 156 264 164 268 Z" fill="', c.s1, '" ', _stroke(), "/>");
        s = string.concat(s, '<path d="M362 220 C', _w(394, k), " 214 ", _w(402, k), " 258 ", _w(382, k));
        return string.concat(s, ' 282 C366 268 356 264 348 268 Z" fill="', c.s1, '" ', _stroke(), "/>");
    }

    function _earsWater(PortraitTypes.Ctx calldata c, uint256 k) private pure returns (string memory) {
        string memory y = _u(236 - _mk(70, k));
        string memory s = string.concat('<path d="M160 196 C', _w(104, k), " ", y, " ", _w(84, k), " 236 ");
        s = string.concat(s, _w(112, k), ' 286 C132 256 150 254 164 264 Z" fill="', c.p.a, '" ', _stroke(), "/>");
        s = string.concat(s, '<path d="M352 196 C', _w(408, k), " ", y, " ", _w(428, k), " 236 ");
        s = string.concat(s, _w(400, k), ' 286 C380 256 362 254 348 264 Z" fill="', c.p.a, '" ', _stroke(), "/>");
        return string.concat(
            s,
            '<path d="M118 250 C128 262 138 268 150 270 M394 250 C384 262 374 268 362 270" fill="none" stroke="',
            c.p.ab,
            '" stroke-width="4"/>'
        );
    }

    function _ears(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        uint256 k = c.ears == 0 ? 16 : c.ears == 1 ? 20 : 25;
        if (c.e == 0) return _earsFire(c, k);
        if (c.e == 1) return _earsAir(c, k);
        if (c.e == 2) return _earsEarth(c, k);
        if (c.e == 3) return _earsWater(c, k);
        return "";
    }

    /// @dev Species extras drawn over the head: Fire embers, the Air beak, the Earth brow plate and
    ///      moss, Water gills, the Shadow hood.
    function _extras(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.e == 0) {
            return string.concat(
                '<path d="M282 130 L300 166 L286 198 M312 150 L326 182 L316 208" fill="none" stroke="',
                c.p.a,
                '" stroke-opacity="0.7" stroke-width="5" stroke-linecap="round"/>'
            );
        }
        if (c.e == 1) {
            return string.concat(
                '<path d="M240 232 C256 228 272 234 282 248 L270 274 C262 262 250 256 240 254 Z" fill="',
                c.p.ab,
                '" ',
                _thin(5),
                '/><path d="M244 236 C256 234 266 238 274 248" fill="none" stroke="',
                c.p.a,
                '" stroke-width="4"/>'
            );
        }
        if (c.e == 2) {
            return string.concat(
                '<path d="M160 206 C210 190 302 190 352 206 L348 222 C302 208 210 208 164 222 Z" fill="',
                c.s2,
                '" ',
                _thin(5),
                '/><circle cx="206" cy="116" r="12" fill="',
                c.p.a,
                string.concat('"/><circle cx="318" cy="112" r="8" fill="', c.p.a, '"/>')
            );
        }
        if (c.e == 3) {
            return string.concat(
                '<path d="M206 344 L206 374 M226 346 L226 378 M286 346 L286 378 M306 344 L306 374" fill="none" stroke="',
                c.p.ab,
                '" stroke-width="5" stroke-linecap="round"/>'
            );
        }
        return string.concat(
            '<path d="M256 70 C356 70 398 158 392 262 C388 332 356 380 336 404 L176 404 C156 380 124 332 120 262 C114 158 156 70 256 70 Z M256 112 C196 112 170 166 172 232 C174 286 202 326 256 328 C310 326 338 286 340 232 C342 166 316 112 256 112 Z" fill-rule="evenodd" fill="',
            c.p.ab,
            '" ',
            _stroke(),
            '/><path d="M256 112 C196 112 170 166 172 232 C174 286 202 326 256 328 C310 326 338 286 340 232 C342 166 316 112 256 112 Z" fill="#000" fill-opacity="0.18"/><path d="M256 70 C356 70 398 158 392 262 C388 332 356 380 336 404 L300 404 C330 360 352 300 350 236 C348 170 318 112 256 112 Z" fill="#000" fill-opacity="0.3"/><path d="M186 262 C200 250 214 250 228 262 M284 262 C298 250 312 250 326 262" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="8" stroke-linecap="round"/>'
        );
    }

    /// @dev Head with cel shading and the species texture, clipped to the outline.
    function _head(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s = string.concat('<path d="', c.head, '" fill="', c.s1, '" ', _stroke());
        s = string.concat(
            s,
            '/><g clip-path="url(#hc)"><path d="',
            c.head,
            '" fill="url(#tx)" fill-opacity="',
            c.e == 4 ? "0.25" : "0.45",
            '"/><path d="M300 70 L420 70 L420 370 L262 370 C290 352 302 326 300 296 C298 276 282 262 276 246 C268 222 282 180 300 70 Z" fill="',
            c.s2
        );
        s = string.concat(
            s,
            '" fill-opacity="0.5"/><path d="M232 236 C248 262 256 262 264 262 L268 274 L256 282 Z" fill="',
            c.s2,
            '" fill-opacity="0.35"/><path d="M168 130 C200 110 240 108 262 118 C230 132 206 150 190 176 Z" fill="',
            c.s0,
            '" fill-opacity="0.6"/><path d="M176 238 L240 238 L204 266 Z" fill="',
            c.s0
        );
        return string.concat(
            s,
            '" fill-opacity="0.35"/><g clip-path="url(#rc)"><path d="',
            c.head,
            '" fill="none" stroke="',
            c.p.glow,
            '" stroke-opacity="0.6" stroke-width="14"/></g></g>'
        );
    }

    /// @dev Shoulders, outfit, neck, ears, head with cel shading and texture, species extras.
    function _body(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s = string.concat(
            '<path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="',
            c.s1,
            '" ',
            _stroke(),
            '/><path d="M330 380 C400 392 452 430 466 512 L340 512 C346 460 340 420 330 380 Z" fill="',
            c.s2
        );
        s = string.concat(
            s,
            '" fill-opacity="0.4"/><path d="M60 500 C80 440 130 404 190 392" fill="none" stroke="',
            c.s0,
            '" stroke-opacity="0.3" stroke-width="10" stroke-linecap="round"/>',
            c.defTier == 0 ? _outfit(c) : ""
        );
        // neck
        s = string.concat(
            s,
            '<path d="M214 300 L298 300 L306 384 L206 384 Z" fill="',
            c.s2,
            '" ',
            _stroke(),
            '/><path d="M230 306 L278 306 L282 380 L226 380 Z" fill="',
            c.s1
        );
        return string.concat(s, '"/>', _ears(c), _head(c), _extras(c));
    }
}
