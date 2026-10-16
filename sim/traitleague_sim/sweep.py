"""Composition sweep: Nash game values between many characters.

Usage (from sim/):
    uv run python -m traitleague_sim.sweep --mode quick --out output/sweep_quick.json
    uv run python -m traitleague_sim.sweep --mode full  --out output/sweep_full.json
    uv run python -m traitleague_sim.sweep --mode quick --stance-bonus 7 --out output/sweep_b7.json

A "character" here is traits only; elements are neutral (same element, no weakness hit) and
specials are None unless a study says otherwise. Element and special studies are separate
functions with small, interpretable tables.
"""

from __future__ import annotations

import argparse
import itertools
import json
import os
import random
import time
from concurrent.futures import ProcessPoolExecutor
from dataclasses import asdict, replace

import numpy as np

from .battle import Traits, payoff_matrix
from .constants import DEFAULT_BATTLE, NONE, BALANCE, SPECIALS, BattleConfig
from .nash import game_value

# --- composition space ----------------------------------------------------------------------


def enumerate_compositions(cfg: BattleConfig = DEFAULT_BATTLE, budget: int | None = None) -> list[tuple[int, int, int, int]]:
    b = cfg.budget if budget is None else budget
    lo, hi = cfg.trait_min, cfg.trait_max
    out = []
    for s, o, br in itertools.product(range(lo, hi + 1), repeat=3):
        f = b - s - o - br
        if lo <= f <= hi:
            out.append((s, o, br, f))
    return out


ARCHETYPES: dict[str, tuple[int, int, int, int]] = {
    # (Strength, Defense, Speed, Focus), budget 45, cap 15
    "A-spec": (15, 1, 14, 15),
    "C-spec": (1, 15, 14, 15),
    "D-spec": (15, 15, 14, 1),
    "A-spec-slow": (15, 5, 10, 15),
    "C-spec-slow": (5, 15, 10, 15),
    "D-spec-slow": (15, 15, 10, 5),
    "Gen": (11, 11, 12, 11),
    "Gen-fast": (10, 10, 15, 10),
    "SlowHib": (14, 14, 3, 14),
    "A/C": (14, 3, 14, 14),
    "D/C": (3, 14, 14, 14),
    "A/D": (14, 14, 14, 3),
}


def sample_compositions(n: int, seed: int, cfg: BattleConfig = DEFAULT_BATTLE) -> list[tuple[int, int, int, int]]:
    """Archetypes first, then a stratified random sample of the rest of the space."""
    allc = enumerate_compositions(cfg)
    rng = random.Random(seed)
    chosen = list(ARCHETYPES.values())
    pool = [c for c in allc if c not in chosen]
    rng.shuffle(pool)
    chosen += pool[: max(0, n - len(chosen))]
    return chosen


# --- evaluation -----------------------------------------------------------------------------


def _value(args: tuple[Traits, Traits, BattleConfig]) -> float:
    a, b, cfg = args
    return game_value(payoff_matrix(a, b, cfg))


def pairwise_values(chars: list[Traits], cfg: BattleConfig, workers: int | None = None) -> np.ndarray:
    """Antisymmetric value matrix V[i, j] = value of i vs j (0.5 on the diagonal)."""
    n = len(chars)
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
    jobs = [(chars[i], chars[j], cfg) for i, j in pairs]
    V = np.full((n, n), 0.5)
    workers = workers or max(1, (os.cpu_count() or 2) - 1)
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for (i, j), v in zip(pairs, ex.map(_value, jobs, chunksize=4)):
            V[i, j] = v
            V[j, i] = 1 - v
    return V


