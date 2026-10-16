// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Reports whether a character holds a season license deposit (Rating). ControllerNFT refuses
///         to retire a licensed character so the refundable deposit can never be stranded.
interface ILicenseLock {
    function licensed(uint256 characterId) external view returns (bool);
}
