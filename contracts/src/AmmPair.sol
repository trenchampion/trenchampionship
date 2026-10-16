// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Config} from "./Config.sol";

/// @title AmmPair
/// @notice Constant-product market TL <-> one character token in the style of Uniswap v2, with LP
///         shares as an ERC-20. The secondary market of a character: its bonding curve stays the
///         primary market and the permanent liquidity guarantee.
/// @dev No owner, no pause, no upgrade, no migration. Fees: AMM_LP_FEE_BPS of every swap stays in
///      the pair (k grows for the LPs); AMM_PROTOCOL_FEE_BPS is taken in TL on every swap and split
///      RewardPool / treasury by TREASURY_AMM_BPS, so the protocol never holds character tokens.
///      Amounts are passed explicitly and pulled with transferFrom (no router, no "send then call").
///      Documented exceptions to pull-payment: swaps and removeLiquidity return the assets in the same
///      call (exchange, not payout). Accounting: reserves are tracked in storage only and never read
///      from balances, so tokens sent directly to the pair are simply ignored (balances >= reserves).
///      Every output rounds down, so k = reserveTl * reserveToken never decreases through a swap (the
///      LP fee is charged on the input before the constant-product formula; the protocol fee never
///      enters k).
contract AmmPair is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error ZeroAddress();
    error SlippageExceeded();
    error InsufficientLiquidity();

    event LiquidityAdded(
        address indexed provider, address indexed to, uint256 tlIn, uint256 tokenIn, uint256 liquidity
    );
    event LiquidityRemoved(
        address indexed provider, address indexed to, uint256 tlOut, uint256 tokenOut, uint256 liquidity
    );
    event Swap(
        address indexed trader,
        address indexed to,
        bool tlToToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFee
    );
    event ReservesUpdated(uint256 reserveTl, uint256 reserveToken);

    /// @dev Holder of the permanently locked first-deposit shares (OpenZeppelin forbids minting to address(0)).
    address internal constant LOCK = address(0xdead);

    uint256 public immutable CHARACTER_ID;
    IERC20 public immutable TL;
    IERC20 public immutable TOKEN;
    address public immutable FACTORY;
    address public immutable REWARD_POOL;
    address public immutable TREASURY;

    uint256 public reserveTl;
    uint256 public reserveToken;

    /// @param characterId Id of the character whose token is paired; informational.
    /// @param tl The TL token (quote asset of every pair).
    /// @param token The character token.
    /// @param rewardPool Receives the RewardPool share of the protocol fee.
    /// @param treasury Receives the treasury share of the protocol fee.
    /// @param tokenSymbol Symbol of the character token, used for the LP share name.
    constructor(
        uint256 characterId,
        address tl,
        address token,
        address rewardPool,
        address treasury,
        string memory tokenSymbol
    ) ERC20(string.concat("Trenchampionship LP ", tokenSymbol, "/TRCH"), string.concat("LP-", tokenSymbol)) {
        if (tl == address(0) || token == address(0) || rewardPool == address(0) || treasury == address(0)) {
            revert ZeroAddress();
        }
        CHARACTER_ID = characterId;
        TL = IERC20(tl);
        TOKEN = IERC20(token);
        FACTORY = msg.sender;
        REWARD_POOL = rewardPool;
        TREASURY = treasury;
    }

    // ------------------------------------------------------------------ views

    /// @notice Both reserves in one call.
    function getReserves() external view returns (uint256 tl, uint256 token) {
        return (reserveTl, reserveToken);
    }

    /// @notice Spot price in TL per token scaled by 1e18; 0 while the pair is empty.
    function spotPrice() external view returns (uint256) {
        if (reserveToken == 0) return 0;
        return Math.mulDiv(reserveTl, 1e18, reserveToken);
    }

    /// @notice Tokens received for `tlIn` after both fees; 0 while the pair is empty.
    function quoteTlForToken(uint256 tlIn) external view returns (uint256) {
        if (reserveTl == 0 || reserveToken == 0) return 0;
        uint256 protocolFee = tlIn * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
        return _getAmountOut(tlIn - protocolFee, reserveTl, reserveToken);
    }

    /// @notice TL received for `tokenIn` after both fees; 0 while the pair is empty.
    function quoteTokenForTl(uint256 tokenIn) external view returns (uint256) {
        if (reserveTl == 0 || reserveToken == 0) return 0;
        uint256 gross = _getAmountOut(tokenIn, reserveToken, reserveTl);
        return gross - gross * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
    }

    /// @notice LP shares `addLiquidity(tlDesired, tokenDesired, ...)` would mint right now, using the
    ///         amounts it would actually take at the current ratio (first deposit: sqrt minus the lock).
    function quoteLiquidity(uint256 tlDesired, uint256 tokenDesired) external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            uint256 root = Math.sqrt(tlDesired * tokenDesired);
            return root > Config.AMM_MINIMUM_LIQUIDITY ? root - Config.AMM_MINIMUM_LIQUIDITY : 0;
        }
        (uint256 tlUsed, uint256 tokenUsed) = _optimalAmounts(tlDesired, tokenDesired);
        return Math.min(Math.mulDiv(tlUsed, supply, reserveTl), Math.mulDiv(tokenUsed, supply, reserveToken));
    }

    // ------------------------------------------------------------------ liquidity

    /// @notice Deposit TL and tokens at the current ratio and receive LP shares. Caller must have
    ///         approved both tokens. The first deposit sets the price; later deposits use at most
    ///         the desired amounts and at least the minimums.
    /// @param tlDesired TL the caller is willing to deposit.
    /// @param tokenDesired Tokens the caller is willing to deposit.
    /// @param tlMin Slippage guard on the TL actually used.
    /// @param tokenMin Slippage guard on the tokens actually used.
    /// @param to Receiver of the LP shares.
    function addLiquidity(uint256 tlDesired, uint256 tokenDesired, uint256 tlMin, uint256 tokenMin, address to)
        external
        nonReentrant
        returns (uint256 tlUsed, uint256 tokenUsed, uint256 liquidity)
    {
        if (to == address(0)) revert ZeroAddress();
        if (tlDesired == 0 || tokenDesired == 0) revert ZeroAmount();
        (tlUsed, tokenUsed) = _optimalAmounts(tlDesired, tokenDesired);
        if (tlUsed < tlMin || tokenUsed < tokenMin) revert SlippageExceeded();
        uint256 supply = totalSupply();
        if (supply == 0) {
            uint256 root = Math.sqrt(tlUsed * tokenUsed);
            if (root <= Config.AMM_MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
            liquidity = root - Config.AMM_MINIMUM_LIQUIDITY;
            _mint(LOCK, Config.AMM_MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min(Math.mulDiv(tlUsed, supply, reserveTl), Math.mulDiv(tokenUsed, supply, reserveToken));
            if (liquidity == 0) revert InsufficientLiquidity();
        }
        TL.safeTransferFrom(msg.sender, address(this), tlUsed);
        TOKEN.safeTransferFrom(msg.sender, address(this), tokenUsed);
        reserveTl += tlUsed;
        reserveToken += tokenUsed;
        _mint(to, liquidity);
        emit LiquidityAdded(msg.sender, to, tlUsed, tokenUsed, liquidity);
        emit ReservesUpdated(reserveTl, reserveToken);
    }

    /// @notice Burn LP shares and receive the pro-rata reserves in the same call (documented
    ///         exception to pull-payment: an exchange of shares for assets).
    /// @param liquidity LP shares to burn from the caller.
    /// @param tlMin Slippage guard on the TL received.
    /// @param tokenMin Slippage guard on the tokens received.
    /// @param to Receiver of both assets.
    function removeLiquidity(uint256 liquidity, uint256 tlMin, uint256 tokenMin, address to)
        external
        nonReentrant
        returns (uint256 tlOut, uint256 tokenOut)
    {
        if (to == address(0)) revert ZeroAddress();
        if (liquidity == 0) revert ZeroAmount();
        uint256 supply = totalSupply();
        tlOut = Math.mulDiv(liquidity, reserveTl, supply);
        tokenOut = Math.mulDiv(liquidity, reserveToken, supply);
        if (tlOut == 0 || tokenOut == 0) revert InsufficientLiquidity();
        if (tlOut < tlMin || tokenOut < tokenMin) revert SlippageExceeded();
        _burn(msg.sender, liquidity);
        reserveTl -= tlOut;
        reserveToken -= tokenOut;
        TL.safeTransfer(to, tlOut);
        TOKEN.safeTransfer(to, tokenOut);
        emit LiquidityRemoved(msg.sender, to, tlOut, tokenOut, liquidity);
        emit ReservesUpdated(reserveTl, reserveToken);
    }

    // ------------------------------------------------------------------ swaps

    /// @notice Swap TL for character tokens. The protocol fee is taken from the TL in, the LP fee
    ///         stays in the pair. Tokens are sent in the same call (exchange, not payout).
    function swapTlForToken(uint256 tlIn, uint256 minTokenOut, address to)
        external
        nonReentrant
        returns (uint256 tokenOut)
    {
        if (to == address(0)) revert ZeroAddress();
        if (tlIn == 0) revert ZeroAmount();
        if (reserveTl == 0 || reserveToken == 0) revert InsufficientLiquidity();
        uint256 protocolFee = tlIn * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
        uint256 net = tlIn - protocolFee;
        tokenOut = _getAmountOut(net, reserveTl, reserveToken);
        if (tokenOut == 0 || tokenOut < minTokenOut) revert SlippageExceeded();
        TL.safeTransferFrom(msg.sender, address(this), tlIn);
        reserveTl += net;
        reserveToken -= tokenOut;
        _payProtocolFee(protocolFee);
        TOKEN.safeTransfer(to, tokenOut);
        emit Swap(msg.sender, to, true, tlIn, tokenOut, protocolFee);
        emit ReservesUpdated(reserveTl, reserveToken);
    }

    /// @notice Swap character tokens for TL. The protocol fee is taken from the TL out, the LP fee
    ///         stays in the pair. TL is sent in the same call (exchange, not payout).
    function swapTokenForTl(uint256 tokenIn, uint256 minTlOut, address to)
        external
        nonReentrant
        returns (uint256 tlOut)
    {
        if (to == address(0)) revert ZeroAddress();
        if (tokenIn == 0) revert ZeroAmount();
        if (reserveTl == 0 || reserveToken == 0) revert InsufficientLiquidity();
        uint256 gross = _getAmountOut(tokenIn, reserveToken, reserveTl);
        uint256 protocolFee = gross * Config.AMM_PROTOCOL_FEE_BPS / Config.BPS;
        tlOut = gross - protocolFee;
        if (tlOut == 0 || tlOut < minTlOut) revert SlippageExceeded();
        TOKEN.safeTransferFrom(msg.sender, address(this), tokenIn);
        reserveToken += tokenIn;
        reserveTl -= gross;
        _payProtocolFee(protocolFee);
        TL.safeTransfer(to, tlOut);
        emit Swap(msg.sender, to, false, tokenIn, tlOut, protocolFee);
        emit ReservesUpdated(reserveTl, reserveToken);
    }

    // ------------------------------------------------------------------ internals

    /// @dev Uniswap v2 output with the LP fee on the input: out = rOut * inFee / (rIn * BPS + inFee).
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        uint256 inFee = amountIn * (Config.BPS - Config.AMM_LP_FEE_BPS);
        return Math.mulDiv(reserveOut, inFee, reserveIn * Config.BPS + inFee);
    }

    /// @dev Largest deposit at the current ratio within both desired amounts (first deposit: as given).
    function _optimalAmounts(uint256 tlDesired, uint256 tokenDesired) internal view returns (uint256, uint256) {
        if (reserveTl == 0 || reserveToken == 0) return (tlDesired, tokenDesired);
        uint256 tokenOptimal = Math.mulDiv(tlDesired, reserveToken, reserveTl);
        if (tokenOptimal <= tokenDesired) return (tlDesired, tokenOptimal);
        uint256 tlOptimal = Math.mulDiv(tokenDesired, reserveTl, reserveToken);
        return (tlOptimal, tokenDesired);
    }

    /// @dev Split the TL protocol fee between treasury (switch #4) and RewardPool.
    function _payProtocolFee(uint256 fee) internal {
        if (fee == 0) return;
        uint256 toTreasury = fee * Config.TREASURY_AMM_BPS / Config.BPS;
        if (toTreasury > 0) TL.safeTransfer(TREASURY, toTreasury);
        if (fee - toTreasury > 0) TL.safeTransfer(REWARD_POOL, fee - toTreasury);
    }
}