def summarize(names: list[str], comps: list[tuple[int, int, int, int]], V: np.ndarray) -> dict:
    n = len(comps)
    off = ~np.eye(n, dtype=bool)
    avg = np.array([V[i, off[i]].mean() for i in range(n)])
    worst = np.array([V[i, off[i]].min() for i in range(n)])
    order = np.argsort(-avg)
    rows = [
        {"name": names[i], "traits": comps[i], "avg": float(avg[i]), "worst": float(worst[i])}
        for i in order
    ]
    return {
        "n": n,
        "avg_max": float(avg.max()),
        "avg_min": float(avg.min()),
        "avg_mean": float(avg.mean()),
        "avg_std": float(avg.std()),
        "share_above_060": float((avg > 0.60).mean()),
        "share_below_040": float((avg < 0.40).mean()),
        "rows": rows,
    }


def run_sweep(mode: str, cfg: BattleConfig, seed: int = 1, workers: int | None = None) -> dict:
    n = {"quick": 40, "medium": 80, "full": 140}[mode]
    comps = sample_compositions(n, seed, cfg)
    inv = {v: k for k, v in ARCHETYPES.items()}
    names = [inv.get(c, f"{c[0]}/{c[1]}/{c[2]}/{c[3]}") for c in comps]
    chars = [Traits(*c) for c in comps]
    t0 = time.time()
    V = pairwise_values(chars, cfg, workers)
    summary = summarize(names, comps, V)
    summary.update({
        "mode": mode,
        "seed": seed,
        "config": asdict(cfg),
        "seconds": time.time() - t0,
        "archetype_matrix": {
            "names": [k for k in ARCHETYPES if k in names],
            "values": [[float(V[names.index(a), names.index(b)]) for b in ARCHETYPES if b in names] for a in ARCHETYPES if a in names],
        },
    })
    return summary


# --- element and special studies -------------------------------------------------------------


def element_study(cfg: BattleConfig = DEFAULT_BATTLE) -> list[dict]:
    """Value of a character vs an identical one under each element relation."""
    base = (11, 11, 12, 11)
    out = []
    for label, my_el, opp_el, my_weak in [
        ("same element", 0, 0, 3),
        ("my element wins (+3 / −3)", 0, 1, 3),
        ("my element loses (−3 / +3)", 0, 3, 4),
        ("I lose and my weakness is hit (−3 −4 / +3)", 0, 3, 3),
        ("I win but my weakness is hit (+3 −4 / −3)", 0, 1, 1),
    ]:
        a = Traits(*base, element=my_el, weakness=my_weak)
        b = Traits(*base, element=opp_el, weakness=2)
        out.append({"case": label, "value": game_value(payoff_matrix(a, b, cfg))})
    # a specialist with element edge against a generalist, and the reverse
    spec = Traits(*ARCHETYPES["C-spec"], element=0, weakness=3)
    gen_lose = Traits(*ARCHETYPES["Gen"], element=3, weakness=0)  # Gen loses element and takes weakness
    gen_win = Traits(*ARCHETYPES["Gen"], element=4, weakness=2)  # Gen beats Fire with Shadow
    out.append({"case": "C-spec with the element edge against a Gen whose weakness is hit", "value": game_value(payoff_matrix(spec, gen_lose, cfg))})
    out.append({"case": "C-spec against a Gen with the element edge", "value": game_value(payoff_matrix(spec, gen_win, cfg))})
    return out


