# Balance report (WP1) — 2026-10-02

> Note (2026-10-09): the token was renamed to Trenchampionship (TRCH). In this generated report and in the simulation the label TL means TRCH; the figures are unchanged. LaunchPool tables regenerated on 2026-10-13 after the founder set V = 1 ETH (founder buy 2/7 ETH for 20 %); battle and RewardPool figures are unchanged.

Generated from `sim/` (`traitleague_sim.report`). Method: for every pair of compositions a zero-sum game over the full tactic space (27 stance sequences × energy distributions) is solved with a double-oracle Nash solver; value = P(win) + ½ P(draw) under optimal play by both sides. Formula: the design notes §7.3 (variant L).

## 1. Battle balance

### Main sweep

Configuration: cap 15, budget 45, stance bonus +8, energy 2E, energy budget 5 + Speed/2. Sample: 80 compositions (3160 Nash solutions, 855 s).

| Metric | Value | Criterion |
| --- | --- | --- |
| Best composition (average against the sample) | 0.56 | ≤ 0.60 ✅ |
| Worst composition | 0.46 | ≥ 0.35 ✅ |
| Standard deviation of the averages | 0.023 | lower is flatter |
| Share of compositions above 0.60 | 0% | 0 % |
| Share of compositions below 0.40 | 0% | as low as possible |

Top 8 and bottom 8 (Strength/Defense/Speed/Focus):

| # | Composition | Average | Worst match |
| --- | --- | --- | --- |
| 1 | 14/14/4/13 (14, 14, 4, 13) | 0.56 | 0.48 |
| 2 | SlowHib (14, 14, 3, 14) | 0.55 | 0.47 |
| 3 | 15/13/2/15 (15, 13, 2, 15) | 0.55 | 0.45 |
| 4 | 11/14/6/14 (11, 14, 6, 14) | 0.55 | 0.43 |
| 5 | 8/14/8/15 (8, 14, 8, 15) | 0.54 | 0.28 |
| 6 | 15/14/1/15 (15, 14, 1, 15) | 0.54 | 0.44 |
| 7 | 12/14/5/14 (12, 14, 5, 14) | 0.54 | 0.46 |
| 8 | 14/14/5/12 (14, 14, 5, 12) | 0.54 | 0.44 |
| … | | | |
| 73 | 15/11/11/8 (15, 11, 11, 8) | 0.47 | 0.17 |
| 74 | 11/12/13/9 (11, 12, 13, 9) | 0.47 | 0.37 |
| 75 | 13/8/15/9 (13, 8, 15, 9) | 0.47 | 0.34 |
| 76 | A-spec (15, 1, 14, 15) | 0.46 | 0.00 |
| 77 | 11/8/13/13 (11, 8, 13, 13) | 0.46 | 0.24 |
| 78 | 11/6/15/13 (11, 6, 15, 13) | 0.46 | 0.18 |
| 79 | 13/5/15/12 (13, 5, 15, 12) | 0.46 | 0.18 |
| 80 | 15/14/13/3 (15, 14, 13, 3) | 0.46 | 0.01 |

Archetypes (A = Attack, C = Counter, D = Defense specialist; Gen = generalist; SlowHib = slow hybrid), row vs column:

