// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Implemented by MatchManager and Tournament so ControllerNFT can refuse transfers of
///         a character that is currently engaged.
interface IActivityLock {
    function isBusy(uint256 characterId) external view returns (bool);
}