def special_study(cfg: BattleConfig = DEFAULT_BATTLE, workers: int | None = None) -> list[dict]:
    """For each special: average value of (archetype + special) vs the archetype field without specials."""
    field_names = ["A-spec", "C-spec", "D-spec", "Gen", "Gen-fast", "SlowHib", "A/C", "D/C", "A/D"]
    field = [Traits(*ARCHETYPES[n], element=0, weakness=3) for n in field_names]
    carriers = ["A-spec", "C-spec", "D-spec", "Gen", "Gen-fast"]
    jobs = []
    index = []
    for sp in range(1, len(SPECIALS)):
        for cn in carriers:
            traits = ARCHETYPES[cn]
            if sp == BALANCE and cfg.balance_mode == "spec":
                # budget 40: scale the archetype down by removing 5 points from the largest traits
                t = list(traits)
                for _ in range(5):
                    k = int(np.argmax(t))
                    t[k] -= 1
                traits = tuple(t)
            me = Traits(*traits, element=0, special=sp, weakness=3)
            for opp in field:
                jobs.append((me, opp, cfg))
                index.append((sp, cn))
    workers = workers or max(1, (os.cpu_count() or 2) - 1)
    with ProcessPoolExecutor(max_workers=workers) as ex:
        vals = list(ex.map(_value, jobs, chunksize=4))
    # baseline: carriers without special vs the same field
    base_jobs = [(Traits(*ARCHETYPES[cn], element=0, weakness=3), opp, cfg) for cn in carriers for opp in field]
    with ProcessPoolExecutor(max_workers=workers) as ex:
        base_vals = list(ex.map(_value, base_jobs, chunksize=4))
    base_avg = {cn: float(np.mean(base_vals[i * len(field):(i + 1) * len(field)])) for i, cn in enumerate(carriers)}
    out = []
    for sp in range(1, len(SPECIALS)):
        row = {"special": SPECIALS[sp]}
        for cn in carriers:
            sel = [v for v, (s, c) in zip(vals, index) if s == sp and c == cn]
            row[cn] = float(np.mean(sel))
            row[cn + "_delta"] = row[cn] - base_avg[cn]
        row["mean_delta"] = float(np.mean([row[cn + "_delta"] for cn in carriers]))
        out.append(row)
    return {"baseline": base_avg, "rows": out}


# --- CLI ------------------------------------------------------------------------------------


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["quick", "medium", "full"], default="quick")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--workers", type=int, default=None)
    ap.add_argument("--stance-bonus", type=int, default=None)
    ap.add_argument("--energy-base", type=int, default=None)
    ap.add_argument("--studies", action="store_true", help="also run element and special studies")
    ap.add_argument("--studies-only", action="store_true", help="skip the pairwise sweep")
    ap.add_argument("--set", action="append", default=[], help="override a BattleConfig field, e.g. element_bonus=2")
    args = ap.parse_args()
    cfg = DEFAULT_BATTLE
    if args.stance_bonus is not None:
        cfg = replace(cfg, stance_bonus=args.stance_bonus)
    if args.energy_base is not None:
        cfg = replace(cfg, energy_base=args.energy_base)
    for kv in args.set:
        k, v = kv.split("=")
        cfg = replace(cfg, **{k: int(v) if v.lstrip("-").isdigit() else v})
    if args.studies_only:
        result = {"mode": "studies", "config": asdict(cfg), "n": 0, "seconds": 0, "avg_min": 0, "avg_max": 0,
                  "avg_mean": 0, "avg_std": 0, "share_above_060": 0, "share_below_040": 0, "rows": []}
    else:
        result = run_sweep(args.mode, cfg, args.seed, args.workers)
    if args.studies or args.studies_only:
        result["element_study"] = element_study(cfg)
        result["special_study"] = special_study(cfg, args.workers)
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
    s = result
    if args.studies_only:
        for r in s["element_study"]:
            print(f"  element {r['value']:.3f}  {r['case']}")
        for r in s["special_study"]["rows"]:
            print(f"  special {r['special']:13} mean delta {r['mean_delta']:+.3f}")
        return
    print(f"mode={s['mode']} n={s['n']} seconds={s['seconds']:.0f} avg range {s['avg_min']:.2f}..{s['avg_max']:.2f} "
          f"mean {s['avg_mean']:.2f} sd {s['avg_std']:.2f} >0.60: {s['share_above_060']:.0%} <0.40: {s['share_below_040']:.0%}")
    for r in s["rows"][:5]:
        print("  top", r["name"], r["traits"], f"{r['avg']:.2f} worst {r['worst']:.2f}")
    for r in s["rows"][-5:]:
        print("  bottom", r["name"], r["traits"], f"{r['avg']:.2f} worst {r['worst']:.2f}")


if __name__ == "__main__":
    main()