| | A-spec | C-spec | D-spec | A-spec-slow | C-spec-slow | D-spec-slow | Gen | Gen-fast | SlowHib | A/C | D/C | A/D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **A-spec** | 0.50 | 0.00 | 0.99 | 0.51 | 0.11 | 1.00 | 0.53 | 0.46 | 0.41 | 0.49 | 0.01 | 0.99 |
| **C-spec** | 1.00 | 0.50 | 0.00 | 1.00 | 0.51 | 0.11 | 0.53 | 0.46 | 0.41 | 0.99 | 0.49 | 0.01 |
| **D-spec** | 0.01 | 1.00 | 0.50 | 0.11 | 1.00 | 0.51 | 0.53 | 0.46 | 0.41 | 0.01 | 0.99 | 0.49 |
| **A-spec-slow** | 0.49 | 0.00 | 0.89 | 0.50 | 0.22 | 0.78 | 0.46 | 0.51 | 0.44 | 0.47 | 0.18 | 0.72 |
| **C-spec-slow** | 0.89 | 0.49 | 0.00 | 0.78 | 0.50 | 0.22 | 0.46 | 0.51 | 0.44 | 0.72 | 0.47 | 0.18 |
| **D-spec-slow** | 0.00 | 0.89 | 0.49 | 0.22 | 0.78 | 0.50 | 0.46 | 0.51 | 0.44 | 0.18 | 0.72 | 0.47 |
| **Gen** | 0.47 | 0.47 | 0.47 | 0.54 | 0.54 | 0.54 | 0.50 | 0.52 | 0.39 | 0.47 | 0.47 | 0.47 |
| **Gen-fast** | 0.54 | 0.54 | 0.54 | 0.49 | 0.49 | 0.49 | 0.48 | 0.50 | 0.44 | 0.53 | 0.53 | 0.53 |
| **SlowHib** | 0.59 | 0.59 | 0.59 | 0.56 | 0.56 | 0.56 | 0.61 | 0.56 | 0.50 | 0.54 | 0.54 | 0.54 |
| **A/C** | 0.51 | 0.01 | 0.99 | 0.53 | 0.28 | 0.82 | 0.53 | 0.47 | 0.46 | 0.50 | 0.18 | 0.82 |
| **D/C** | 0.99 | 0.51 | 0.01 | 0.82 | 0.53 | 0.28 | 0.53 | 0.47 | 0.46 | 0.82 | 0.50 | 0.18 |
| **A/D** | 0.01 | 0.99 | 0.51 | 0.28 | 0.82 | 0.53 | 0.53 | 0.47 | 0.46 | 0.18 | 0.82 | 0.50 |

### Elements and weakness

Value of a character against an identical character (or the stated pair) depending on the element relation:

| Case | Value |
| --- | --- |
| same element | 0.50 |
| my element wins (+3 / −3) | 0.64 |
| my element loses (−3 / +3) | 0.36 |
| I lose and my weakness is hit (−3 −4 / +3) | 0.24 |
| I win but my weakness is hit (+3 −4 / −3) | 0.50 |
| C-spec with the element edge against a Gen whose weakness is hit | 0.33 |
| C-spec against a Gen with the element edge | 0.33 |

### Specials

Constants: element ±1, weakness −2, Armor −2, Endurance +1 energy, Pressure/Finisher +2/+2, Counterstrike +8, First Strike attack_r1 (+4), Adaptation no_negative, Balance defensive (shield 2).

Average value of a special's carrier against a field of 9 archetypes without specials, equal elements; in parentheses the change relative to the same carrier without the special. Adaptation cannot show value in this setup (there are no element relations); its value comes from element exposure.

| Special | A-spec | C-spec | D-spec | Gen | Gen-fast | Mean change |
| --- | --- | --- | --- | --- | --- | --- |
| *(no special)* | 0.49 | 0.49 | 0.49 | 0.47 | 0.52 | — |
| FirstStrike | 0.56 (+0.07) | 0.53 (+0.04) | 0.56 (+0.07) | 0.53 (+0.06) | 0.55 (+0.04) | +0.057 |
| Armor | 0.49 (+0.01) | 0.53 (+0.05) | 0.62 (+0.13) | 0.55 (+0.08) | 0.59 (+0.08) | +0.068 |
| Endurance | 0.53 (+0.05) | 0.53 (+0.05) | 0.53 (+0.05) | 0.53 (+0.06) | 0.58 (+0.06) | +0.054 |
| Adaptation | 0.49 (+0.00) | 0.49 (+0.00) | 0.49 (+0.00) | 0.47 (+0.00) | 0.52 (+0.00) | +0.000 |
| Pressure | 0.53 (+0.04) | 0.53 (+0.04) | 0.53 (+0.04) | 0.53 (+0.06) | 0.57 (+0.06) | +0.050 |
| Finisher | 0.53 (+0.04) | 0.53 (+0.04) | 0.53 (+0.04) | 0.53 (+0.06) | 0.57 (+0.06) | +0.050 |
| Counterstrike | 0.49 (+0.00) | 0.49 (+0.00) | 0.65 (+0.16) | 0.51 (+0.04) | 0.55 (+0.03) | +0.046 |
| Balance | 0.56 (+0.07) | 0.56 (+0.07) | 0.56 (+0.07) | 0.53 (+0.06) | 0.58 (+0.07) | +0.070 |

### Stance bonus sensitivity

