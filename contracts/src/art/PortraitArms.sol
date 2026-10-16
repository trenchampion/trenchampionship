// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PortraitPart} from "./PortraitPart.sol";
import {IPortraitPart, PortraitTypes} from "./PortraitTypes.sol";

/// @title PortraitArms
/// @notice Fourth section of the portrait, second half of the items: the mace, the greatsword,
///         the hooks and the scales, two designs each chosen by the id. Empty for the other
///         specials (PortraitItems). Mirrors item of engine/src/vectorart.ts.
/// @dev Every string.concat takes at most seven arguments (legacy code generator stack limit).
contract PortraitArms is PortraitPart, IPortraitPart {
    /// @dev Eight spikes around (432,206), precomputed from cos/sin once so both sides share one literal.
    string private constant SPIKES =
        "M472 206 L500 206 L466 218 Z M460 234 L480 254 L447 239 Z M432 246 L432 274 L420 240 Z M404 234 L384 254 L399 221 Z M392 206 L364 206 L398 194 Z M404 178 L384 158 L417 173 Z M432 166 L432 138 L444 172 Z M460 178 L480 158 L465 191 Z";

    /// @inheritdoc IPortraitPart
    function render(PortraitTypes.Ctx calldata c) external pure returns (string memory) {
        uint8 s = c.special;
        if (s == 5) return _mace(c);
        if (s == 6) return _sword(c);
        if (s == 7) return _hook(c);
        if (s == 8) return _scales(c);
        return "";
    }

    /// @dev Mace handle: leather shaft, three accent wraps, a crossguard.
    function _maceHandle(PortraitTypes.Ctx calldata c, string memory shaft, string memory wraps)
        private
        pure
        returns (string memory)
    {
        string memory s = string.concat(
            '<path d="', shaft, '" stroke="', _leather(), '" stroke-width="16" stroke-linecap="round"/>'
        );
        s = string.concat(s, '<path d="', wraps, '" stroke="', c.p.ab, '" stroke-width="4"/>');
        return string.concat(
            s, '<path d="M414 376 L458 376" stroke="', c.p.ab, '" stroke-width="14" stroke-linecap="round"/>'
        );
    }

    /// @dev Pressure: a spiked ball mace, or a flanged mace.
    function _mace(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s;
        if (c.itemStyle == 1) {
            s = string.concat(
                '<path d="M418 150 L446 150 L446 258 L418 258 Z" fill="url(#mt)" ',
                _stroke(),
                '/><path d="M418 160 L392 176 L392 236 L418 250 Z M446 160 L472 176 L472 236 L446 250 Z" fill="url(#mt)" ',
                _stroke(),
                '/><path d="M432 136 L432 150 M432 258 L432 272" stroke="#120d16" stroke-width="8" stroke-linecap="round"/><path d="M424 158 L424 250" stroke="#fff" stroke-opacity="0.4" stroke-width="4"/><path d="M398 182 L398 230" stroke="#fff" stroke-opacity="0.3" stroke-width="3"/>'
            );
            return string.concat(
                s, _maceHandle(c, "M432 272 L436 380", "M430 296 L440 300 M430 316 L440 320 M431 336 L441 340")
            );
        }
        s = string.concat(
            '<path d="',
            SPIKES,
            '" fill="url(#mt)" ',
            _thin(4),
            '/><circle cx="432" cy="206" r="42" fill="url(#mt)" ',
            _stroke(),
            '/><circle cx="420" cy="194" r="10" fill="#fff" fill-opacity="0.4"/><path d="M400 206 A32 32 0 0 0 432 238" fill="none" stroke="#120d16" stroke-opacity="0.3" stroke-width="5"/>'
        );
        return
            string.concat(
                s, _maceHandle(c, "M440 248 L436 380", "M434 280 L444 284 M433 300 L443 304 M432 320 L442 324")
            );
    }

    /// @dev Sword hilt: crossguard, leather grip with wraps, a pommel gem.
    function _hilt(PortraitTypes.Ctx calldata c, string memory guard) private pure returns (string memory) {
        string memory s = string.concat('<path d="', guard, '" fill="', c.p.ab, '" ', _thin(5), "/>");
        s = string.concat(
            s,
            '<path d="M450 348 L468 348 L466 422 L452 422 Z" fill="',
            _leather(),
            '" ',
            _thin(5),
            '/><path d="M452 362 L466 364 M452 376 L466 378 M452 390 L466 392" stroke="',
            c.p.ab
        );
        return
            string.concat(s, '" stroke-width="3"/><circle cx="459" cy="432" r="12" fill="', c.p.a, '" ', _thin(5), "/>");
    }

    /// @dev Finisher: a greatsword, or a cleaver with a curved back.
    function _sword(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        if (c.itemStyle == 1) {
            string memory s = string.concat(
                '<path d="M438 96 C486 118 496 240 476 332 L440 332 Z" fill="url(#mt)" ',
                _stroke(),
                '/><path d="M444 110 C480 140 488 240 472 322" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="4"/><path d="M448 140 L450 320" stroke="#120d16" stroke-opacity="0.3" stroke-width="3"/><circle cx="462" cy="180" r="5" fill="#120d16"/><circle cx="466" cy="260" r="5" fill="#120d16"/>'
            );
            return string.concat(s, _hilt(c, "M414 332 L504 332 L504 348 L414 348 Z"));
        }
        string memory t = string.concat(
            '<path d="M440 92 L478 92 L474 332 L444 332 Z" fill="url(#mt)" ',
            _stroke(),
            '/><path d="M452 98 L460 98 L458 324 L452 324 Z" fill="#fff" fill-opacity="0.55"/><path d="M440 92 L459 70 L478 92 Z" fill="url(#mt)" ',
            _thin(5),
            "/>"
        );
        return string.concat(t, _hilt(c, "M400 332 L518 332 L518 348 L400 348 Z"));
    }

    /// @dev Counterstrike: a sickle, or twin hooks on a chain.
    function _hook(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s;
        if (c.itemStyle == 1) {
            s = string.concat(
                '<path d="M370 150 C412 140 436 176 422 220 L404 212 C412 184 400 166 372 166 Z M368 150 L378 136 L384 156 Z" fill="url(#mt)" ',
                _thin(5),
                '/><path d="M380 156 C402 156 416 176 412 200" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/><path d="M510 132 C468 122 444 158 458 202 L476 194 C468 166 480 148 508 148 Z M512 132 L502 118 L496 138 Z" fill="url(#mt)" ',
                _thin(5),
                '/><path d="M500 138 C478 138 464 158 468 182" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/><path d="M412 216 C404 250 410 290 430 316 M468 198 C480 240 472 280 450 308" fill="none" stroke="#120d16" stroke-width="10" stroke-linecap="round"/><path d="M412 216 C404 250 410 290 430 316 M468 198 C480 240 472 280 450 308" fill="none" stroke="',
                c.p.ab,
                '" stroke-width="6" stroke-linecap="round" stroke-dasharray="8 8"/><circle cx="440" cy="330" r="14" fill="url(#mt)" '
            );
            return string.concat(
                s,
                _thin(4),
                '/><path d="M440 344 L442 380" stroke="',
                _leather(),
                '" stroke-width="14" stroke-linecap="round"/>'
            );
        }
        s = string.concat(
            '<path d="M400 160 C460 150 500 200 492 262 C486 300 460 320 440 320 C470 300 478 250 460 214 C446 186 420 174 392 176 Z" fill="url(#mt)" ',
            _thin(5),
            '/><path d="M392 176 C410 174 430 180 444 194" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="5"/><path d="M474 230 C478 262 466 290 448 306" fill="none" stroke="#120d16" stroke-opacity="0.35" stroke-width="3"/><path d="M430 316 L452 316 L456 370 L428 370 Z" fill="',
            c.p.ab,
            '" ',
            _thin(5),
            '/><path d="M434 330 L450 332 M434 344 L450 346 M434 358 L450 360" stroke="'
        );
        s = string.concat(
            s,
            _leather(),
            '" stroke-width="3"/><path d="M436 370 L448 370 L446 412 L438 412 Z" fill="',
            _leather(),
            '" ',
            _thin(5),
            '/><circle cx="442" cy="418" r="7" fill="'
        );
        return string.concat(s, c.p.a, '" ', _thin(3), "/>");
    }

    /// @dev Balance: hand scales, or scales on a stand.
    function _scales(PortraitTypes.Ctx calldata c) private pure returns (string memory) {
        string memory s;
        if (c.itemStyle == 1) {
            s = string.concat(
                '<path d="M396 400 L476 400 L488 420 L384 420 Z" fill="',
                c.p.ab,
                '" ',
                _thin(5),
                '/><path d="M436 150 L436 400" stroke="',
                _leather(),
                '" stroke-width="12" stroke-linecap="round"/><path d="M372 176 L500 176" stroke="'
            );
            s = string.concat(
                s,
                c.p.ab,
                '" stroke-width="10" stroke-linecap="round"/><path d="M372 176 L372 232 M500 176 L500 232" stroke="',
                c.p.ab,
                '" stroke-width="4" stroke-dasharray="6 5"/><path d="M344 232 C352 256 392 256 400 232 Z" fill="url(#mt)" ',
                _thin(5),
                '/><path d="M472 232 C480 256 520 256 528 232 Z" fill="url(#mt)" '
            );
            return string.concat(
                s,
                _thin(5),
                '/><path d="M420 150 L452 150 L436 128 Z" fill="',
                c.p.a,
                '" ',
                _thin(4),
                string.concat('/><circle cx="436" cy="176" r="9" fill="url(#mt)" ', _thin(4), "/>")
            );
        }
        s = string.concat(
            '<path d="M436 150 L436 360" stroke="',
            _leather(),
            '" stroke-width="12" stroke-linecap="round"/><path d="M372 176 L500 176" stroke="',
            c.p.ab,
            '" stroke-width="10" stroke-linecap="round"/><path d="M372 176 L372 232 M500 176 L500 232" stroke="',
            c.p.ab,
            '" stroke-width="6" stroke-linecap="round"/><path d="M344 232 C352 256 392 256 400 232 Z" fill="url(#mt)" '
        );
        s = string.concat(
            s,
            _thin(5),
            '/><path d="M472 232 C480 256 520 256 528 232 Z" fill="url(#mt)" ',
            _thin(5),
            '/><path d="M352 238 C360 250 384 250 392 238" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="3"/><path d="M396 360 L476 360 L484 380 L388 380 Z" fill="',
            c.p.ab,
            '" '
        );
        return string.concat(
            s,
            _thin(5),
            '/><circle cx="436" cy="142" r="12" fill="',
            c.p.a,
            '" ',
            _thin(5),
            string.concat('/><circle cx="436" cy="176" r="8" fill="url(#mt)" ', _thin(4), "/>")
        );
    }
}
