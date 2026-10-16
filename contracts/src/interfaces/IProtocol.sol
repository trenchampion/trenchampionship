// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BattleEngine} from "../BattleEngine.sol";

interface IRewardPool {
    function available() external view returns (uint256);
    function payMatchReward(uint256 requested, address to) external returns (uint256 paid);
    function paySeason(address to) external returns (uint256 paid);
}

interface IStakingVault {
    function onResolved(uint256 matchId, uint8 winnerSide, uint256 reward) external;
    function totalStaked(uint256 matchId, uint8 side) external view returns (uint256);
}

interface IRating {
    function recordResult(uint256 idA, uint256 idB, int8 outcome) external;
}

interface IMatchManagerViews {
    function stakingOpen(uint256 matchId) external view returns (bool);
    function sideCharacter(uint256 matchId, uint8 side) external view returns (uint256);
    function isBusy(uint256 characterId) external view returns (bool);
}

interface ICharacterRegistry {
    function tokenOf(uint256 characterId) external view returns (address);
    function traitsOf(uint256 characterId) external view returns (BattleEngine.Traits memory);
    function exists(uint256 characterId) external view returns (bool);
}

interface IControllerNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function controllerOf(uint256 characterId) external view returns (address);
}