| Stance bonus | Best | Worst | SD | > 0.60 | < 0.40 |
| --- | --- | --- | --- | --- | --- |
| +7 | 0.56 | 0.43 | 0.032 | 0% | 0% |
| +8 | 0.56 | 0.46 | 0.023 | 0% | 0% |
| +9 | 0.55 | 0.44 | 0.022 | 0% | 0% |

## 2. Economy

### LaunchPool and founder position

V = 1 ETH, 900 M TL on the curve, founder buy 0.2857 ETH → 200.0 M TL (20.0% of supply), price after the buy 1.84e-09 ETH/TL (1 M TL ≈ $3.67).

| Total inflow (incl. founder) | Spot (ETH/TL) | Paper value of the founder TL | Realisable by selling everything |
| --- | --- | --- | --- |
| 0.29 ETH | 1.84e-09 | 0.4 ETH ($734.65) | 0.3 ETH ($571.40) |
| 10.00 ETH | 1.34e-07 | 26.9 ETH ($53.8k) | 7.8 ETH ($15.6k) |
| 30.29 ETH | 1.09e-06 | 217.5 ETH ($435.0k) | 27.4 ETH ($54.7k) |
| 50.00 ETH | 2.89e-06 | 578.0 ETH ($1156.0k) | 46.9 ETH ($93.7k) |
| 100.00 ETH | 1.13e-05 | 2266.8 ETH ($4533.6k) | 96.7 ETH ($193.4k) |

### Daily cap: price ceiling per day

| Day | Max inflow | Ceiling ÷ price after founder | Character (mint fee) at most | Max sold from the curve |
| --- | --- | --- | --- | --- |
| 1 | 1.3 ETH | 3.2× | $0.06 | 56% |
| 3 | 3.3 ETH | 11.1× | $0.20 | 77% |
| 7 | 7.3 ETH | 41.5× | $0.76 | 88% |
| 14 | 14.3 ETH | 141.3× | $2.60 | 93% |
| 21 | 21.3 ETH | 300.5× | $5.52 | 96% |
| 30 | 30.3 ETH | 592.1× | $10.88 | 97% |

### RewardPool over 36 months (seed 100 M TL, 24-month release)

**Scenario S**: 100 characters, 1000 matches of 500 TL, volume 5 M TL per month.

| Month | Balance | Locked seed | Inflow (mint+trade+rake) | To stakers | Season prize | First place | Burn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 99.29 M TL | 95.84 M TL | 180 k TL | 30 k TL | 863 k TL | 345 k TL | 270 k TL |
| 6 | 87.75 M TL | 75.01 M TL | 180 k TL | 30 k TL | 3.18 M TL | 1.27 M TL | 270 k TL |
| 12 | 66.10 M TL | 50.03 M TL | 180 k TL | 30 k TL | 4.02 M TL | 1.61 M TL | 270 k TL |
| 24 | 17.23 M TL | 55 k TL | 180 k TL | 30 k TL | 4.29 M TL | 1.72 M TL | 270 k TL |
| 36 | 1.74 M TL | 0 TL | 180 k TL | 30 k TL | 436 k TL | 174 k TL | 270 k TL |

**Scenario M**: 1000 characters, 10000 matches of 1000 TL, volume 100 M TL per month.

| Month | Balance | Locked seed | Inflow (mint+trade+rake) | To stakers | Season prize | First place | Burn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 100.57 M TL | 95.84 M TL | 2.35 M TL | 600 k TL | 1.18 M TL | 473 k TL | 2.90 M TL |
| 6 | 92.47 M TL | 75.01 M TL | 2.35 M TL | 600 k TL | 4.36 M TL | 1.75 M TL | 2.90 M TL |
| 12 | 72.06 M TL | 50.03 M TL | 2.35 M TL | 600 k TL | 5.51 M TL | 2.20 M TL | 2.90 M TL |
| 24 | 23.60 M TL | 55 k TL | 2.35 M TL | 600 k TL | 5.89 M TL | 2.35 M TL | 2.90 M TL |
| 36 | 8.14 M TL | 0 TL | 2.35 M TL | 600 k TL | 2.04 M TL | 814 k TL | 2.90 M TL |

**Scenario L**: 10000 characters, 100000 matches of 2000 TL, volume 2000 M TL per month.

