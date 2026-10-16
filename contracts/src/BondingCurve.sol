// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title BondingCurve
/// @notice Constant-product math with a virtual quote reserve, shared by LaunchPool (ETH/TL)
///         and CharacterPool (TL/character token).
/// @dev `q` is the quote side including the virtual reserve, `t` the token reserve. Every function
///      rounds in favour of the pool, so k = q * t never decreases across buys and sells.
library BondingCurve {
    error InsufficientReserve();

    /// @notice Tokens received for `amountIn` of quote. out = t * in / (q + in)  (== t - k/(q+in)).
    function tokensOut(uint256 q, uint256 t, uint256 amountIn) internal pure returns (uint256) {
        return Math.mulDiv(t, amountIn, q + amountIn);
    }

    /// @notice Quote received for `tokensIn`. out = q * tokensIn / (t + tokensIn)  (== q - k/(t+in)).
    function quoteOut(uint256 q, uint256 t, uint256 tokensIn) internal pure returns (uint256) {
        return Math.mulDiv(q, tokensIn, t + tokensIn);
    }

    /// @notice Quote required to receive exactly `tokensWanted`, rounded up.
    function quoteIn(uint256 q, uint256 t, uint256 tokensWanted) internal pure returns (uint256) {
        if (tokensWanted >= t) revert InsufficientReserve();
        return Math.mulDiv(q, tokensWanted, t - tokensWanted, Math.Rounding.Ceil);
    }

    /// @notice Spot price in quote per token, scaled by 1e18.
    function spotPrice(uint256 q, uint256 t) internal pure returns (uint256) {
        return Math.mulDiv(q, 1e18, t);
    }
}
