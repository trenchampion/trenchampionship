"""Generate shared battle test vectors from the Python reference engine.

Usage (from sim/):
    uv run python -m traitleague_sim.vectors --out ../engine/vectors/battle-vectors.json --n 220 --seed 42

Each case is a flat integer array so Solidity (vm.parseJsonIntArray), TypeScript and Python can
read it without struct-ordering quirks:

    [ a(7), b(7), ta.stances(3), ta.energies(3), tb.stances(3), tb.energies(3),
      roundsA, roundsB, scoreA(3), scoreB(3), winners(3) ]          -> 37 integers

Traits are (strength, defense, speed, focus, element, special, weakness).
"""

from __future__ import annotations

import argparse
import json
import os
import random
from dataclasses import asdict

from .battle import Tactics, Traits, resolve, validate_tactics, validate_traits
from .constants import (
    ADAPTATION,
    DEFAULT_BATTLE as CFG,
    ENDURANCE,
    COUNTER,
    ATTACK,
    DEFENSE,
    ARMOR,
    PRESSURE,
    COUNTERSTRIKE,
    FIRST_STRIKE,
    BALANCE,
    FINISHER,
)


def rand_traits(rng: random.Random, special: int | None = None) -> Traits:
    sp = rng.randrange(0, 9) if special is None else special
    budget = CFG.trait_budget(sp)
    while True:
        cut = sorted(rng.sample(range(1, budget), 3))
        vals = [cut[0], cut[1] - cut[0], cut[2] - cut[1], budget - cut[2]]
        if all(CFG.trait_min <= v <= CFG.trait_max for v in vals):
            break
    return Traits(*vals, element=rng.randrange(5), special=sp, weakness=rng.randrange(5))


def rand_tactics(rng: random.Random, t: Traits) -> Tactics:
    e = CFG.energy_budget(t.speed, t.special)
    cut = sorted(rng.randint(0, e) for _ in range(2))
    return Tactics(tuple(rng.randrange(3) for _ in range(3)), (cut[0], cut[1] - cut[0], e - cut[1]))


def flat(a: Traits, b: Traits, ta: Tactics, tb: Tactics) -> list[int]:
    validate_traits(a)
    validate_traits(b)
    validate_tactics(ta, a)
    validate_tactics(tb, b)
    r = resolve(a, b, ta, tb)
    return (
        [a.strength, a.defense, a.speed, a.focus, a.element, a.special, a.weakness]
        + [b.strength, b.defense, b.speed, b.focus, b.element, b.special, b.weakness]
        + list(ta.stances) + list(ta.energies) + list(tb.stances) + list(tb.energies)
        + [r.rounds_a, r.rounds_b]
        + [x.r_a for x in r.rounds] + [x.r_b for x in r.rounds] + [x.winner for x in r.rounds]
    )


def edge_cases() -> list[tuple[Traits, Traits, Tactics, Tactics]]:
    gen = Traits(11, 11, 12, 11)  # energy 11
    cases = []
    # full draw: identical characters and tactics
    cases.append((gen, gen, Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 3)), Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 3))))
    # tie-break on speed
    fast = Traits(11, 11, 13, 10)  # energy 11
    cases.append((fast, gen, Tactics((ATTACK, ATTACK, ATTACK), (4, 4, 3)), Tactics((ATTACK, ATTACK, ATTACK), (4, 4, 3))))
    # stance counters
    cases.append((gen, gen, Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 3)), Tactics((COUNTER, ATTACK, DEFENSE), (4, 4, 3))))
    # extremes: max/min traits, all energy in one round
    n_spec = Traits(15, 1, 14, 15)  # energy 12
    o_spec = Traits(15, 15, 14, 1)
    cases.append((n_spec, o_spec, Tactics((ATTACK, ATTACK, ATTACK), (12, 0, 0)), Tactics((DEFENSE, DEFENSE, DEFENSE), (0, 0, 12))))
    # element pentagon, all relations, with and without weakness
    for my_el in range(5):
        for opp_el in range(5):
            a = Traits(11, 11, 12, 11, element=my_el, weakness=(my_el + 3) % 5)
            b = Traits(11, 11, 12, 11, element=opp_el, weakness=(opp_el + 1) % 5)
            cases.append((a, b, Tactics((ATTACK, DEFENSE, COUNTER), (3, 4, 4)), Tactics((DEFENSE, DEFENSE, ATTACK), (4, 3, 4))))
    # each special on both sides
    for sp in (FIRST_STRIKE, ARMOR, ENDURANCE, ADAPTATION, PRESSURE, FINISHER, COUNTERSTRIKE, BALANCE):
        a = Traits(11, 11, 12, 11, element=0, special=sp, weakness=1)
        b = Traits(11, 11, 12, 11, element=1, weakness=0)
        ea = CFG.energy_budget(a.speed, a.special)
        ta = Tactics((COUNTER, DEFENSE, COUNTER), (ea // 3, ea // 3, ea - 2 * (ea // 3)))
        tb = Tactics((ATTACK, ATTACK, ATTACK), (4, 4, 3))
        cases.append((a, b, ta, tb))
        cases.append((b, a, tb, ta))
    # Armor against strength 1 (floor), First strike equal speed
    cases.append((Traits(1, 15, 14, 15), Traits(11, 11, 12, 11, special=ARMOR), Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 4)), Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 3))))
    cases.append((Traits(11, 11, 12, 11, special=FIRST_STRIKE), gen, Tactics((DEFENSE, DEFENSE, DEFENSE), (4, 4, 3)), Tactics((DEFENSE, DEFENSE, DEFENSE), (4, 4, 3))))
    return cases


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=220)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    cases = [flat(*c) for c in edge_cases()]
    while len(cases) < args.n:
        a, b = rand_traits(rng), rand_traits(rng)
        cases.append(flat(a, b, rand_tactics(rng, a), rand_tactics(rng, b)))
    doc = {
        "version": 1,
        "formula": "the design notes §7.3 variant L",
        "config": asdict(CFG),
        "layout": "a(7) b(7) ta.stances(3) ta.energies(3) tb.stances(3) tb.energies(3) roundsA roundsB scoreA(3) scoreB(3) winners(3)",
        "traits": "strength defense speed focus element special weakness",
        "count": len(cases),
        "cases": cases,
    }
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote {len(cases)} cases to {args.out}")


if __name__ == "__main__":
    main()