| Month | Balance | Locked seed | Inflow (mint+trade+rake) | To stakers | Season prize | First place | Burn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 117.17 M TL | 95.84 M TL | 34.50 M TL | 12.00 M TL | 5.33 M TL | 2.13 M TL | 33.00 M TL |
| 6 | 153.71 M TL | 75.01 M TL | 34.50 M TL | 12.00 M TL | 19.67 M TL | 7.87 M TL | 33.00 M TL |
| 12 | 149.36 M TL | 50.03 M TL | 34.50 M TL | 12.00 M TL | 24.83 M TL | 9.93 M TL | 33.00 M TL |
| 24 | 106.21 M TL | 55 k TL | 34.50 M TL | 12.00 M TL | 26.54 M TL | 10.62 M TL | 33.00 M TL |
| 36 | 91.11 M TL | 0 TL | 34.50 M TL | 12.00 M TL | 22.78 M TL | 9.11 M TL | 33.00 M TL |

### Farming the season prize

An attacker with one favourite and 6 puppets, 20 rated matches of 100 TL (the minimum stake), assuming they win first place:

| Available in RewardPool | Cost (mint + burn) | Capital tied up (licenses) | Prize for 1st place | Net |
| --- | --- | --- | --- | --- |
| 500 k TL | 35 k TL | 70 k TL | 40 k TL | 5 k TL |
| 2.00 M TL | 35 k TL | 70 k TL | 160 k TL | 125 k TL |
| 10.00 M TL | 35 k TL | 70 k TL | 800 k TL | 765 k TL |
| 50.00 M TL | 35 k TL | 70 k TL | 4.00 M TL | 3.96 M TL |

Break-even available balance: 438 k TL. Above that, farming is profitable **if** the attacker actually wins first place against real players, which the rules (3 rated matches per pair, 6 distinct opponents, license) make expensive; the lower bound of the cost grows linearly with the number of puppets.

## 3. Conclusion and constants for Config.sol

**The formula (variant L) passes the criteria on 80 compositions:** average against the sample 0.46–0.56, no composition above 0.60 or below 0.40, standard deviation 0.02. Stance bonus +7 and +9 give almost the same range, so +8 is not an edge case. Pure specialists remain rock-paper-scissors among themselves (1.00/0.00), which is acceptable because on average they are the weakest compositions (0.46), while hybrids with two strong stances and low Speed are the strongest (0.56).

**Elements were too strong.** The SPEC's ±3 gives 0.86 against an identical character, and a hit weakness of −4 drops it to 0.03: element and weakness decided the match before tactics did. Adopted ±1 and −2: element edge 0.64, element edge with the weakness hit 0.50, element loss with the weakness hit 0.24.

**Specials were uneven** (First Strike +0.01, Balance −0.21, Endurance +0.11). Adopted: Armor −2, Endurance +1 energy, Pressure/Finisher +2, Counterstrike +8, First Strike = +4 in round 1 in Attack, Adaptation = never a negative element term, Balance = budget 45 and the opponent's stance bonus 6 instead of 8. Result: every special +0.046 to +0.070 (Adaptation ~+0.04 through element exposure). The SPEC versions remain in the simulation as variants.

**Limitations of this analysis:** a sample of 80 compositions with equal elements and no specials for the main sweep; the element and special studies run on archetypes; the values are Nash values under optimal play by both sides, i.e. an upper bound on what tactics can extract. Human play will deviate; the public testnet measures the actual win rates per composition.

**Frozen constants (Config.sol, Battle section):**

```
ROUNDS 3 · TRAIT_MIN 1 · TRAIT_MAX 15 · TRAIT_BUDGET 45
STANCE_BONUS 8 · ENERGY_MULT 2 · ENERGY_BASE 5 · ENERGY_SPEED_DIV 2
ELEMENT_BONUS 1 · WEAKNESS_PENALTY 2
FIRST_STRIKE_BONUS 4 (Attack, round 1) · ARMOR_STRENGTH 2 · ENDURANCE_ENERGY 1
PRESSURE_BONUS 2 · FINISHER_BONUS 2 · COUNTER_BONUS 8 · BALANCE_SHIELD 2
```

The same numbers are in `sim/traitleague_sim/constants.py` and `engine/src/constants.ts`; 220 shared vectors (`engine/vectors/battle-vectors.json`) confirm the bit-identity of the three implementations.
