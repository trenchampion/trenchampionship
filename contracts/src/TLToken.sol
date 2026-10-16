// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Config} from "./Config.sol";

/// @title TLToken
/// @notice The league's utility token. Fixed supply minted once: 900 M to LaunchPool, 100 M to
///         RewardPool. No owner, no mint function; holders may burn their own tokens.
/// @dev Token name "Trenchampionship", symbol TRCH (decided 2026-10-09); code identifiers keep the TL prefix.
contract TLToken is ERC20, ERC20Burnable, ERC20Permit {
    error ZeroAddress();

    /// @param launchPool Address the LaunchPool will be deployed at (precomputed; see deploy script).
    /// @param rewardPool Address the RewardPool will be deployed at (precomputed).
    constructor(address launchPool, address rewardPool)
        ERC20("Trenchampionship", "TRCH")
        ERC20Permit("Trenchampionship")
    {
        if (launchPool == address(0) || rewardPool == address(0)) {
            revert ZeroAddress();
        }
        _mint(launchPool, Config.TL_TO_LAUNCHPOOL);
        _mint(rewardPool, Config.TL_TO_REWARDPOOL_SEED);
    }
}
