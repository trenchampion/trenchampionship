"""Build docs/BALANCE-REPORT.md from sweep JSON files and the economy model.

Usage (from sim/):
    uv run python -m traitleague_sim.report --sweep output/sweep_quick.json \
        --sensitivity output/sweep_b7.json output/sweep_b9.json --out ../docs/BALANCE-REPORT.md
"""

from __future__ import annotations

import argparse
import datetime as dt
import json

from .constants import DEFAULT_ECONOMY, SPECIALS
from .economy import (
    SCENARIOS,
    ceiling_table,
    farming_breakeven,
    founder_position,
    founder_table,
    reward_pool_trajectory,
)

ETH_USD = 2000.0


def _f(x: float, nd: int = 2) -> str:
    return f"{x:.{nd}f}"


def _tl(x: float) -> str:
    if x >= 1e6:
        return f"{x / 1e6:.2f} M TL"
    if x >= 1e3:
        return f"{x / 1e3:.0f} k TL"
    return f"{x:.0f} TL"


def _usd(eth: float) -> str:
    v = eth * ETH_USD
    if v >= 1000:
        return f"${v / 1000:.1f}k"
    return f"${v:.2f}"


def sweep_section(s: dict, title: str) -> list[str]:
    cfg = s["config"]
    out = [f"### {title}", ""]
    out.append(f"Configuration: cap {cfg['trait_max']}, budget {cfg['budget']}, stance bonus +{cfg['stance_bonus']}, "
               f"energy {cfg['energy_mult']}E, energy budget {cfg['energy_base']} + Speed/{cfg['energy_speed_div']}. "
               f"Sample: {s['n']} compositions ({s['n'] * (s['n'] - 1) // 2} Nash solutions, {s['seconds']:.0f} s).")
    out.append("")
    out.append("| Metric | Value | Criterion |")
    out.append("| --- | --- | --- |")
    out.append(f"| Best composition (average against the sample) | {_f(s['avg_max'])} | ≤ 0.60 {'✅' if s['avg_max'] <= 0.60 else '❌'} |")
    out.append(f"| Worst composition | {_f(s['avg_min'])} | ≥ 0.35 {'✅' if s['avg_min'] >= 0.35 else '❌'} |")
    out.append(f"| Standard deviation of the averages | {_f(s['avg_std'], 3)} | lower is flatter |")
    out.append(f"| Share of compositions above 0.60 | {s['share_above_060']:.0%} | 0 % |")
    out.append(f"| Share of compositions below 0.40 | {s['share_below_040']:.0%} | as low as possible |")
    out.append("")
    out.append("Top 8 and bottom 8 (Strength/Defense/Speed/Focus):")
    out.append("")
    out.append("| # | Composition | Average | Worst match |")
    out.append("| --- | --- | --- | --- |")
    rows = s["rows"]
    for i, r in enumerate(rows[:8], 1):
        out.append(f"| {i} | {r['name']} {tuple(r['traits'])} | {_f(r['avg'])} | {_f(r['worst'])} |")
    out.append("| … | | | |")
    for i, r in enumerate(rows[-8:], len(rows) - 7):
        out.append(f"| {i} | {r['name']} {tuple(r['traits'])} | {_f(r['avg'])} | {_f(r['worst'])} |")
    out.append("")
    am = s.get("archetype_matrix")
    if am and am["names"]:
        out.append("Archetypes (A = Attack, C = Counter, D = Defense specialist; Gen = generalist; SlowHib = slow hybrid), row vs column:")
        out.append("")
        out.append("| | " + " | ".join(am["names"]) + " |")
        out.append("| --- |" + " --- |" * len(am["names"]))
        for name, vals in zip(am["names"], am["values"]):
            out.append(f"| **{name}** | " + " | ".join(_f(v) for v in vals) + " |")
        out.append("")
    return out


