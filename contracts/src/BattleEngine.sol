// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Config} from "./Config.sol";

/// @title BattleEngine
/// @notice Deterministic resolution of a three-round match (design variant L, specials as tuned in
///         docs/BALANCE-REPORT.md).
/// @dev Pure library, integer math only, no storage, no block data. Must stay bit-identical to
///      sim/traitleague_sim/battle.py and engine/ (TypeScript); engine/vectors/battle-vectors.json
///      is the shared contract between the three implementations.
///
///      Round score:  R = base(stance) + ENERGY_MULT * energy + stance bonus + element term + specials
///      base:         Attack = S + F/2, Defense = O + S/2, Counter = F + O/2   (cyclic: every trait once primary)
///      energy:       budget = ENERGY_BASE + speed / ENERGY_SPEED_DIV (+ENDURANCE with Endurance)
///      tie:          higher speed; equal -> drawn round
library BattleEngine {
    // stances
    uint8 internal constant ATTACK = 0;
    uint8 internal constant DEFENSE = 1;
    uint8 internal constant COUNTER = 2;

    // specials (0 = none; the factory requires 1..8 on chain)
    uint8 internal constant SP_NONE = 0;
    uint8 internal constant SP_FIRST_STRIKE = 1; // +FIRST_STRIKE_BONUS in round 1 when attacking
    uint8 internal constant SP_ARMOR = 2; // opponent's strength -ARMOR_STRENGTH (min 1) in bases
    uint8 internal constant SP_ENDURANCE = 3; // +ENDURANCE_ENERGY energy budget
    uint8 internal constant SP_ADAPTATION = 4; // element term never negative, weakness ignored
    uint8 internal constant SP_PRESSURE = 5; // +PRESSURE_BONUS in round 1
    uint8 internal constant SP_FINISHER = 6; // +FINISHER_BONUS in round 3
    uint8 internal constant SP_COUNTERSTRIKE = 7; // +COUNTER_BONUS when Counter meets Attack
    uint8 internal constant SP_BALANCE = 8; // opponent's stance bonus against me is reduced by BALANCE_SHIELD

    struct Traits {
        uint8 strength;
        uint8 defense;
        uint8 speed;
        uint8 focus;
        uint8 element; // 0..4: Fire, Air, Earth, Water, Shadow
        uint8 special; // 0..8
        uint8 weakness; // 0..4
    }

    struct Tactics {
        uint8[3] stances;
        uint8[3] energies;
    }

    struct Result {
        uint8 roundsA;
        uint8 roundsB;
        int16[3] scoreA;
        int16[3] scoreB;
        int8[3] winners; // 1 = A, -1 = B, 0 = drawn round
    }

    // ------------------------------------------------------------------ validation

    /// @notice True when traits are within bounds and sum to the budget.
    function validTraits(Traits memory t) internal pure returns (bool) {
        if (t.strength < Config.TRAIT_MIN || t.strength > Config.TRAIT_MAX) return false;
        if (t.defense < Config.TRAIT_MIN || t.defense > Config.TRAIT_MAX) return false;
        if (t.speed < Config.TRAIT_MIN || t.speed > Config.TRAIT_MAX) return false;
        if (t.focus < Config.TRAIT_MIN || t.focus > Config.TRAIT_MAX) return false;
        if (t.element > 4 || t.weakness > 4 || t.special > 8) return false;
        uint16 sum = uint16(t.strength) + t.defense + t.speed + t.focus;
        return sum == Config.TRAIT_BUDGET;
    }

    /// @notice Energy budget per match.
    function energyBudget(Traits memory t) internal pure returns (uint8) {
        uint8 e = Config.ENERGY_BASE + t.speed / Config.ENERGY_SPEED_DIV;
        if (t.special == SP_ENDURANCE) e += Config.ENDURANCE_ENERGY;
        return e;
    }

    /// @notice True when stances are valid and energies sum exactly to the budget.
    function validTactics(Tactics memory tac, Traits memory t) internal pure returns (bool) {
        uint16 sum = 0;
        for (uint256 i = 0; i < 3; i++) {
            if (tac.stances[i] > COUNTER) return false;
            sum += tac.energies[i];
        }
        return sum == energyBudget(t);
    }

    // ------------------------------------------------------------------ components

    /// @notice Pentagon: element i beats (i+1) and (i+2) mod 5, loses to (i+3) and (i+4).
    function elementModifier(uint8 myEl, uint8 oppEl) internal pure returns (int16) {
        uint8 d = (oppEl + 5 - myEl) % 5;
        if (d == 1 || d == 2) return Config.ELEMENT_BONUS;
        if (d == 3 || d == 4) return -Config.ELEMENT_BONUS;
        return 0;
    }

    /// @notice My constant element term for the match (element modifier and weakness penalty).
    function elementTerm(Traits memory me, Traits memory opp) internal pure returns (int16) {
        int16 m = elementModifier(me.element, opp.element);
        if (me.special == SP_ADAPTATION) return m > 0 ? m : int16(0);
        if (opp.element == me.weakness) m -= Config.WEAKNESS_PENALTY;
        return m;
    }

    /// @notice Base values for (Attack, Defense, Counter), with the opponent's Armor applied.
    function bases(Traits memory me, Traits memory opp) internal pure returns (int16[3] memory b) {
        int16 s = int16(uint16(me.strength));
        if (opp.special == SP_ARMOR) {
            s -= int16(uint16(Config.ARMOR_STRENGTH));
            if (s < int16(uint16(Config.TRAIT_MIN))) s = int16(uint16(Config.TRAIT_MIN));
        }
        int16 o = int16(uint16(me.defense));
        int16 f = int16(uint16(me.focus));
        b[ATTACK] = s + f / 2;
        b[DEFENSE] = o + s / 2;
        b[COUNTER] = f + o / 2;
    }

    function beats(uint8 mine, uint8 theirs) internal pure returns (bool) {
        return (mine == ATTACK && theirs == DEFENSE) || (mine == DEFENSE && theirs == COUNTER)
            || (mine == COUNTER && theirs == ATTACK);
    }

    /// @notice Stance bonus `me` receives for beating `opp`'s stance (reduced by Balance's shield).
    function stanceBonusFor(Traits memory opp) internal pure returns (int16) {
        return opp.special == SP_BALANCE ? Config.STANCE_BONUS - Config.BALANCE_SHIELD : Config.STANCE_BONUS;
    }

    /// @notice Round score for `me`.
    function roundScore(
        Traits memory me,
        Traits memory opp,
        int16[3] memory myBases,
        uint8 myStance,
        uint8 oppStance,
        uint8 energy,
        uint256 round
    ) internal pure returns (int16 r) {
        r = myBases[myStance] + Config.ENERGY_MULT * int16(uint16(energy));
        if (beats(myStance, oppStance)) r += stanceBonusFor(opp);
        r += elementTerm(me, opp);
        if (me.special == SP_FIRST_STRIKE && round == 0 && myStance == ATTACK) r += Config.FIRST_STRIKE_BONUS;
        if (me.special == SP_PRESSURE && round == 0) r += Config.PRESSURE_BONUS;
        if (me.special == SP_FINISHER && round == Config.ROUNDS - 1) r += Config.FINISHER_BONUS;
        if (me.special == SP_COUNTERSTRIKE && myStance == COUNTER && oppStance == ATTACK) r += Config.COUNTER_BONUS;
    }

    // ------------------------------------------------------------------ resolution

    /// @notice Resolve a match. Callers must have validated traits and tactics.
    function resolve(Traits memory a, Traits memory b, Tactics memory ta, Tactics memory tb)
        internal
        pure
        returns (Result memory res)
    {
        int16[3] memory ba = bases(a, b);
        int16[3] memory bb = bases(b, a);
        for (uint256 i = 0; i < Config.ROUNDS; i++) {
            int16 ra = roundScore(a, b, ba, ta.stances[i], tb.stances[i], ta.energies[i], i);
            int16 rb = roundScore(b, a, bb, tb.stances[i], ta.stances[i], tb.energies[i], i);
            res.scoreA[i] = ra;
            res.scoreB[i] = rb;
            int8 w;
            if (ra > rb) {
                w = 1;
            } else if (rb > ra) {
                w = -1;
            } else {
                w = a.speed > b.speed ? int8(1) : (b.speed > a.speed ? -1 : int8(0));
            }
            res.winners[i] = w;
            if (w == 1) res.roundsA++;
            if (w == -1) res.roundsB++;
        }
    }

    /// @notice 1 = A wins, -1 = B wins, 0 = draw.
    function outcome(Result memory res) internal pure returns (int8) {
        if (res.roundsA > res.roundsB) return 1;
        if (res.roundsB > res.roundsA) return -1;
        return 0;
    }
}
