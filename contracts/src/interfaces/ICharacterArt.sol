// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BattleEngine} from "../BattleEngine.sol";

/// @notice The portrait renderer ControllerNFT.tokenURI calls: the SVG image and the extra
///         metadata attributes of a character, both deterministic in (id, traits).
interface ICharacterArt {
    function svg(uint256 characterId, BattleEngine.Traits calldata t) external view returns (string memory);
    function attributes(uint256 characterId, BattleEngine.Traits calldata t) external pure returns (string memory);
}
