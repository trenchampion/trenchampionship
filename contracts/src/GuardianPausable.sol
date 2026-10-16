// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Config} from "./Config.sol";

/// @title GuardianPausable
/// @notice The only privileged capability in the protocol: a guardian address may pause the
///         entry points marked `whenNotPaused` until DEPLOY_TIME + PAUSE_EXPIRY. Nothing else.
/// @dev Inheriting contracts must apply the modifier only to functions that create new
///      obligations (create, challenge, accept, stake). Claims, withdrawals, reveals and
///      timeouts are never pausable (see the design constraints in README.md).
abstract contract GuardianPausable {
    error NotGuardian();
    error GuardianExpired();
    error Paused();

    event PausedBy(address indexed guardian);
    event UnpausedBy(address indexed guardian);

    address public immutable GUARDIAN;
    uint256 public immutable DEPLOY_TIME;
    bool public paused;

    constructor(address guardian) {
        GUARDIAN = guardian;
        DEPLOY_TIME = block.timestamp;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier onlyGuardianActive() {
        if (msg.sender != GUARDIAN) revert NotGuardian();
        if (block.timestamp >= DEPLOY_TIME + Config.PAUSE_EXPIRY) revert GuardianExpired();
        _;
    }

    /// @notice Pause the pausable entry points. Reverts after the guardian expiry.
    function pause() external onlyGuardianActive {
        paused = true;
        emit PausedBy(msg.sender);
    }

    /// @notice Unpause. Also reverts after expiry, so a pause cannot be left in place: the
    ///         guardian is expected to unpause before expiry; `paused` is additionally ignored
    ///         once the guardian has expired (see `isPaused`).
    function unpause() external onlyGuardianActive {
        paused = false;
        emit UnpausedBy(msg.sender);
    }

    /// @notice Effective pause state: a pause dies with the guardian.
    function isPaused() public view returns (bool) {
        return paused && block.timestamp < DEPLOY_TIME + Config.PAUSE_EXPIRY;
    }

    /// @dev Internal check used by the modifier in inheriting contracts.
    function _requireNotPaused() internal view {
        if (isPaused()) revert Paused();
    }
}
