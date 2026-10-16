// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BattleEngine} from "./BattleEngine.sol";
import {CharacterPool} from "./CharacterPool.sol";
import {CharacterToken} from "./CharacterToken.sol";
import {Config} from "./Config.sol";
import {ControllerNFT} from "./ControllerNFT.sol";
import {CreatorVesting} from "./CreatorVesting.sol";
import {GuardianPausable} from "./GuardianPausable.sol";

/// @title CharacterFactory
/// @notice Creates a character in one transaction: validates traits and tokenomics, takes the mint
///         fee (burn / RewardPool / treasury), deploys the token and its permanent pool, schedules
///         the creator allocation, executes the creator's first buy and mints the ControllerNFT.
/// @dev The only pausable action is `createCharacter`. Deploy order: factory first, then
///      ControllerNFT(factory, ...) and CreatorVesting(factory), then `bind` once.
contract CharacterFactory is GuardianPausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error AlreadyBound();
    error NotBound();
    error InvalidTraits();
    error InvalidSpecial();
    error InvalidTokenomics();
    error EmptyMetadata();
    error MetadataTooLong();
    error NotDeployer();
    error ZeroAddress();

    event CharacterCreated(
        uint256 indexed characterId,
        address indexed creator,
        address token,
        address pool,
        string metadataURI,
        BattleEngine.Traits traits,
        Tokenomics tokenomics
    );

    struct Tokenomics {
        string name;
        string symbol;
        uint256 supply;
        uint256 virtualTl;
        uint16 creatorAllocBps;
        uint32 vestingDuration;
        uint16 creatorFeeBps;
    }

    struct Character {
        address creator;
        address token;
        address pool;
        string metadataURI;
        BattleEngine.Traits traits;
    }

    IERC20 public immutable TL;
    address public immutable REWARD_POOL;
    address public immutable TREASURY;
    /// @notice The account that deployed the factory; the only one allowed to call bind() once.
    address public immutable DEPLOYER;

    ControllerNFT public nft;
    CreatorVesting public vesting;

    uint256 public characterCount;
    mapping(uint256 characterId => Character) internal _characters;

    constructor(address tl, address rewardPool, address treasury, address guardian) GuardianPausable(guardian) {
        if (tl == address(0) || rewardPool == address(0) || treasury == address(0)) revert ZeroAddress();
        TL = IERC20(tl);
        REWARD_POOL = rewardPool;
        TREASURY = treasury;
        DEPLOYER = msg.sender;
    }

    /// @notice One-time binding of the NFT and vesting contracts (they need this address first).
    ///         Deployer only, so nobody can bind foreign contracts between the deploy transactions;
    ///         a one-shot setup right, not an admin function (nothing can be changed afterwards).
    function bind(address nft_, address vesting_) external {
        if (msg.sender != DEPLOYER) revert NotDeployer();
        if (address(nft) != address(0)) revert AlreadyBound();
        if (ControllerNFT(nft_).FACTORY() != address(this) || CreatorVesting(vesting_).FACTORY() != address(this)) {
            revert NotBound();
        }
        nft = ControllerNFT(nft_);
        vesting = CreatorVesting(vesting_);
    }

    // ------------------------------------------------------------------ views

    function creatorOf(uint256 characterId) external view returns (address) {
        return _characters[characterId].creator;
    }

    function tokenOf(uint256 characterId) external view returns (address) {
        return _characters[characterId].token;
    }

    function poolOf(uint256 characterId) external view returns (address) {
        return _characters[characterId].pool;
    }

    function metadataURI(uint256 characterId) external view returns (string memory) {
        return _characters[characterId].metadataURI;
    }

    function traitsOf(uint256 characterId) external view returns (BattleEngine.Traits memory) {
        return _characters[characterId].traits;
    }

    function exists(uint256 characterId) external view returns (bool) {
        return characterId != 0 && characterId <= characterCount;
    }

    /// @notice Pure bounds check for tokenomics, exposed for the frontend.
    function validTokenomics(Tokenomics memory tk) public pure returns (bool) {
        if (bytes(tk.name).length == 0 || bytes(tk.symbol).length == 0) return false;
        if (tk.supply < Config.CHAR_SUPPLY_MIN || tk.supply > Config.CHAR_SUPPLY_MAX) return false;
        if (tk.virtualTl < Config.CHAR_VIRTUAL_TL_MIN || tk.virtualTl > Config.CHAR_VIRTUAL_TL_MAX) return false;
        if (tk.creatorAllocBps > Config.CREATOR_ALLOC_MAX_BPS) return false;
        if (tk.creatorFeeBps > Config.CREATOR_FEE_MAX_BPS) return false;
        if (tk.creatorAllocBps > 0) {
            if (tk.vestingDuration < Config.CREATOR_VESTING_MIN || tk.vestingDuration > Config.CREATOR_VESTING_MAX) {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------ creation

    /// @notice Create a character. Caller must have approved MINT_FEE + creatorBuyTl of TL.
    /// @param traits On-chain traits; special must be 1..8.
    /// @param metadataURI_ IPFS URI of name/image metadata.
    /// @param tk Creator-chosen tokenomics within Config bounds.
    /// @param creatorBuyTl TL to spend on the creator's first buy (0 for none).
    /// @param minCreatorTokens Slippage guard for the first buy.
    function createCharacter(
        BattleEngine.Traits calldata traits,
        string calldata metadataURI_,
        Tokenomics calldata tk,
        uint256 creatorBuyTl,
        uint256 minCreatorTokens
    ) external nonReentrant whenNotPaused returns (uint256 characterId) {
        _validate(traits, metadataURI_, tk);
        characterId = ++characterCount;
        _collectFee(creatorBuyTl);
        (address pool, address token) = _deployMarket(characterId, tk);
        _characters[characterId] =
            Character({creator: msg.sender, token: token, pool: pool, metadataURI: metadataURI_, traits: traits});
        if (creatorBuyTl > 0) _creatorBuy(pool, creatorBuyTl, minCreatorTokens);
        nft.mint(msg.sender, characterId);
        emit CharacterCreated(characterId, msg.sender, token, pool, metadataURI_, traits, tk);
    }

    function _validate(BattleEngine.Traits calldata traits, string calldata metadataURI_, Tokenomics calldata tk)
        internal
        view
    {
        if (address(nft) == address(0)) revert NotBound();
        if (!BattleEngine.validTraits(traits)) revert InvalidTraits();
        if (traits.special == BattleEngine.SP_NONE) revert InvalidSpecial();
        if (!validTokenomics(tk)) revert InvalidTokenomics();
        if (bytes(tk.name).length == 0 || bytes(tk.name).length > Config.CHAR_NAME_MAX_BYTES) {
            revert InvalidTokenomics();
        }
        if (bytes(tk.symbol).length == 0 || bytes(tk.symbol).length > Config.CHAR_SYMBOL_MAX_BYTES) {
            revert InvalidTokenomics();
        }
        if (bytes(metadataURI_).length == 0) revert EmptyMetadata();
        if (bytes(metadataURI_).length > Config.METADATA_URI_MAX_BYTES) revert MetadataTooLong();
    }

    /// @dev Pull MINT_FEE (+ the creator's buy budget) and split the fee: burn / treasury / RewardPool.
    function _collectFee(uint256 creatorBuyTl) internal {
        TL.safeTransferFrom(msg.sender, address(this), Config.MINT_FEE + creatorBuyTl);
        uint256 burnAmt = Config.MINT_FEE * Config.MINT_BURN_BPS / Config.BPS;
        uint256 toTreasury = Config.MINT_FEE * Config.TREASURY_MINT_BPS / Config.BPS;
        ERC20Burnable(address(TL)).burn(burnAmt);
        TL.safeTransfer(TREASURY, toTreasury);
        TL.safeTransfer(REWARD_POOL, Config.MINT_FEE - burnAmt - toTreasury);
    }

    /// @dev Deploy the pool, then the token (minting into pool and vesting), bind them, schedule vesting.
    function _deployMarket(uint256 characterId, Tokenomics calldata tk) internal returns (address pool, address token) {
        CharacterPool p = new CharacterPool(
            characterId, address(TL), address(nft), REWARD_POOL, TREASURY, tk.virtualTl, tk.creatorFeeBps
        );
        uint256 alloc = tk.supply * tk.creatorAllocBps / Config.BPS;
        CharacterToken t =
            new CharacterToken(characterId, tk.name, tk.symbol, address(p), tk.supply - alloc, address(vesting), alloc);
        p.initialize(address(t));
        if (alloc > 0) vesting.setup(characterId, address(t), msg.sender, alloc, tk.vestingDuration);
        return (address(p), address(t));
    }

    /// @dev Spend the creator's TL on their own curve, tokens go straight to the creator.
    function _creatorBuy(address pool, uint256 tlIn, uint256 minOut) internal returns (uint256 tokensOut) {
        TL.forceApprove(pool, tlIn);
        tokensOut = CharacterPool(pool).buyFor(msg.sender, tlIn, minOut);
    }
}
