// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {PortraitTypes} from "./PortraitTypes.sol";

/// @title PortraitPart
/// @notice Helpers shared by the portrait rendering parts: number formatting and the common
///         outline attributes. Mirrors the helpers of engine/src/vectorart.ts.
abstract contract PortraitPart {
    /// @dev Unsigned coordinate.
    function _u(uint256 v) internal pure returns (string memory) {
        return Strings.toString(v);
    }

    /// @dev Signed coordinate (crests rise above the canvas).
    function _n(int256 v) internal pure returns (string memory) {
        return Strings.toStringSigned(v);
    }

    /// @dev The heavy outline (stroke width 7).
    function _stroke() internal pure returns (string memory) {
        return 'stroke="#120d16" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
    }

    /// @dev A thinner outline.
    function _thin(uint256 w) internal pure returns (string memory) {
        return
            string.concat('stroke="#120d16" stroke-width="', _u(w), '" stroke-linejoin="round" stroke-linecap="round"');
    }

    /// @dev Leather colour of grips, straps and caps.
    function _leather() internal pure returns (string memory) {
        return "#2a1710";
    }
}
