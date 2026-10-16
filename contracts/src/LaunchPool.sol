// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {BondingCurve} from "./BondingCurve.sol";
import {Config} from "./Config.sol";

/// @title LaunchPool
/// @notice Permanent primary market for TL: a constant-product curve between ETH and TL with a
///         virtual ETH reserve. No owner, no pause, no fee, no migration.
/// @dev The founder purchase happens in the constructor (ETH sent with the deploy) so it is
///      atomic with deployment and recorded on chain. A cumulative inflow cap applies for
///      LP_CAP_PERIOD after deploy; sells are never capped.
///      Solvency: all TL sold by this contract is backed by ETH held here. TL that entered
///      circulation elsewhere (the RewardPool seed) can be sold here only while the real reserve
///      covers it; otherwise the sell reverts with InsufficientReserve.
contract LaunchPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error SlippageExceeded();
    error ExceedsPerTxMax();
    error ExceedsInflowCap();
    error InsufficientReserve();
    error UnexpectedBalance();

    event FounderBuy(address indexed founder, uint256 ethIn, uint256 tlOut);
    event Buy(address indexed buyer, uint256 ethIn, uint256 tlOut);
    event Sell(address indexed seller, uint256 tlIn, uint256 ethOut);

    IERC20 public immutable TL;
    uint256 public immutable DEPLOY_TIME;

    /// @notice Real ETH held as liquidity. Always equals address(this).balance.
    uint256 public realReserve;
    /// @notice TL left on the curve.
    uint256 public tokenReserve;
    /// @notice Net inflow counted against the cap (founder purchase excluded).
    uint256 public cappedInflow;

    /// @param tl TL token, already minted to this (precomputed) address.
    constructor(address tl) payable {
        TL = IERC20(tl);
        DEPLOY_TIME = block.timestamp;
        tokenReserve = Config.TL_TO_LAUNCHPOOL;
        if (TL.balanceOf(address(this)) != Config.TL_TO_LAUNCHPOOL) revert UnexpectedBalance();
        if (msg.value > 0) {
            uint256 out = BondingCurve.tokensOut(Config.LP_VIRTUAL_ETH, tokenReserve, msg.value);
            realReserve = msg.value;
            tokenReserve -= out;
            TL.safeTransfer(msg.sender, out);
            emit FounderBuy(msg.sender, msg.value, out);
        }
    }

    // ------------------------------------------------------------------ views

    /// @notice Quote side of the curve: virtual plus real ETH.
    function quoteReserve() public view returns (uint256) {
        return Config.LP_VIRTUAL_ETH + realReserve;
    }

    /// @notice Spot price in ETH per TL, scaled by 1e18.
    function spotPrice() external view returns (uint256) {
        return BondingCurve.spotPrice(quoteReserve(), tokenReserve);
    }

    /// @notice TL received for `ethIn` at the current state (before any cap check).
    function quoteBuy(uint256 ethIn) external view returns (uint256) {
        return BondingCurve.tokensOut(quoteReserve(), tokenReserve, ethIn);
    }

    /// @notice ETH received for `tlIn` at the current state; 0 if the reserve could not cover it.
    function quoteSell(uint256 tlIn) external view returns (uint256) {
        uint256 out = BondingCurve.quoteOut(quoteReserve(), tokenReserve, tlIn);
        return out > realReserve ? 0 : out;
    }

    /// @notice Whether the launch cap is still active.
    function capActive() public view returns (bool) {
        return block.timestamp < DEPLOY_TIME + Config.LP_CAP_PERIOD;
    }

    /// @notice Cumulative inflow allowed so far (grows linearly, flat after the cap period).
    function capAllowance() public view returns (uint256) {
        uint256 elapsed = block.timestamp - DEPLOY_TIME;
        if (elapsed > Config.LP_CAP_PERIOD) elapsed = Config.LP_CAP_PERIOD;
        return Config.LP_CAP_RATE_PER_DAY * elapsed / 1 days;
    }

    // ------------------------------------------------------------------ actions

    /// @notice Buy TL with ETH.
    /// @param minTlOut Minimum TL to receive, else revert.
    function buy(uint256 minTlOut) external payable nonReentrant returns (uint256 out) {
        if (msg.value == 0) revert ZeroAmount();
        if (capActive()) {
            if (msg.value > Config.LP_MAX_BUY_PER_TX) revert ExceedsPerTxMax();
            if (cappedInflow + msg.value > capAllowance()) revert ExceedsInflowCap();
            cappedInflow += msg.value;
        }
        out = BondingCurve.tokensOut(quoteReserve(), tokenReserve, msg.value);
        if (out == 0 || out < minTlOut) revert SlippageExceeded();
        realReserve += msg.value;
        tokenReserve -= out;
        TL.safeTransfer(msg.sender, out);
        emit Buy(msg.sender, msg.value, out);
    }

    /// @notice Sell TL for ETH. The ETH is sent in the same call (swap, documented exception to
    ///         pull-payment; see the design constraints in README.md).
    /// @param tlIn TL to sell (caller must have approved this contract).
    /// @param minEthOut Minimum ETH to receive, else revert.
    function sell(uint256 tlIn, uint256 minEthOut) external nonReentrant returns (uint256 out) {
        if (tlIn == 0) revert ZeroAmount();
        out = BondingCurve.quoteOut(quoteReserve(), tokenReserve, tlIn);
        if (out == 0 || out < minEthOut) revert SlippageExceeded();
        if (out > realReserve) revert InsufficientReserve();
        TL.safeTransferFrom(msg.sender, address(this), tlIn);
        tokenReserve += tlIn;
        realReserve -= out;
        if (capActive()) {
            cappedInflow = cappedInflow > out ? cappedInflow - out : 0;
        }
        Address.sendValue(payable(msg.sender), out);
        emit Sell(msg.sender, tlIn, out);
    }
}
