// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PortraitPart} from "./PortraitPart.sol";
import {IPortraitPart, PortraitTypes} from "./PortraitTypes.sol";

/// @title PortraitBase
/// @notice First section of the portrait: gradient and pattern definitions, the background and
///         the rare aura. Mirrors defs/background/aura of engine/src/vectorart.ts byte for byte.
/// @dev Every string.concat takes at most seven arguments (legacy code generator stack limit).
contract PortraitBase is PortraitPart, IPortraitPart {
    /// @inheritdoc IPortraitPart
    function render(PortraitTypes.Ctx calldata c) external pure returns (string memory) {
        return string.concat(_defs(c), _background(c), c.aura ? _aura(c) : "");
    }

    // ------------------------------------------------------------------ defs

    function _metal(uint8 m) private pure returns (string memory, string memory, string memory) {
        if (m == 0) return ("#d5dae2", "#8d96a3", "#3f4652");
        return ("#f1d27a", "#b8872c", "#5c3f12");
    }

    function _texture(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.e == 0) {
            return string.concat(
                '<pattern id="tx" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="6" cy="8" r="2" fill="',
                c.p.a,
                '"/><circle cx="20" cy="20" r="1.5" fill="',
                c.p.glow,
                '"/></pattern>'
            );
        }
        if (c.e == 1) {
            return string.concat(
                '<pattern id="tx" width="20" height="16" patternUnits="userSpaceOnUse"><path d="M0 14 Q5 6 10 14 M10 14 Q15 6 20 14" fill="none" stroke="',
                c.s2,
                '" stroke-width="1.6"/></pattern>'
            );
        }
        if (c.e == 2) {
            return string.concat(
                '<pattern id="tx" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M2 10 L14 16 L10 30 M26 4 L30 18 L38 24" fill="none" stroke="',
                c.s2,
                '" stroke-width="2.2" stroke-linecap="round"/></pattern>'
            );
        }
        if (c.e == 3) {
            return string.concat(
                '<pattern id="tx" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 11 A11 11 0 0 1 22 11 M-11 22 A11 11 0 0 1 11 22 M11 22 A11 11 0 0 1 33 22" fill="none" stroke="',
                c.s2,
                '" stroke-width="1.8"/></pattern>'
            );
        }
        return string.concat(
            '<pattern id="tx" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M4 22 L22 4" stroke="',
            c.s2,
            '" stroke-width="1.4"/></pattern>'
        );
    }

    function _defs(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        (string memory m0, string memory m1, string memory m2) = _metal(c.metal);
        string memory s = string.concat(
            '<defs><radialGradient id="bg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="',
            c.p.bg,
            '"/><stop offset="1" stop-color="',
            c.p.bg2,
            '"/></radialGradient><linearGradient id="mt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="',
            m0
        );
        s = string.concat(
            s,
            '"/><stop offset="0.55" stop-color="',
            m1,
            '"/><stop offset="1" stop-color="',
            m2,
            '"/></linearGradient><radialGradient id="gl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="',
            c.p.glow
        );
        s = string.concat(
            s,
            '" stop-opacity="0.8"/><stop offset="1" stop-color="',
            c.p.glow,
            '" stop-opacity="0"/></radialGradient><pattern id="ch" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="5" fill="none" stroke="',
            m1,
            '" stroke-width="2"/><circle cx="0" cy="0" r="5" fill="none" stroke="',
            m2
        );
        return string.concat(
            s,
            '" stroke-width="2"/></pattern>',
            _texture(c),
            '<clipPath id="hc"><path d="',
            c.head,
            '"/></clipPath><clipPath id="rc"><rect x="300" y="0" width="212" height="512"/></clipPath></defs>'
        );
    }

    // ------------------------------------------------------------------ background

    function _stars(PortraitTypes.Ctx calldata c) private pure returns (string memory s) {
        for (uint256 i; i < 16; i++) {
            uint256 x = (uint256(uint8(c.seed[9 + i])) * 2) % 512;
            uint256 y = (uint256(uint8(c.seed[(23 + i) % 32])) * 2) % 420;
            s = string.concat(s, '<circle cx="', _u(x), '" cy="', _u(y), '" r="');
            s = string.concat(
                s, _u(1 + uint256(uint8(c.seed[(i * 5) % 32])) % 3), '" fill="', c.p.ring, '" fill-opacity="0.4"/>'
            );
        }
    }

    function _scene(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.background == 0) {
            return string.concat(
                '<circle cx="256" cy="236" r="200" fill="none" stroke="',
                c.p.ring,
                '" stroke-opacity="0.10" stroke-width="22"/><circle cx="256" cy="236" r="156" fill="none" stroke="',
                c.p.ring,
                '" stroke-opacity="0.07" stroke-width="8"/>'
            );
        }
        if (c.background == 1) {
            return string.concat(
                '<path d="M0 512 L512 0 L512 110 L110 512 Z M0 290 L290 0 L360 0 L0 360 Z" fill="',
                c.p.ring,
                '" fill-opacity="0.07"/>'
            );
        }
        if (c.background == 2) return _stars(c);
        if (c.background == 3) {
            // ruins: broken columns and an arch fragment, a faint moon behind
            return string.concat(
                '<circle cx="396" cy="118" r="54" fill="',
                c.p.ring,
                '" fill-opacity="0.12"/><path d="M30 440 L30 150 L44 128 L78 136 L82 440 Z M118 440 L116 212 L150 196 L154 440 Z M402 440 L400 176 L436 164 L448 236 L444 440 Z M470 440 L468 90 L496 96 L500 440 Z" fill="#000" fill-opacity="0.32"/><path d="M78 136 L78 150 L44 142 Z M154 196 L150 212 L116 212 Z" fill="',
                c.p.ring,
                '" fill-opacity="0.12"/><path d="M330 440 L330 300 C330 230 400 230 400 300 L400 320 L380 320 L380 300 C380 254 350 254 350 300 L350 440 Z" fill="#000" fill-opacity="0.28"/><path d="M0 440 L512 440 L512 512 L0 512 Z" fill="#000" fill-opacity="0.25"/>'
            );
        }
        if (c.background == 4) {
            // cave: stalactites, a stalagmite cluster and a light pool on the floor
            return string.concat(
                '<path d="M0 0 L512 0 L512 70 L490 150 L468 72 L440 120 L420 60 L392 164 L366 70 L340 104 L318 50 L296 110 L270 56 L244 130 L220 62 L196 100 L170 54 L146 148 L120 70 L96 108 L70 60 L44 140 L20 76 L0 100 Z" fill="#000" fill-opacity="0.42"/><path d="M20 440 L40 360 L58 440 Z M66 440 L84 330 L102 440 Z M420 440 L436 350 L452 440 Z M462 440 L476 390 L490 440 Z" fill="#000" fill-opacity="0.35"/><ellipse cx="256" cy="430" rx="190" ry="36" fill="',
                c.p.ring,
                '" fill-opacity="0.10"/><path d="M300 0 L318 50 L330 0 Z M468 0 L490 150 L500 0 Z" fill="',
                c.p.ring,
                '" fill-opacity="0.10"/>'
            );
        }
        // battlefield: a low sun, spears and banners on the horizon, smoke
        return string.concat(
            '<circle cx="120" cy="150" r="70" fill="',
            c.p.ring,
            '" fill-opacity="0.14"/><path d="M0 346 L512 346 L512 512 L0 512 Z" fill="#000" fill-opacity="0.3"/><path d="M30 346 L34 180 L38 346 Z M34 182 L74 196 L34 212 Z M60 346 L62 230 L64 346 Z M90 346 L93 200 L96 346 Z M93 202 L120 220 L93 236 Z M410 346 L412 170 L414 346 Z M412 172 L380 190 L412 206 Z M444 346 L446 240 L448 346 Z M478 346 L481 196 L484 346 Z M481 198 L508 214 L481 230 Z M462 346 L464 260 L466 346 Z" fill="#000" fill-opacity="0.4"/><path d="M150 346 C170 300 220 300 250 330 C280 290 340 300 360 346 Z" fill="',
            c.p.ring,
            '" fill-opacity="0.06"/>'
        );
    }

    function _background(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        return string.concat(
            '<rect width="512" height="512" fill="url(#bg)"/>',
            _scene(c),
            '<rect width="512" height="512" fill="url(#bg)" fill-opacity="0.35"/><rect y="440" width="512" height="72" fill="#000" fill-opacity="0.3"/>'
        );
    }

    /// @dev Rare aura: a halo in the element glow behind the bust.
    function _aura(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s = string.concat(
            '<path d="M40 512 C52 418 140 376 256 372 C372 376 460 418 472 512 Z" fill="none" stroke="',
            c.p.glow,
            '" stroke-opacity="0.22" stroke-width="34"/><path d="',
            c.head,
            '" fill="none" stroke="',
            c.p.glow
        );
        return string.concat(
            s,
            '" stroke-opacity="0.18" stroke-width="46"/><path d="',
            c.head,
            '" fill="none" stroke="',
            c.p.glow,
            '" stroke-opacity="0.45" stroke-width="18"/>'
        );
    }
}
