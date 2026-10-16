// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Config} from "../src/Config.sol";
import {BattleEngine} from "../src/BattleEngine.sol";

/// @dev Thin external wrapper so the library can be called from tests with calldata structs.
contract EngineHarness {
    function resolve(
        BattleEngine.Traits memory a,
        BattleEngine.Traits memory b,
        BattleEngine.Tactics memory ta,
        BattleEngine.Tactics memory tb
    ) external pure returns (BattleEngine.Result memory) {
        return BattleEngine.resolve(a, b, ta, tb);
    }

    function validTraits(BattleEngine.Traits memory t) external pure returns (bool) {
        return BattleEngine.validTraits(t);
    }

    function validTactics(BattleEngine.Tactics memory tac, BattleEngine.Traits memory t) external pure returns (bool) {
        return BattleEngine.validTactics(tac, t);
    }

    function energyBudget(BattleEngine.Traits memory t) external pure returns (uint8) {
        return BattleEngine.energyBudget(t);
    }

    function outcome(BattleEngine.Result memory r) external pure returns (int8) {
        return BattleEngine.outcome(r);
    }

    function elementModifier(uint8 a, uint8 b) external pure returns (int16) {
        return BattleEngine.elementModifier(a, b);
    }
}

contract BattleEngineTest is Test {
    EngineHarness h;
    string constant VECTORS = "../engine/vectors/battle-vectors.json";

    function setUp() public {
        h = new EngineHarness();
    }

    function _traits(int256[] memory c, uint256 o) internal pure returns (BattleEngine.Traits memory t) {
        t.strength = uint8(uint256(c[o]));
        t.defense = uint8(uint256(c[o + 1]));
        t.speed = uint8(uint256(c[o + 2]));
        t.focus = uint8(uint256(c[o + 3]));
        t.element = uint8(uint256(c[o + 4]));
        t.special = uint8(uint256(c[o + 5]));
        t.weakness = uint8(uint256(c[o + 6]));
    }

    function _tactics(int256[] memory c, uint256 o) internal pure returns (BattleEngine.Tactics memory t) {
        for (uint256 i = 0; i < 3; i++) {
            t.stances[i] = uint8(uint256(c[o + i]));
            t.energies[i] = uint8(uint256(c[o + 3 + i]));
        }
    }

    /// @dev Every shared vector must resolve bit-identically to the Python reference.
    function test_sharedVectors() public view {
        string memory json = vm.readFile(VECTORS);
        uint256 count = vm.parseJsonUint(json, ".count");
        assertGe(count, 200, "need at least 200 vectors");
        for (uint256 n = 0; n < count; n++) {
            int256[] memory c = vm.parseJsonIntArray(json, string.concat(".cases[", vm.toString(n), "]"));
            assertEq(c.length, 37);
            BattleEngine.Traits memory a = _traits(c, 0);
            BattleEngine.Traits memory b = _traits(c, 7);
            BattleEngine.Tactics memory ta = _tactics(c, 14);
            BattleEngine.Tactics memory tb = _tactics(c, 20);
            assertTrue(h.validTraits(a) && h.validTraits(b), "vector traits must be valid");
            assertTrue(h.validTactics(ta, a) && h.validTactics(tb, b), "vector tactics must be valid");
            BattleEngine.Result memory r = h.resolve(a, b, ta, tb);
            string memory tag = string.concat("case ", vm.toString(n));
            assertEq(uint256(r.roundsA), uint256(c[26]), tag);
            assertEq(uint256(r.roundsB), uint256(c[27]), tag);
            for (uint256 i = 0; i < 3; i++) {
                assertEq(int256(r.scoreA[i]), c[28 + i], tag);
                assertEq(int256(r.scoreB[i]), c[31 + i], tag);
                assertEq(int256(r.winners[i]), c[34 + i], tag);
            }
        }
    }

    function test_pentagon() public view {
        for (uint8 a = 0; a < 5; a++) {
            uint256 wins;
            uint256 losses;
            for (uint8 b = 0; b < 5; b++) {
                int16 m = h.elementModifier(a, b);
                assertEq(m, -h.elementModifier(b, a));
                if (m > 0) wins++;
                if (m < 0) losses++;
            }
            assertEq(wins, 2);
            assertEq(losses, 2);
        }
        assertEq(h.elementModifier(0, 1), Config.ELEMENT_BONUS); // Fire beats Air
        assertEq(h.elementModifier(4, 0), Config.ELEMENT_BONUS); // Shadow beats Fire
    }

    function test_validation() public view {
        BattleEngine.Traits memory t = BattleEngine.Traits(15, 15, 14, 1, 0, 1, 0);
        assertTrue(h.validTraits(t));
        t.strength = 16;
        t.defense = 14;
        assertFalse(h.validTraits(t), "cap");
        t = BattleEngine.Traits(10, 10, 10, 10, 0, 1, 0);
        assertFalse(h.validTraits(t), "budget 40 is never valid");
        t.special = BattleEngine.SP_BALANCE;
        assertFalse(h.validTraits(t), "Balance has the same budget");
        t = BattleEngine.Traits(11, 11, 12, 11, 0, 8, 0);
        assertTrue(h.validTraits(t));
        t.element = 5;
        assertFalse(h.validTraits(t), "element range");
        t.element = 0;
        t.special = 9;
        assertFalse(h.validTraits(t), "special range");
        t.special = 0;
        t.weakness = 5;
        assertFalse(h.validTraits(t), "weakness range");
        t.weakness = 0;
        t.strength = 0;
        t.defense = 20;
        assertFalse(h.validTraits(t), "min");
        // each trait is bounded on its own
        assertFalse(h.validTraits(BattleEngine.Traits(14, 16, 14, 1, 0, 1, 0)), "defense cap");
        assertFalse(h.validTraits(BattleEngine.Traits(15, 14, 16, 0, 0, 1, 0)), "speed cap");
        assertFalse(h.validTraits(BattleEngine.Traits(15, 15, 15, 0, 0, 1, 0)), "focus min");
        assertFalse(h.validTraits(BattleEngine.Traits(15, 0, 15, 15, 0, 1, 0)), "defense min");
        assertFalse(h.validTraits(BattleEngine.Traits(15, 15, 0, 15, 0, 1, 0)), "speed min");
        assertFalse(h.validTraits(BattleEngine.Traits(14, 14, 1, 16, 0, 1, 0)), "focus cap");

        BattleEngine.Traits memory g = BattleEngine.Traits(11, 11, 12, 11, 0, 0, 0);
        assertEq(h.energyBudget(g), 11);
        g.special = BattleEngine.SP_ENDURANCE;
        assertEq(h.energyBudget(g), 11 + Config.ENDURANCE_ENERGY);
        g.special = 0;
        BattleEngine.Tactics memory tac;
        tac.stances = [0, 1, 2];
        tac.energies = [4, 4, 3];
        assertTrue(h.validTactics(tac, g));
        tac.energies = [4, 4, 4];
        assertFalse(h.validTactics(tac, g), "sum");
        tac.energies = [4, 4, 3];
        tac.stances = [3, 1, 2];
        assertFalse(h.validTactics(tac, g), "stance");
    }

    function test_outcome() public view {
        BattleEngine.Result memory r;
        r.roundsA = 2;
        r.roundsB = 1;
        assertEq(h.outcome(r), 1);
        r.roundsA = 0;
        r.roundsB = 1;
        assertEq(h.outcome(r), -1);
        r.roundsB = 0;
        assertEq(h.outcome(r), 0);
    }

    /// @dev Swapping sides mirrors the result exactly.
    function testFuzz_antisymmetric(uint8[14] memory raw, uint8[12] memory tac) public view {
        BattleEngine.Traits memory a = _fuzzTraits(raw, 0);
        BattleEngine.Traits memory b = _fuzzTraits(raw, 7);
        BattleEngine.Tactics memory ta = _fuzzTactics(tac, 0, h.energyBudget(a));
        BattleEngine.Tactics memory tb = _fuzzTactics(tac, 6, h.energyBudget(b));
        BattleEngine.Result memory r1 = h.resolve(a, b, ta, tb);
        BattleEngine.Result memory r2 = h.resolve(b, a, tb, ta);
        assertEq(r1.roundsA, r2.roundsB);
        assertEq(r1.roundsB, r2.roundsA);
        for (uint256 i = 0; i < 3; i++) {
            assertEq(r1.scoreA[i], r2.scoreB[i]);
            assertEq(r1.winners[i], -r2.winners[i]);
        }
        assertEq(h.outcome(r1), -h.outcome(r2));
        assertLe(uint256(r1.roundsA) + r1.roundsB, 3);
    }

    function _fuzzTraits(uint8[14] memory raw, uint256 o) internal pure returns (BattleEngine.Traits memory t) {
        t.special = raw[o + 5] % 9;
        uint8 budget = Config.TRAIT_BUDGET;
        // distribute the budget: three cuts in [1, budget-1], retry-free construction via clamping
        uint8 s = uint8(bound(raw[o], 1, 15));
        uint8 d = uint8(bound(raw[o + 1], 1, 15));
        uint8 sp = uint8(bound(raw[o + 2], 1, 15));
        int256 f = int256(uint256(budget)) - int256(uint256(s)) - int256(uint256(d)) - int256(uint256(sp));
        if (f < 1) {
            // pull points back until focus reaches 1
            int256 need = 1 - f;
            while (need > 0) {
                if (s > 1) {
                    s--;
                    need--;
                } else if (d > 1) {
                    d--;
                    need--;
                } else {
                    sp--;
                    need--;
                }
            }
            f = 1;
        } else if (f > 15) {
            int256 extra = f - 15;
            while (extra > 0) {
                if (s < 15) {
                    s++;
                    extra--;
                } else if (d < 15) {
                    d++;
                    extra--;
                } else {
                    sp++;
                    extra--;
                }
            }
            f = 15;
        }
        t.strength = s;
        t.defense = d;
        t.speed = sp;
        t.focus = uint8(uint256(f));
        t.element = raw[o + 4] % 5;
        t.weakness = raw[o + 6] % 5;
    }

    function _fuzzTactics(uint8[12] memory tac, uint256 o, uint8 budget)
        internal
        pure
        returns (BattleEngine.Tactics memory t)
    {
        uint8 e0 = uint8(bound(tac[o + 3], 0, budget));
        uint8 e1 = uint8(bound(tac[o + 4], 0, budget - e0));
        t.stances = [tac[o] % 3, tac[o + 1] % 3, tac[o + 2] % 3];
        t.energies = [e0, e1, budget - e0 - e1];
    }
}
