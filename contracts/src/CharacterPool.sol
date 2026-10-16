// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BondingCurve} from "./BondingCurve.sol";
import {Config} from "./Config.sol";

interface IControllerLookup {
    function controllerOf(uint256 characterId) external view returns (address);
}

/// @title CharacterPool
/// @notice Permanent constant-product market TL <-> character token with a creator-chosen virtual
///         TL reserve. 1 % protocol fee in TL on every trade (split RewardPool / treasury) plus an
///         optional creator fee (0-1 %) accrued to the character's current controller.
/// @dev No LP tokens, no withdrawal, no owner, no pause. Tokens that did not come through the
///      curve (the creator allocation) can be sold only while the real TL reserve covers them.
///      Accounting: TL.balanceOf(this) == realReserve + creatorFeeOwed; token.balanceOf(this) == tokenReserve.
contract CharacterPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error NotFactory();
    error AlreadyInitialized();
    error NotInitialized();
    error ZeroAmount();
    error SlippageExceeded();
    error InsufficientReserve();
    error NothingToClaim();

    event Initialized(address token, uint256 tokenReserve);
    event Buy(
        address indexed buyer,
        address indexed recipient,
        uint256 tlIn,
        uint256 tokensOut,
        uint256 protocolFee,
        uint256 creatorFee
    );
    event Sell(address indexed seller, uint256 tokensIn, uint256 tlOut, uint256 protocolFee, uint256 creatorFee);
    event CreatorFeesClaimed(address indexed controller, uint256 amount);

    uint256 public immutable CHARACTER_ID;
    IERC20 public immutable TL;
    address public immutable FACTORY;
    IControllerLookup public immutable NFT;
    address public immutable REWARD_POOL;
    address public immutable TREASURY;
    /// @notice Virtual TL reserve chosen by the creator.
    uint256 public immutable VIRTUAL_TL;
    /// @notice Creator fee in bps (0..CREATOR_FEE_MAX_BPS).
    uint256 public immutable CREATOR_FEE_BPS;

    IERC20 public token;
    uint256 public realReserve;
    uint256 public tokenReserve;
    uint256 public creatorFeeOwed;

    constructor(
        uint256 characterId,
        address tl,
        address nft,
        address rewardPool,
        address treasury,
        uint256 virtualTl,
        uint256 creatorFeeBps
    ) {
        CHARACTER_ID = characterId;
        TL = IERC20(tl);
        FACTORY = msg.sender;
        NFT = IControllerLookup(nft);
        REWARD_POOL = rewardPool;
        TREASURY = treasury;
        VIRTUAL_TL = virtualTl;
        CREATOR_FEE_BPS = creatorFeeBps;
    }

    /// @notice Bind the character token once it has minted its curve share here. Factory only.
    function initialize(address token_) external {
        if (msg.sender != FACTORY) revert NotFactory();
        if (address(token) != address(0)) revert AlreadyInitialized();
        token = IERC20(token_);
        tokenReserve = token.balanceOf(address(this));
        emit Initialized(token_, tokenReserve);
    }

    // ------------------------------------------------------------------ views

    function quoteReserve() public view returns (uint256) {
        return VIRTUAL_TL + realReserve;
    }

    /// @notice Spot price in TL per token, scaled by 1e18.
    function spotPrice() external view returns (uint256) {
        return BondingCurve.spotPrice(quoteReserve(), tokenReserve);
    }

    /// @notice Current controller; address(0) once retired (creator fee then goes to RewardPool).
    function controller() public view returns (address) {
        return NFT.controllerOf(CHARACTER_ID);
    }

    /// @notice Tokens received for `tlIn` after fees.
    function quoteBuy(uint256 tlIn) external view returns (uint256) {
        (uint256 net,,) = _splitFees(tlIn);
        return BondingCurve.tokensOut(quoteReserve(), tokenReserve, net);
    }

    /// @notice TL received for `tokensIn` after fees; 0 if the reserve could not cover the sale.
    function quoteSell(uint256 tokensIn) external view returns (uint256) {
        uint256 gross = BondingCurve.quoteOut(quoteReserve(), tokenReserve, tokensIn);
        if (gross > realReserve) return 0;
        (uint256 net,,) = _splitFees(gross);
        return net;
    }

    // ------------------------------------------------------------------ actions

    /// @notice Buy character tokens with TL for yourself.
    function buy(uint256 tlIn, uint256 minTokensOut) external returns (uint256) {
        return buyFor(msg.sender, tlIn, minTokensOut);
    }

    /// @notice Buy character tokens with TL for `recipient` (used by the factory for the creator's first buy).
    function buyFor(address recipient, uint256 tlIn, uint256 minTokensOut) public nonReentrant returns (uint256 out) {
        if (address(token) == address(0)) revert NotInitialized();
        if (tlIn == 0) revert ZeroAmount();
        (uint256 net, uint256 protocolFee, uint256 creatorFee) = _splitFees(tlIn);
        out = BondingCurve.tokensOut(quoteReserve(), tokenReserve, net);
        if (out == 0 || out < minTokensOut) revert SlippageExceeded();
        TL.safeTransferFrom(msg.sender, address(this), tlIn);
        realReserve += net;
        tokenReserve -= out;
        _distributeFees(protocolFee, creatorFee);
        token.safeTransfer(recipient, out);
        emit Buy(msg.sender, recipient, tlIn, out, protocolFee, creatorFee);
    }

    /// @notice Sell character tokens for TL. TL is sent in the same call (swap; documented
    ///         exception to pull-payment).
    function sell(uint256 tokensIn, uint256 minTlOut) external nonReentrant returns (uint256 net) {
        if (address(token) == address(0)) revert NotInitialized();
        if (tokensIn == 0) revert ZeroAmount();
        uint256 gross = BondingCurve.quoteOut(quoteReserve(), tokenReserve, tokensIn);
        if (gross > realReserve) revert InsufficientReserve();
        uint256 protocolFee;
        uint256 creatorFee;
        (net, protocolFee, creatorFee) = _splitFees(gross);
        if (net == 0 || net < minTlOut) revert SlippageExceeded();
        token.safeTransferFrom(msg.sender, address(this), tokensIn);
        tokenReserve += tokensIn;
        realReserve -= gross;
        _distributeFees(protocolFee, creatorFee);
        TL.safeTransfer(msg.sender, net);
        emit Sell(msg.sender, tokensIn, net, protocolFee, creatorFee);
    }

    /// @notice Pay accrued creator fees to the current controller. Anyone may call.
    function claimCreatorFees() external nonReentrant returns (uint256 amount) {
        amount = creatorFeeOwed;
        if (amount == 0) revert NothingToClaim();
        address to = controller();
        creatorFeeOwed = 0;
        if (to == address(0)) {
            // retired character: the fee stream joins player rewards
            TL.safeTransfer(REWARD_POOL, amount);
        } else {
            TL.safeTransfer(to, amount);
        }
        emit CreatorFeesClaimed(to, amount);
    }

    // ------------------------------------------------------------------ internals

    function _splitFees(uint256 gross) internal view returns (uint256 net, uint256 protocolFee, uint256 creatorFee) {
        protocolFee = gross * Config.POOL_FEE_BPS / Config.BPS;
        creatorFee = gross * CREATOR_FEE_BPS / Config.BPS;
        net = gross - protocolFee - creatorFee;
    }

    function _distributeFees(uint256 protocolFee, uint256 creatorFee) internal {
        uint256 toTreasury = protocolFee * Config.TREASURY_TRADE_BPS / Config.BPS;
        uint256 toRewardPool = protocolFee - toTreasury;
        if (toTreasury > 0) TL.safeTransfer(TREASURY, toTreasury);
        if (toRewardPool > 0) TL.safeTransfer(REWARD_POOL, toRewardPool);
        if (creatorFee > 0) creatorFeeOwed += creatorFee;
    }
}
