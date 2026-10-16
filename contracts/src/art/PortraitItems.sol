// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PortraitPart} from "./PortraitPart.sol";
import {IPortraitPart, PortraitTypes} from "./PortraitTypes.sol";

/// @title PortraitItems
/// @notice Fourth section of the portrait, first half of the items: the staff (no special), the
///         dagger, the shield, the potion and the orb, two designs each chosen by the id. Empty
///         for the other specials (PortraitArms). Mirrors item of engine/src/vectorart.ts.
/// @dev Every string.concat takes at most seven arguments (legacy code generator stack limit).
contract PortraitItems is PortraitPart, IPortraitPart {
    /// @inheritdoc IPortraitPart
    function render(PortraitTypes.Ctx calldata c) external pure returns (string memory) {
        uint8 s = c.special;
        if (s == 1) return _dagger(c);
        if (s == 2) return _shield(c);
        if (s == 3) return _potion(c);
        if (s == 4) return _orb(c);
        if (s >= 5 && s <= 8) return "";
        return _staff(c);
    }

    /// @dev Leather grip with three accent wraps and a pommel: `M{grip}" ... M{wraps}" ... cx="{px}"`.
    function _grip(PortraitTypes.Ctx calldata c, string memory grip, string memory wraps, string memory pommel)
        private
        pure
        returns (string memory)
    {
        string memory s = string.concat(
            '<path d="', grip, '" stroke="', _leather(), '" stroke-width="14" stroke-linecap="round"/>'
        );
        s = string.concat(s, '<path d="', wraps, '" stroke="', c.p.a, '" stroke-width="3"/>');
        return
            string.concat(
                s, '<circle cx="', pommel, '" cy="378" r="8" fill="', c.p.a, '" ', string.concat(_thin(3), "/>")
            );
    }

    /// @dev First Strike: a dagger, or a wavy kris.
    function _dagger(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s;
        if (c.itemStyle == 1) {
            s = string.concat(
                '<path d="M488 136 C468 168 500 196 478 226 C460 254 490 282 466 310 L450 304 C470 276 440 252 458 224 C476 196 448 170 466 142 Z" fill="url(#mt)" ',
                _thin(5),
                '/><path d="M484 142 C470 168 492 194 476 220" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/><path d="M432 300 L470 314 L464 334 L426 320 Z" fill="',
                c.p.ab,
                '" ',
                _thin(5),
                "/>"
            );
            return string.concat(
                s, _grip(c, "M442 326 L430 372", "M438 334 L446 338 M434 348 L442 352 M430 362 L438 366", "428")
            );
        }
        s = string.concat(
            '<path d="M490 146 L430 300 L446 306 L502 156 Z" fill="url(#mt)" ',
            _thin(5),
            '/><path d="M490 146 L502 156 L474 232 Z" fill="#fff" fill-opacity="0.4"/><path d="M486 160 L446 262" stroke="#120d16" stroke-opacity="0.35" stroke-width="3"/><path d="M418 296 L460 312 L452 334 L410 318 Z" fill="',
            c.p.ab,
            '" ',
            _thin(5),
            "/>"
        );
        return
            string.concat(
                s, _grip(c, "M426 326 L412 372", "M424 338 L430 340 M420 350 L426 352 M416 362 L422 364", "410")
            );
    }

    /// @dev Armor: a kite shield with a star, or a round shield with a boss.
    function _shield(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s;
        if (c.itemStyle == 1) {
            s = string.concat(
                '<circle cx="432" cy="266" r="68" fill="url(#mt)" ',
                _stroke(),
                '/><circle cx="432" cy="266" r="52" fill="',
                c.p.a,
                '"/><circle cx="432" cy="266" r="52" fill="none" stroke="',
                c.p.ab,
                '" stroke-width="6"/><path d="M432 214 L432 318 M380 266 L484 266" stroke="'
            );
            return string.concat(
                s,
                c.p.ab,
                '" stroke-width="6"/><circle cx="432" cy="266" r="16" fill="url(#mt)" ',
                _thin(4),
                '/><circle cx="432" cy="206" r="4" fill="#120d16"/><circle cx="432" cy="326" r="4" fill="#120d16"/><circle cx="372" cy="266" r="4" fill="#120d16"/><circle cx="492" cy="266" r="4" fill="#120d16"/><path d="M392 226 C410 208 440 204 466 214" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="6"/>'
            );
        }
        s = string.concat(
            '<path d="M462 170 C500 190 506 260 484 318 C470 350 450 366 430 376 C410 366 390 350 376 318 C354 260 360 190 398 170 C420 160 440 160 462 170 Z" fill="url(#mt)" ',
            _stroke(),
            '/><path d="M430 196 L446 236 L488 240 L456 266 L466 306 L430 284 L394 306 L404 266 L372 240 L414 236 Z" fill="',
            c.p.a,
            '"/><circle cx="430" cy="260" r="12" fill="',
            c.p.ab
        );
        return string.concat(
            s,
            '"/><path d="M398 170 C380 200 376 260 392 318" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="6"/><circle cx="430" cy="178" r="4" fill="#120d16"/><circle cx="476" cy="200" r="4" fill="#120d16"/><circle cx="384" cy="200" r="4" fill="#120d16"/><circle cx="482" cy="300" r="4" fill="#120d16"/><circle cx="378" cy="300" r="4" fill="#120d16"/>'
        );
    }

    /// @dev Endurance: a round flask, or a tall corked vial on a strap.
    function _potion(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s;
        if (c.itemStyle == 1) {
            s = string.concat(
                '<path d="M404 176 L460 176 L460 304 C460 342 404 342 404 304 Z" fill="',
                c.p.glow,
                '" fill-opacity="0.85" ',
                _stroke(),
                '/><path d="M410 236 L454 236 L454 304 C454 334 410 334 410 304 Z" fill="',
                c.p.iris,
                '"/><path d="M412 240 C424 250 440 250 452 240 L452 254 C440 262 424 262 412 254 Z" fill="#fff" fill-opacity="0.25"/><circle cx="422" cy="292" r="4" fill="#fff" fill-opacity="0.5"/><circle cx="440" cy="310" r="3" fill="#fff" fill-opacity="0.5"/><circle cx="430" cy="270" r="2.5" fill="#fff" fill-opacity="0.5"/><rect x="412" y="150" width="40" height="30" rx="6" fill="'
            );
            return string.concat(
                s,
                _leather(),
                '" ',
                _thin(4),
                '/><path d="M404 200 L460 200 M404 212 L460 212" stroke="',
                _leather(),
                '" stroke-width="5"/><ellipse cx="414" cy="290" rx="6" ry="30" fill="#fff" fill-opacity="0.35"/>'
            );
        }
        s = string.concat(
            '<path d="M410 190 L450 190 L450 230 C480 250 494 290 494 330 C494 372 464 392 430 392 C396 392 366 372 366 330 C366 290 380 250 410 230 Z" fill="',
            c.p.glow,
            '" fill-opacity="0.85" ',
            _stroke(),
            '/><path d="M374 330 C374 300 390 270 420 252 L440 252 C470 270 486 300 486 330 C486 362 464 380 430 380 C396 380 374 362 374 330 Z" fill="',
            c.p.iris
        );
        return string.concat(
            s,
            '"/><path d="M380 300 C400 290 460 290 480 300 C470 320 390 320 380 300 Z" fill="#fff" fill-opacity="0.25"/><circle cx="412" cy="340" r="5" fill="#fff" fill-opacity="0.5"/><circle cx="446" cy="356" r="4" fill="#fff" fill-opacity="0.5"/><circle cx="430" cy="322" r="3" fill="#fff" fill-opacity="0.5"/><rect x="404" y="176" width="52" height="22" rx="8" fill="url(#mt)" ',
            _thin(5),
            '/><ellipse cx="400" cy="300" rx="10" ry="26" fill="#fff" fill-opacity="0.4"/>'
        );
    }

    /// @dev Adaptation: an orb on a stand, or a floating orb with orbit rings.
    function _orb(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s;
        if (c.itemStyle == 1) {
            s = string.concat(
                '<circle cx="432" cy="250" r="78" fill="url(#gl)"/><ellipse cx="432" cy="250" rx="80" ry="22" fill="none" stroke="',
                c.p.a,
                '" stroke-width="5" stroke-opacity="0.8"/><circle cx="432" cy="250" r="48" fill="',
                c.p.glow,
                '" ',
                _stroke(),
                '/><path d="M398 232 C420 212 448 220 464 246 C444 234 416 240 398 232 Z" fill="'
            );
            s = string.concat(
                s,
                c.p.a,
                '"/><path d="M402 272 C424 288 450 280 462 260 C450 288 420 296 402 272 Z" fill="',
                c.p.ab,
                '"/><circle cx="414" cy="232" r="9" fill="#fff" fill-opacity="0.8"/><ellipse cx="432" cy="250" rx="80" ry="22" fill="none" stroke="',
                c.p.a,
                '" stroke-width="5" stroke-opacity="0.8" stroke-dasharray="120 140"/><circle cx="356" cy="246" r="5" fill="'
            );
            return string.concat(
                s,
                c.p.glow,
                '"/><circle cx="508" cy="254" r="5" fill="',
                c.p.glow,
                '"/><path d="M432 320 L432 336 M416 328 L448 328" stroke="',
                c.p.glow,
                '" stroke-width="4" stroke-linecap="round"/>'
            );
        }
        s = string.concat(
            '<circle cx="432" cy="262" r="70" fill="url(#gl)"/><circle cx="432" cy="262" r="52" fill="',
            c.p.glow,
            '" ',
            _stroke(),
            '/><path d="M396 240 C420 220 450 230 468 258 C446 246 416 252 396 240 Z" fill="',
            c.p.a,
            '"/><path d="M400 286 C424 302 452 294 466 272 C452 300 420 310 400 286 Z" fill="'
        );
        s = string.concat(
            s,
            c.p.ab,
            '"/><circle cx="412" cy="244" r="10" fill="#fff" fill-opacity="0.8"/><path d="M380 330 C400 320 464 320 484 330 L470 352 L394 352 Z" fill="',
            c.p.ab,
            '" ',
            _thin(5),
            '/><path d="M396 336 L468 336" stroke="'
        );
        return string.concat(
            s,
            c.p.a,
            '" stroke-width="3" stroke-opacity="0.7"/><path d="M372 196 L372 210 M365 203 L379 203 M496 220 L496 232 M490 226 L502 226" stroke="',
            c.p.glow,
            '" stroke-width="3" stroke-linecap="round"/>'
        );
    }

    /// @dev None: a plain staff, or a gnarled staff with a knot.
    function _staff(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.itemStyle == 1) {
            string memory s = string.concat(
                '<path d="M446 140 C430 180 450 220 436 260 C424 296 446 330 440 376" fill="none" stroke="#120d16" stroke-width="20" stroke-linecap="round"/><path d="M446 140 C430 180 450 220 436 260 C424 296 446 330 440 376" fill="none" stroke="',
                _leather(),
                '" stroke-width="13" stroke-linecap="round"/><path d="M444 150 C436 170 446 200 440 220" fill="none" stroke="#5a3a24" stroke-width="4" stroke-linecap="round"/><circle cx="448" cy="134" r="16" fill="#5a3a24" ',
                _thin(5)
            );
            return string.concat(
                s, '/><path d="M432 300 L446 304 M430 316 L444 320" stroke="', c.p.ab, '" stroke-width="4"/>'
            );
        }
        string memory t = string.concat(
            '<path d="M444 130 L436 380" stroke="#120d16" stroke-width="20" stroke-linecap="round"/><path d="M444 130 L436 380" stroke="',
            _leather(),
            '" stroke-width="13" stroke-linecap="round"/><path d="M441 140 L438 300" stroke="#5a3a24" stroke-width="4" stroke-linecap="round"/><path d="M448 122 L440 130 M436 320 L448 324 M435 340 L447 344 M434 360 L446 364" stroke="',
            c.p.ab
        );
        return string.concat(
            t,
            '" stroke-width="4" stroke-linecap="round"/><path d="M430 128 L458 128 L452 108 L436 108 Z" fill="url(#mt)" ',
            _thin(4),
            "/>"
        );
    }
}
