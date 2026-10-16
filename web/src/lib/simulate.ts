import { BATTLE, energyBudget, resolve, type Stance, type Tactics, type Traits } from "@traitleague/engine";

/**
 * Builder preview: estimated result against five archetypes under random tactics on both sides.
 * This is not the Nash value from the balance report; it is a quick, deterministic (seeded)
 * sample so the builder can show trade-offs instantly in the browser.
 */
export const ARCHETYPES: { name: string; traits: Traits }[] = [
  { name: "Striker", traits: { strength: 15, defense: 1, speed: 14, focus: 15, element: 2, special: 5, weakness: 4 } },
  { name: "Counter", traits: { strength: 1, defense: 15, speed: 14, focus: 15, element: 3, special: 7, weakness: 0 } },
  { name: "Wall", traits: { strength: 15, defense: 15, speed: 14, focus: 1, element: 1, special: 2, weakness: 3 } },
  { name: "Generalist", traits: { strength: 11, defense: 11, speed: 12, focus: 11, element: 4, special: 3, weakness: 1 } },
  { name: "Slow hybrid", traits: { strength: 14, defense: 14, speed: 3, focus: 14, element: 0, special: 8, weakness: 2 } },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomTactics(t: Traits, next: () => number): Tactics {
  const budget = energyBudget(t);
  const a = Math.floor(next() * (budget + 1));
  const b = Math.floor(next() * (budget - a + 1));
  const stances = [0, 1, 2].map(() => Math.floor(next() * 3) as Stance) as [Stance, Stance, Stance];
  return { stances, energies: [a, b, budget - a - b] };
}

export function estimate(me: Traits, samples = 400): { name: string; score: number }[] {
  return ARCHETYPES.map((arch, i) => {
    const next = rng(1234 + i);
    let score = 0;
    for (let k = 0; k < samples; k++) {
      const r = resolve(me, arch.traits, randomTactics(me, next), randomTactics(arch.traits, next));
      score += r.outcome === 1 ? 1 : r.outcome === 0 ? 0.5 : 0;
    }
    return { name: arch.name, score: score / samples };
  });
}

export const TRAIT_BUDGET = BATTLE.budget;
export const TRAIT_MAX = BATTLE.traitMax;