def studies_section(s: dict) -> list[str]:
    out = []
    es = s.get("element_study")
    if es:
        out += ["### Elements and weakness", "", "Value of a character against an identical character (or the stated pair) depending on the element relation:", "",
                "| Case | Value |", "| --- | --- |"]
        for r in es:
            out.append(f"| {r['case']} | {_f(r['value'])} |")
        out.append("")
    ss = s.get("special_study")
    if ss:
        carriers = [k for k in ss["baseline"]]
        cfg = s.get("studies_config") or s["config"]
        out += ["### Specials", "",
                f"Constants: element ±{cfg['element_bonus']}, weakness −{cfg['weakness_penalty']}, Armor −{cfg['armor_strength']}, Endurance +{cfg['endurance_energy']} energy, "
                f"Pressure/Finisher +{cfg['pressure_bonus']}/+{cfg['finisher_bonus']}, Counterstrike +{cfg['counter_bonus']}, First Strike {cfg['first_strike_mode']} (+{cfg['first_strike_bonus']}), "
                f"Adaptation {cfg['adaptation_mode']}, Balance {cfg['balance_mode']} (shield {cfg['balance_shield']}).", "",
                "Average value of a special's carrier against a field of 9 archetypes without specials, equal elements; in parentheses the change relative to the same carrier without the special. "
                "Adaptation cannot show value in this setup (there are no element relations); its value comes from element exposure. " "",
                "| Special | " + " | ".join(carriers) + " | Mean change |",
                "| --- |" + " --- |" * (len(carriers) + 1)]
        out.append("| *(no special)* | " + " | ".join(_f(ss["baseline"][c]) for c in carriers) + " | — |")
        for r in ss["rows"]:
            cells = " | ".join(f"{_f(r[c])} ({r[c + '_delta']:+.2f})" for c in carriers)
            out.append(f"| {r['special']} | {cells} | {r['mean_delta']:+.3f} |")
        out.append("")
    return out


