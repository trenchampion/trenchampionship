// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BondingCurve} from "../src/BondingCurve.sol";

contract BondingCurveHarness {
    function tokensOut(uint256 q, uint256 t, uint256 a) external pure returns (uint256) {
        return BondingCurve.tokensOut(q, t, a);
    }

    function quoteOut(uint256 q, uint256 t, uint256 a) external pure returns (uint256) {
        return BondingCurve.quoteOut(q, t, a);
    }

    function quoteIn(uint256 q, uint256 t, uint256 w) external pure returns (uint256) {
        return BondingCurve.quoteIn(q, t, w);
    }

    function spotPrice(uint256 q, uint256 t) external pure returns (uint256) {
        return BondingCurve.spotPrice(q, t);
    }
}

contract BondingCurveTest is Test {
    BondingCurveHarness h;

    uint256 constant V = 1 ether;
    uint256 constant T0 = 900_000_000e18;

    function setUp() public {
        h = new BondingCurveHarness();
    }

    function test_founderBuy() public view {
        uint256 out = h.tokensOut(V, T0, 0.2857 ether);
        // 900M * 0.2857 / 1.2857 = 199.992M
        assertApproxEqRel(out, 199_992_222e18, 1e14);
        assertApproxEqRel(h.quoteIn(V, T0, 200_000_000e18), 0.285_714_286 ether, 1e12);
    }

    function test_spotPriceAfterFounder() public view {
        uint256 out = h.tokensOut(V, T0, 0.2857 ether);
        uint256 p = h.spotPrice(V + 0.2857 ether, T0 - out);
        // (1 + 0.2857)^2 / (1 * 9e8) = 1.8367e-9 ETH per TL
        assertApproxEqRel(p, 1.8367e9, 1e15); // scaled by 1e18 -> 1.8367e9 wei per 1e18 TL
    }

    /// @dev k = q * t never decreases over a buy, for any state and amount.
    function testFuzz_kNonDecreasingOnBuy(uint128 q, uint128 t, uint128 a) public view {
        q = uint128(bound(q, 1, type(uint128).max));
        t = uint128(bound(t, 1, type(uint128).max));
        uint256 out = h.tokensOut(q, t, a);
        assertLe(out, t);
        uint256 kBefore = uint256(q) * t;
        uint256 kAfter = (uint256(q) + a) * (uint256(t) - out);
        assertGe(kAfter, kBefore);
    }

    /// @dev k never decreases over a sell either.
    function testFuzz_kNonDecreasingOnSell(uint128 q, uint128 t, uint128 a) public view {
        q = uint128(bound(q, 1, type(uint128).max));
        t = uint128(bound(t, 1, type(uint128).max));
        uint256 out = h.quoteOut(q, t, a);
        assertLe(out, q);
        uint256 kBefore = uint256(q) * t;
        uint256 kAfter = (uint256(q) - out) * (uint256(t) + a);
        assertGe(kAfter, kBefore);
    }

    /// @dev Buying then selling the same tokens never returns more quote than paid.
    function testFuzz_roundTripNeverProfits(uint96 a, uint96 b) public view {
        uint256 q = V;
        uint256 t = T0;
        uint256 out1 = h.tokensOut(q, t, a);
        q += a;
        t -= out1;
        uint256 out2 = h.tokensOut(q, t, b);
        q += b;
        t -= out2;
        uint256 back = h.quoteOut(q, t, out1 + out2);
        assertLe(back, uint256(a) + b);
    }

    /// @dev quoteIn is the inverse of tokensOut up to rounding (paying quoteIn yields >= wanted).
    function testFuzz_quoteInCoversWanted(uint128 q, uint128 t, uint128 w) public view {
        q = uint128(bound(q, 1, type(uint128).max));
        t = uint128(bound(t, 2, type(uint128).max));
        w = uint128(bound(w, 1, t - 1));
        uint256 needed = h.quoteIn(q, t, w);
        assertGe(h.tokensOut(q, t, needed), w);
    }

    function test_quoteInRevertsAtOrAboveReserve() public {
        vm.expectRevert(BondingCurve.InsufficientReserve.selector);
        h.quoteIn(V, T0, T0);
    }

    /// @dev Price is monotonic: more quote in the pool, higher price.
    function testFuzz_priceMonotonic(uint96 a) public view {
        a = uint96(bound(a, 1, type(uint96).max));
        uint256 p0 = h.spotPrice(V, T0);
        uint256 out = h.tokensOut(V, T0, a);
        uint256 p1 = h.spotPrice(V + a, T0 - out);
        assertGe(p1, p0);
    }
}
