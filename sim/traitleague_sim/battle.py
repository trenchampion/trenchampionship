"""Deterministic battle engine (reference implementation of BattleEngine.sol).

Scalar `resolve` is the readable source of truth. `payoff_matrix` is a vectorised
re-implementation used by the Nash solver; `tests/test_battle.py` checks that both agree
on random inputs.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from .constants import (
    ADAPTATION,
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
    BattleConfig,
    DEFAULT_BATTLE,
)

# BEATS[a, b] == 1 when stance a beats stance b
BEATS = np.array([[0, 1, 0], [0, 0, 1], [1, 0, 0]], dtype=np.int16)


@dataclass(frozen=True)
class Traits:
    strength: int
    defense: int
    speed: int
    focus: int
    element: int = 0
    special: int = 0
    weakness: int = 0  # element that deals extra damage to me

    def as_tuple(self) -> tuple[int, int, int, int]:
        return (self.strength, self.defense, self.speed, self.focus)


@dataclass(frozen=True)
class Tactics:
    stances: tuple[int, int, int]
    energies: tuple[int, int, int]


@dataclass(frozen=True)
class RoundResult:
    r_a: int
    r_b: int
    winner: int  # 1 = A, -1 = B, 0 = drawn round


@dataclass(frozen=True)
class MatchResult:
    rounds: tuple[RoundResult, ...]
    rounds_a: int
    rounds_b: int

    @property
    def outcome(self) -> int:
        """1 = A wins, -1 = B wins, 0 = draw."""
        if self.rounds_a > self.rounds_b:
            return 1
        if self.rounds_b > self.rounds_a:
            return -1
        return 0

    @property
    def value_a(self) -> float:
        return {1: 1.0, 0: 0.5, -1: 0.0}[self.outcome]


# --- validation -----------------------------------------------------------------------------


def validate_traits(t: Traits, cfg: BattleConfig = DEFAULT_BATTLE) -> None:
    for v in t.as_tuple():
        if not cfg.trait_min <= v <= cfg.trait_max:
            raise ValueError(f"trait out of range: {v}")
    if sum(t.as_tuple()) != cfg.trait_budget(t.special):
        raise ValueError(f"budget {sum(t.as_tuple())} != {cfg.trait_budget(t.special)}")
    if not 0 <= t.element <= 4 or not 0 <= t.weakness <= 4:
        raise ValueError("element/weakness out of range")
    if not 0 <= t.special <= 8:
        raise ValueError("special out of range")


def validate_tactics(tac: Tactics, t: Traits, cfg: BattleConfig = DEFAULT_BATTLE) -> None:
    if len(tac.stances) != cfg.rounds or len(tac.energies) != cfg.rounds:
        raise ValueError("wrong number of rounds")
    if any(s not in (ATTACK, DEFENSE, COUNTER) for s in tac.stances):
        raise ValueError("bad stance")
    if any(e < 0 for e in tac.energies):
        raise ValueError("negative energy")
    if sum(tac.energies) != cfg.energy_budget(t.speed, t.special):
        raise ValueError("energy must sum to the budget")


# --- scalar engine --------------------------------------------------------------------------


def element_modifier(my_el: int, opp_el: int, cfg: BattleConfig = DEFAULT_BATTLE) -> int:
    d = (opp_el - my_el) % 5
    if d in (1, 2):
        return cfg.element_bonus
    if d in (3, 4):
        return -cfg.element_bonus
    return 0


def bases(me: Traits, opp: Traits, cfg: BattleConfig = DEFAULT_BATTLE) -> tuple[int, int, int]:
    """Base value per stance (Attack, Defense, Counter). Cyclic formula, variant L."""
    s = me.strength
    if opp.special == ARMOR:
        s = max(cfg.trait_min, s - cfg.armor_strength)
    return (
        s + me.focus // 2,  # Attack
        me.defense + s // 2,  # Defense
        me.focus + me.defense // 2,  # Counter
    )


def element_term(me: Traits, opp: Traits, cfg: BattleConfig = DEFAULT_BATTLE) -> int:
    """My element modifier including the weakness penalty; constant across rounds."""
    if me.special == ADAPTATION:
        if cfg.adaptation_mode == "spec":
            return 0
        return max(0, element_modifier(me.element, opp.element, cfg))  # variant: never negative, no weakness
    m = element_modifier(me.element, opp.element, cfg)
    weakness_immune = me.special == BALANCE and cfg.balance_mode == "spec"
    if opp.element == me.weakness and not weakness_immune:
        m -= cfg.weakness_penalty
    return m


def stance_bonus_against(me: Traits, opp: Traits, cfg: BattleConfig = DEFAULT_BATTLE) -> int:
    """Stance bonus the opponent receives when their stance beats mine."""
    if me.special == BALANCE and cfg.balance_mode == "defensive":
        return cfg.stance_bonus - cfg.balance_shield
    return cfg.stance_bonus


def tiebreak_speed(me: Traits, round_index: int, cfg: BattleConfig = DEFAULT_BATTLE) -> int:
    sp = me.speed
    if me.special == FIRST_STRIKE and cfg.first_strike_mode == "spec" and round_index == 0:
        sp += cfg.first_strike_speed
    return sp


def round_score(
    me: Traits, opp: Traits, my_stance: int, opp_stance: int, energy: int, round_index: int,
    cfg: BattleConfig = DEFAULT_BATTLE,
) -> int:
    r = bases(me, opp, cfg)[my_stance] + cfg.energy_mult * energy
    if BEATS[my_stance, opp_stance]:
        r += stance_bonus_against(opp, me, cfg)
    r += element_term(me, opp, cfg)
    if me.special == FIRST_STRIKE and cfg.first_strike_mode == "attack_r1" and round_index == 0 and my_stance == ATTACK:
        r += cfg.first_strike_bonus
    if me.special == PRESSURE and round_index == 0:
        r += cfg.pressure_bonus
    if me.special == FINISHER and round_index == cfg.rounds - 1:
        r += cfg.finisher_bonus
    if me.special == COUNTERSTRIKE and my_stance == COUNTER and opp_stance == ATTACK:
        r += cfg.counter_bonus
    return r


def resolve(a: Traits, b: Traits, ta: Tactics, tb: Tactics, cfg: BattleConfig = DEFAULT_BATTLE) -> MatchResult:
    rounds: list[RoundResult] = []
    wa = wb = 0
    for i in range(cfg.rounds):
        ra = round_score(a, b, ta.stances[i], tb.stances[i], ta.energies[i], i, cfg)
        rb = round_score(b, a, tb.stances[i], ta.stances[i], tb.energies[i], i, cfg)
        if ra > rb:
            w = 1
        elif rb > ra:
            w = -1
        else:
            sa, sb = tiebreak_speed(a, i, cfg), tiebreak_speed(b, i, cfg)
            w = 1 if sa > sb else (-1 if sb > sa else 0)
        wa += w == 1
        wb += w == -1
        rounds.append(RoundResult(ra, rb, w))
    return MatchResult(tuple(rounds), wa, wb)


# --- vectorised engine for the solver ------------------------------------------------------


@lru_cache(maxsize=None)
def strategies(energy_budget: int, rounds: int = 3) -> tuple[np.ndarray, np.ndarray]:
    """All (stance sequence, energy composition) pairs: arrays (n, rounds) of stances and energies."""
    stances = np.array(list(itertools.product((ATTACK, DEFENSE, COUNTER), repeat=rounds)), dtype=np.int16)
    comps = np.array(
        [c for c in itertools.product(range(energy_budget + 1), repeat=rounds) if sum(c) == energy_budget],
        dtype=np.int16,
    )
    s_idx = np.repeat(np.arange(len(stances)), len(comps))
    e_idx = np.tile(np.arange(len(comps)), len(stances))
    return stances[s_idx], comps[e_idx]


def payoff_matrix(a: Traits, b: Traits, cfg: BattleConfig = DEFAULT_BATTLE) -> np.ndarray:
    """Payoff for A (1 win, 0.5 draw, 0 loss) over all tactic pairs; shape (nA, nB), float32."""
    st_a, en_a = strategies(cfg.energy_budget(a.speed, a.special), cfg.rounds)
    st_b, en_b = strategies(cfg.energy_budget(b.speed, b.special), cfg.rounds)
    base_a = np.array(bases(a, b, cfg), dtype=np.int16)
    base_b = np.array(bases(b, a, cfg), dtype=np.int16)
    const_a = element_term(a, b, cfg)
    const_b = element_term(b, a, cfg)
    wins = np.zeros((len(st_a), len(st_b)), dtype=np.int8)
    for i in range(cfg.rounds):
        sa, sb = st_a[:, i], st_b[:, i]
        ra = base_a[sa] + cfg.energy_mult * en_a[:, i] + const_a
        rb = base_b[sb] + cfg.energy_mult * en_b[:, i] + const_b
        if a.special == PRESSURE and i == 0:
            ra = ra + cfg.pressure_bonus
        if b.special == PRESSURE and i == 0:
            rb = rb + cfg.pressure_bonus
        if a.special == FINISHER and i == cfg.rounds - 1:
            ra = ra + cfg.finisher_bonus
        if b.special == FINISHER and i == cfg.rounds - 1:
            rb = rb + cfg.finisher_bonus
        if a.special == FIRST_STRIKE and cfg.first_strike_mode == "attack_r1" and i == 0:
            ra = ra + cfg.first_strike_bonus * (sa == ATTACK)
        if b.special == FIRST_STRIKE and cfg.first_strike_mode == "attack_r1" and i == 0:
            rb = rb + cfg.first_strike_bonus * (sb == ATTACK)
        diff = ra.astype(np.int16)[:, None] - rb.astype(np.int16)[None, :]
        bonus_for_a = stance_bonus_against(b, a, cfg)  # bonus A gets when beating B
        bonus_for_b = stance_bonus_against(a, b, cfg)
        diff = diff + bonus_for_a * BEATS[sa][:, sb] - bonus_for_b * BEATS[sb][:, sa].T
        if a.special == COUNTERSTRIKE:
            diff = diff + cfg.counter_bonus * ((sa == COUNTER)[:, None] & (sb == ATTACK)[None, :])
        if b.special == COUNTERSTRIKE:
            diff = diff - cfg.counter_bonus * ((sb == COUNTER)[None, :] & (sa == ATTACK)[:, None])
        tb_a, tb_b = tiebreak_speed(a, i, cfg), tiebreak_speed(b, i, cfg)
        tie = 1 if tb_a > tb_b else (-1 if tb_b > tb_a else 0)
        wins += np.sign(diff).astype(np.int8) + ((diff == 0) * tie).astype(np.int8)
    return np.where(wins > 0, 1.0, np.where(wins < 0, 0.0, 0.5)).astype(np.float32)
