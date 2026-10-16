/**
 * Battle constants. Mirrors contracts/src/Config.sol (battle section) and
 * sim/traitleague_sim/constants.py. Change all three together.
 */

export const ELEMENTS = ["Fire", "Air", "Earth", "Water", "Shadow"] as const;
export const STANCES = ["Attack", "Defense", "Counter"] as const;

export const ATTACK = 0;
export const DEFENSE = 1;
export const COUNTER = 2;
export type Stance = 0 | 1 | 2;

export const SPECIALS = [
  "None",
  "FirstStrike",
  "Armor",
  "Endurance",
  "Adaptation",
  "Pressure",
  "Finisher",
  "Counterstrike",
  "Balance",
] as const;

export const SP_NONE = 0;
export const SP_FIRST_STRIKE = 1;
export const SP_ARMOR = 2;
export const SP_ENDURANCE = 3;
export const SP_ADAPTATION = 4;
export const SP_PRESSURE = 5;
export const SP_FINISHER = 6;
export const SP_COUNTERSTRIKE = 7;
export const SP_BALANCE = 8;

export const BATTLE = {
  rounds: 3,
  traitMin: 1,
  traitMax: 15,
  budget: 45,
  stanceBonus: 8,
  energyMult: 2,
  energyBase: 5,
  energySpeedDiv: 2,
  elementBonus: 1,
  weaknessPenalty: 2,
  firstStrikeBonus: 4,
  balanceShield: 2,
  armorStrength: 2,
  enduranceEnergy: 1,
  pressureBonus: 2,
  finisherBonus: 2,
  counterBonus: 8,
} as const;
