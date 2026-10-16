// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CharacterToken
/// @notice ERC-20 of one character. Supply, name and symbol are chosen by the creator within the
///         bounds in Config; everything is minted once in the constructor: the curve share to the
///         CharacterPool and the (optional) creator allocation to CreatorVesting.
contract CharacterToken is ERC20 {
    uint256 public immutable CHARACTER_ID;

    constructor(
        uint256 characterId,
        string memory name_,
        string memory symbol_,
        address pool,
        uint256 poolAmount,
        address vesting,
        uint256 vestingAmount
    ) ERC20(name_, symbol_) {
        CHARACTER_ID = characterId;
        _mint(pool, poolAmount);
        if (vestingAmount > 0) _mint(vesting, vestingAmount);
    }
}
