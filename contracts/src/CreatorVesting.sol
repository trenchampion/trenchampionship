// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CreatorVesting
/// @notice Linear vesting of creator allocations, one record per character. Tokens arrive here in
///         the CharacterToken constructor; the factory registers the schedule in the same
///         transaction. Release is pull-based and callable by anyone.
contract CreatorVesting {
    using SafeERC20 for IERC20;

    error NotFactory();
    error AlreadySet();
    error NothingToRelease();
    error ZeroAddress();

    event Scheduled(
        uint256 indexed characterId,
        address indexed beneficiary,
        address token,
        uint256 total,
        uint64 start,
        uint64 duration
    );
    event Released(uint256 indexed characterId, address indexed beneficiary, uint256 amount);

    struct Schedule {
        address token;
        address beneficiary;
        uint256 total;
        uint256 released;
        uint64 start;
        uint64 duration;
    }

    address public immutable FACTORY;
    mapping(uint256 characterId => Schedule) public schedules;

    constructor(address factory) {
        if (factory == address(0)) revert ZeroAddress();
        FACTORY = factory;
    }

    /// @notice Register a schedule. Only the factory, once per character.
    function setup(uint256 characterId, address token, address beneficiary, uint256 total, uint64 duration) external {
        if (msg.sender != FACTORY) revert NotFactory();
        if (schedules[characterId].token != address(0)) revert AlreadySet();
        schedules[characterId] = Schedule({
            token: token,
            beneficiary: beneficiary,
            total: total,
            released: 0,
            start: uint64(block.timestamp),
            duration: duration
        });
        emit Scheduled(characterId, beneficiary, token, total, uint64(block.timestamp), duration);
    }

    /// @notice Tokens vested so far.
    function vested(uint256 characterId) public view returns (uint256) {
        Schedule storage s = schedules[characterId];
        if (s.token == address(0) || block.timestamp <= s.start) return 0;
        uint256 elapsed = block.timestamp - s.start;
        if (elapsed >= s.duration) return s.total;
        return s.total * elapsed / s.duration;
    }

    /// @notice Tokens vested and not yet released.
    function releasable(uint256 characterId) public view returns (uint256) {
        return vested(characterId) - schedules[characterId].released;
    }

    /// @notice Transfer releasable tokens to the beneficiary. Anyone may call.
    function release(uint256 characterId) external returns (uint256 amount) {
        amount = releasable(characterId);
        if (amount < 1) revert NothingToRelease();
        Schedule storage s = schedules[characterId];
        s.released += amount;
        IERC20(s.token).safeTransfer(s.beneficiary, amount);
        emit Released(characterId, s.beneficiary, amount);
    }
}
