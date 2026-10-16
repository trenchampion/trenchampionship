/**
 * Deterministic battle engine, TypeScript port of contracts/src/BattleEngine.sol.
 * Integer math only; every division is an integer division of non-negative values.
 */

import {
  BATTLE as C,
  COUNTER,
  ATTACK,
  DEFENSE,
  SP_ADAPTATION,
  SP_ENDURANCE,
  SP_ARMOR,
  SP_PRESSURE,
  SP_COUNTERSTRIKE,
  SP_FIRST_STRIKE,
  SP_BALANCE,
  SP_FINISHER,
  type Stance,
} from "./constants.js";

export interface Traits {
  strength: number;
  defense: number;
  speed: number;
  focus: number;
  element: number; // 0..4
  special: number; // 0..8 (0 = none, simulation only)
  weakness: number; // 0..4
}

export interface Tactics {
  stances: [Stance, Stance, Stance];
  energies: [number, number, number];
}

export interface RoundResult {
  scoreA: number;
  scoreB: number;
  winner: 1 | 0 | -1;
}

export interface MatchResult {
  rounds: [RoundResult, RoundResult, RoundResult];
  roundsA: number;
  roundsB: number;
  outcome: 1 | 0 | -1;
}

const idiv = (a: number, b: number): number => Math.trunc(a / b);

export function traitBudget(_special: number): number {
  return C.budget; // the same for every special
}

export function validTraits(t: Traits): boolean {
  for (const v of [t.strength, t.defense, t.speed, t.focus]) {
    if (!Number.isInteger(v) || v < C.traitMin || v > C.traitMax) return false;
  }
  if (t.element < 0 || t.element > 4 || t.weakness < 0 || t.weakness > 4) return false;
  if (t.special < 0 || t.special > 8) return false;
  return t.strength + t.defense + t.speed + t.focus === traitBudget(t.special);
}

export function energyBudget(t: Traits): number {
  let e = C.energyBase + idiv(t.speed, C.energySpeedDiv);
  if (t.special === SP_ENDURANCE) e += C.enduranceEnergy;
  return e;
}

export function validTactics(tac: Tactics, t: Traits): boolean {
  if (tac.stances.length !== 3 || tac.energies.length !== 3) return false;
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    const s = tac.stances[i]!;
    const e = tac.energies[i]!;
    if (s !== ATTACK && s !== DEFENSE && s !== COUNTER) return false;
    if (!Number.isInteger(e) || e < 0) return false;
    sum += e;
  }
  return sum === energyBudget(t);
}

export function elementModifier(myEl: number, oppEl: number): number {
  const d = (oppEl - myEl + 5) % 5;
  if (d === 1 || d === 2) return C.elementBonus;
  if (d === 3 || d === 4) return -C.elementBonus;
  return 0;
}

export function elementTerm(me: Traits, opp: Traits): number {
  let m = elementModifier(me.element, opp.element);
  if (me.special === SP_ADAPTATION) return m > 0 ? m : 0;
  if (opp.element === me.weakness) m -= C.weaknessPenalty;
  return m;
}

/** Stance bonus I receive for beating the opponent's stance (reduced by Balance's shield). */
export function stanceBonusFor(opp: Traits): number {
  return opp.special === SP_BALANCE ? C.stanceBonus - C.balanceShield : C.stanceBonus;
}

export function bases(me: Traits, opp: Traits): [number, number, number] {
  let s = me.strength;
  if (opp.special === SP_ARMOR) s = Math.max(C.traitMin, s - C.armorStrength);
  return [s + idiv(me.focus, 2), me.defense + idiv(s, 2), me.focus + idiv(me.defense, 2)];
}

export function tiebreakSpeed(me: Traits, _round: number): number {
  return me.speed;
}

export function beats(mine: Stance, theirs: Stance): boolean {
  return (
    (mine === ATTACK && theirs === DEFENSE) ||
    (mine === DEFENSE && theirs === COUNTER) ||
    (mine === COUNTER && theirs === ATTACK)
  );
}

export function roundScore(
  me: Traits,
  opp: Traits,
  myBases: [number, number, number],
  myStance: Stance,
  oppStance: Stance,
  energy: number,
  round: number,
): number {
  let r = myBases[myStance] + C.energyMult * energy;
  if (beats(myStance, oppStance)) r += stanceBonusFor(opp);
  r += elementTerm(me, opp);
  if (me.special === SP_FIRST_STRIKE && round === 0 && myStance === ATTACK) r += C.firstStrikeBonus;
  if (me.special === SP_PRESSURE && round === 0) r += C.pressureBonus;
  if (me.special === SP_FINISHER && round === C.rounds - 1) r += C.finisherBonus;
  if (me.special === SP_COUNTERSTRIKE && myStance === COUNTER && oppStance === ATTACK) r += C.counterBonus;
  return r;
}

export function resolve(a: Traits, b: Traits, ta: Tactics, tb: Tactics): MatchResult {
  const ba = bases(a, b);
  const bb = bases(b, a);
  const rounds: RoundResult[] = [];
  let roundsA = 0;
  let roundsB = 0;
  for (let i = 0; i < C.rounds; i++) {
    const sa = ta.stances[i]!;
    const sb = tb.stances[i]!;
    const ra = roundScore(a, b, ba, sa, sb, ta.energies[i]!, i);
    const rb = roundScore(b, a, bb, sb, sa, tb.energies[i]!, i);
    let w: 1 | 0 | -1;
    if (ra > rb) w = 1;
    else if (rb > ra) w = -1;
    else {
      const spA = tiebreakSpeed(a, i);
      const spB = tiebreakSpeed(b, i);
      w = spA > spB ? 1 : spB > spA ? -1 : 0;
    }
    if (w === 1) roundsA++;
    if (w === -1) roundsB++;
    rounds.push({ scoreA: ra, scoreB: rb, winner: w });
  }
  const outcome: 1 | 0 | -1 = roundsA > roundsB ? 1 : roundsB > roundsA ? -1 : 0;
  return { rounds: rounds as [RoundResult, RoundResult, RoundResult], roundsA, roundsB, outcome };
}
