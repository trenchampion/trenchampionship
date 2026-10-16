import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { BATTLE, elementModifier, energyBudget, resolve, validTactics, validTraits, type Stance, type Tactics, type Traits } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "..", "vectors", "battle-vectors.json"), "utf8")) as {
  count: number;
  config: Record<string, number>;
  cases: number[][];
};

function traits(c: number[], o: number): Traits {
  return {
    strength: c[o]!,
    defense: c[o + 1]!,
    speed: c[o + 2]!,
    focus: c[o + 3]!,
    element: c[o + 4]!,
    special: c[o + 5]!,
    weakness: c[o + 6]!,
  };
}

function tactics(c: number[], o: number): Tactics {
  return {
    stances: [c[o]! as Stance, c[o + 1]! as Stance, c[o + 2]! as Stance],
    energies: [c[o + 3]!, c[o + 4]!, c[o + 5]!],
  };
}

describe("shared battle vectors", () => {
  it("has at least 200 cases and the same config as this port", () => {
    expect(doc.count).toBeGreaterThanOrEqual(200);
    expect(doc.cases.length).toBe(doc.count);
    expect(doc.config.stance_bonus).toBe(BATTLE.stanceBonus);
    expect(doc.config.energy_base).toBe(BATTLE.energyBase);
    expect(doc.config.trait_max).toBe(BATTLE.traitMax);
    expect(doc.config.budget).toBe(BATTLE.budget);
  });

  it("resolves every vector bit-identically", () => {
    for (const [n, c] of doc.cases.entries()) {
      expect(c.length, `case ${n} layout`).toBe(37);
      const a = traits(c, 0);
      const b = traits(c, 7);
      const ta = tactics(c, 14);
      const tb = tactics(c, 20);
      expect(validTraits(a) && validTraits(b), `case ${n} traits`).toBe(true);
      expect(validTactics(ta, a) && validTactics(tb, b), `case ${n} tactics`).toBe(true);
      const r = resolve(a, b, ta, tb);
      expect(r.roundsA, `case ${n} roundsA`).toBe(c[26]);
      expect(r.roundsB, `case ${n} roundsB`).toBe(c[27]);
      for (let i = 0; i < 3; i++) {
        expect(r.rounds[i]!.scoreA, `case ${n} scoreA[${i}]`).toBe(c[28 + i]);
        expect(r.rounds[i]!.scoreB, `case ${n} scoreB[${i}]`).toBe(c[31 + i]);
        expect(r.rounds[i]!.winner, `case ${n} winner[${i}]`).toBe(c[34 + i]);
      }
    }
  });
});

describe("engine semantics", () => {
  it("pentagon is antisymmetric with two wins and two losses per element", () => {
    for (let a = 0; a < 5; a++) {
      let wins = 0;
      let losses = 0;
      for (let b = 0; b < 5; b++) {
        const m = elementModifier(a, b);
        expect(m + elementModifier(b, a)).toBe(0); // antisymmetric (avoid -0 vs 0 with toBe)
        if (m > 0) wins++;
        if (m < 0) losses++;
      }
      expect([wins, losses]).toEqual([2, 2]);
    }
  });

  it("energy budget follows speed and Endurance", () => {
    const g: Traits = { strength: 11, defense: 11, speed: 12, focus: 11, element: 0, special: 0, weakness: 0 };
    expect(energyBudget(g)).toBe(11);
    expect(energyBudget({ ...g, special: 3 })).toBe(11 + BATTLE.enduranceEnergy);
    expect(validTraits(g)).toBe(true);
    expect(validTraits({ ...g, strength: 12 })).toBe(false);
    expect(validTraits({ ...g, strength: 10, defense: 10, speed: 10, focus: 10, special: 8 })).toBe(false);
    expect(validTraits({ ...g, special: 8 })).toBe(true);
  });
});
