// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {AmmPair} from "./AmmPair.sol";
import {CharacterToken} from "./CharacterToken.sol";

interface ITokenLookup {
    function tokenOf(uint256 characterId) external view returns (address);
}

/// @title AmmFactory
/// @notice Permissionless, immutable factory of AmmPair markets: one TL/character-token pair per
///         character. Only tokens minted by the CharacterFactory can be paired, so the AMM serves
///         the league's own tokens and nothing else.
/// @dev No owner, no pause, no fee switch: every fee is a Config constant baked into the pairs.
contract AmmFactory {
    error ZeroAddress();
    error NotCharacterToken();
    error PairExists();

    event PairCreated(uint256 indexed characterId, address indexed token, address pair, uint256 index);

    address public immutable TL;
    ITokenLookup public immutable CHARACTER_FACTORY;
    address public immutable REWARD_POOL;
    address public immutable TREASURY;

    /// @notice Pair of a character token; address(0) until created.
    mapping(address token => address pair) public pairOf;
    /// @notice Pair of a character id; address(0) until created.
    mapping(uint256 characterId => address pair) public pairOfCharacter;
    address[] public allPairs;

    constructor(address tl, address characterFactory, address rewardPool, address treasury) {
        if (tl == address(0) || characterFactory == address(0) || rewardPool == address(0) || treasury == address(0)) {
            revert ZeroAddress();
        }
        TL = tl;
        CHARACTER_FACTORY = ITokenLookup(characterFactory);
        REWARD_POOL = rewardPool;
        TREASURY = treasury;
    }

    /// @notice Number of pairs created so far.
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    /// @notice Create the TL pair of a character token. Anyone may call, once per token.
    /// @param token A token deployed by the CharacterFactory (checked through its character id).
    function createPair(address token) external returns (address pair) {
        if (token == address(0)) revert ZeroAddress();
        if (pairOf[token] != address(0)) revert PairExists();
        uint256 characterId = _characterIdOf(token);
        pair = address(new AmmPair(characterId, TL, token, REWARD_POOL, TREASURY, IERC20Metadata(token).symbol()));
        pairOf[token] = pair;
        pairOfCharacter[characterId] = pair;
        allPairs.push(pair);
        emit PairCreated(characterId, token, pair, allPairs.length - 1);
    }

    /// @dev A genuine character token is the one the factory registered for the id the token claims.
    function _characterIdOf(address token) internal view returns (uint256 characterId) {
        if (token == TL || token.code.length == 0) revert NotCharacterToken();
        try CharacterToken(token).CHARACTER_ID() returns (uint256 id) {
            characterId = id;
        } catch {
            revert NotCharacterToken();
        }
        if (CHARACTER_FACTORY.tokenOf(characterId) != token) revert NotCharacterToken();
    }
}