def economy_section() -> list[str]:
    cfg = DEFAULT_ECONOMY
    fp = founder_position(cfg)
    out = ["## 2. Economy", "", "### LaunchPool and founder position", ""]
    out.append(f"V = {cfg.lp_virtual_eth:g} ETH, {cfg.tl_to_launchpool / 1e6:.0f} M TL on the curve, founder buy {cfg.founder_buy_eth} ETH → "
               f"{fp['tl'] / 1e6:.1f} M TL ({fp['share_of_supply']:.1%} of supply), price after the buy {fp['price_after']:.2e} ETH/TL "
               f"(1 M TL ≈ {_usd(fp['price_after'] * 1e6)}).")
    out.append("")
    out += ["| Total inflow (incl. founder) | Spot (ETH/TL) | Paper value of the founder TL | Realisable by selling everything |", "| --- | --- | --- | --- |"]
    for r in founder_table([cfg.founder_buy_eth, 10, cfg.founder_buy_eth + 30, 50, 100], cfg):
        out.append(f"| {_f(r['total_inflow'])} ETH | {r['price']:.2e} | {_f(r['paper'], 1)} ETH ({_usd(r['paper'])}) | {_f(r['realizable'], 1)} ETH ({_usd(r['realizable'])}) |")
    out.append("")
    out += ["### Daily cap: price ceiling per day", "", "| Day | Max inflow | Ceiling ÷ price after founder | Character (mint fee) at most | Max sold from the curve |", "| --- | --- | --- | --- | --- |"]
    for r in ceiling_table([1, 3, 7, 14, 21, 30], cfg):
        out.append(f"| {r['day']} | {_f(r['max_total_inflow'], 1)} ETH | {_f(r['x_post_founder'], 1)}× | {_usd(r['mint_fee_eth'])} | {r['max_sold_share_of_curve']:.0%} |")
    out.append("")
    out += ["### RewardPool over 36 months (seed 100 M TL, 24-month release)", ""]
    for sc in SCENARIOS:
        rows = reward_pool_trajectory(sc, cfg)
        pick = {1: rows[0], 6: rows[5], 12: rows[11], 24: rows[23], 36: rows[35]}
        out.append(f"**Scenario {sc.name}**: {sc.chars_per_month:g} characters, {sc.matches_per_month:g} matches of {sc.avg_stake_tl:g} TL, volume {sc.trade_volume_tl / 1e6:g} M TL per month.")
        out.append("")
        out.append("| Month | Balance | Locked seed | Inflow (mint+trade+rake) | To stakers | Season prize | First place | Burn |")
        out.append("| --- | --- | --- | --- | --- | --- | --- | --- |")
        for m, r in pick.items():
            out.append(f"| {m} | {_tl(r['balance'])} | {_tl(r['locked'])} | {_tl(r['mint_in'] + r['trade_in'] + r['rake_in'])} | {_tl(r['staker_out'])} | {_tl(r['season_out'])} | {_tl(r['first_place'])} | {_tl(r['burn'])} |")
        out.append("")
    out += ["### Farming the season prize", "", "An attacker with one favourite and 6 puppets, 20 rated matches of 100 TL (the minimum stake), assuming they win first place:", "",
            "| Available in RewardPool | Cost (mint + burn) | Capital tied up (licenses) | Prize for 1st place | Net |", "| --- | --- | --- | --- | --- |"]
    for avail in [500_000, 2_000_000, 10_000_000, 50_000_000]:
        f = farming_breakeven(avail, 6, 20, 100, cfg)
        out.append(f"| {_tl(avail)} | {_tl(f['mint_cost'] + f['burn_cost'])} | {_tl(f['capital_tied'])} | {_tl(f['prize_if_first'])} | {_tl(f['net_if_first'])} |")
    f = farming_breakeven(1, 6, 20, 100, cfg)
    out.append("")
    out.append(f"Break-even available balance: {_tl(f['breakeven_available'])}. Above that, farming is profitable **if** the attacker actually wins first place against real players, "
               "which the rules (3 rated matches per pair, 6 distinct opponents, license) make expensive; the lower bound of the cost grows linearly with the number of puppets.")
    out.append("")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sweep", required=True)
    ap.add_argument("--sensitivity", nargs="*", default=[])
    ap.add_argument("--studies", default=None, help="JSON whose element/special studies replace the sweep's")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    with open(args.sweep, encoding="utf-8") as f:
        main_sweep = json.load(f)
    if args.studies:
        with open(args.studies, encoding="utf-8") as f:
            st = json.load(f)
        main_sweep["element_study"] = st.get("element_study")
        main_sweep["special_study"] = st.get("special_study")
        main_sweep["studies_config"] = st.get("config")
    sens = []
    for p in args.sensitivity:
        with open(p, encoding="utf-8") as f:
            sens.append(json.load(f))

    lines = [f"# Balance report (WP1) — {dt.date.today().isoformat()}", "",
             "> Note: the token was renamed to Trenchampionship (TRCH) on 2026-10-09. In this generated report and in the simulation the label TL means TRCH.", "",
             "Generated from `sim/` (`traitleague_sim.report`). Method: for every pair of compositions a zero-sum game over the full tactic space "
             "(27 stance sequences × energy distributions) is solved with a double-oracle Nash solver; value = P(win) + ½ P(draw) under optimal play by both sides. "
             "Formula: the design notes §7.3 (variant L).", "",
             "## 1. Battle balance", ""]
    lines += sweep_section(main_sweep, "Main sweep")
    lines += studies_section(main_sweep)
    if sens:
        lines += ["### Stance bonus sensitivity", ""]
        lines += ["| Stance bonus | Best | Worst | SD | > 0.60 | < 0.40 |", "| --- | --- | --- | --- | --- | --- |"]
        for s in sorted(sens + [main_sweep], key=lambda x: x["config"]["stance_bonus"]):
            lines.append(f"| +{s['config']['stance_bonus']} | {_f(s['avg_max'])} | {_f(s['avg_min'])} | {_f(s['avg_std'], 3)} | {s['share_above_060']:.0%} | {s['share_below_040']:.0%} |")
        lines.append("")
    lines += economy_section()
    lines += ["## 3. Conclusion and constants for Config.sol", "",
              "Filled in by hand after reading the tables (see CHANGELOG and the design notes §7.3, §17).", ""]
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
