import itertools
import random

import numpy as np
import pytest

from traitleague_sim.battle import (
    Tactics,
    Traits,
    bases,
    element_modifier,
    payoff_matrix,
    resolve,
    strategies,
    validate_tactics,
    validate_traits,
)
from traitleague_sim.constants import (
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


def test_pentagon_is_antisymmetric_and_balanced():
    for a in range(5):
        wins = sum(element_modifier(a, b) > 0 for b in range(5))
        losses = sum(element_modifier(a, b) < 0 for b in range(5))
        assert (wins, losses) == (2, 2)
        for b in range(5):
            assert element_modifier(a, b) == -element_modifier(b, a)
    assert element_modifier(0, 1) == CFG.element_bonus  # Fire beats Air
    assert element_modifier(4, 0) == CFG.element_bonus  # Shadow beats Fire


def test_validation():
    validate_traits(Traits(15, 15, 14, 1))  # 45
    with pytest.raises(ValueError):
        validate_traits(Traits(16, 14, 14, 1))
    with pytest.raises(ValueError):
        validate_traits(Traits(10, 10, 10, 10))  # 40 is never valid in the adopted design
    with pytest.raises(ValueError):
        validate_traits(Traits(10, 10, 10, 10, special=BALANCE))
    validate_traits(Traits(11, 11, 12, 11, special=BALANCE))
    t = Traits(11, 11, 12, 11)  # energy 5 + 6 = 11
    validate_tactics(Tactics((0, 1, 2), (4, 4, 3)), t)
    with pytest.raises(ValueError):
        validate_tactics(Tactics((0, 1, 2), (4, 4, 4)), t)
    assert CFG.energy_budget(12, ENDURANCE) == 11 + CFG.endurance_energy


def test_cyclic_bases_and_armor():
    me = Traits(15, 1, 14, 15)
    opp = Traits(10, 10, 15, 10)
    assert bases(me, opp) == (15 + 7, 1 + 7, 15 + 0)
    armored = Traits(10, 10, 15, 10, special=ARMOR)
    assert bases(me, armored) == (15 - CFG.armor_strength + 7, 1 + (15 - CFG.armor_strength) // 2, 15 + 0)
    weak = Traits(1, 15, 14, 15)
    assert bases(weak, armored)[0] == 1 + 7  # strength floors at 1


def test_stance_bonus_and_tiebreak():
    a = Traits(10, 10, 15, 10)
    b = Traits(10, 10, 14, 11)
    # equal bases in Attack (10+5 vs 10+5): A wins on speed when R ties
    ta = Tactics((ATTACK, ATTACK, ATTACK), (4, 4, 4))
    tb = Tactics((ATTACK, ATTACK, ATTACK), (4, 4, 4))
    res = resolve(a, b, ta, tb)
    assert res.outcome == 1 and all(r.winner == 1 for r in res.rounds)
    # B counters with Counter (+8): 10+5+8 vs 15 -> B wins every round
    tb = Tactics((COUNTER, COUNTER, COUNTER), (4, 4, 4))
    assert resolve(a, b, ta, tb).outcome == -1
    # same character, same tactics -> full draw
    assert resolve(a, a, ta, ta).outcome == 0


def test_specials_apply_where_specified():
    base = Traits(11, 11, 12, 11)
    opp = Traits(11, 11, 12, 11, element=1)  # Air loses to Fire(0): opp gets -3, base gets +3
    t = Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 3))
    plain = resolve(base, opp, t, t)
    pressure = resolve(Traits(11, 11, 12, 11, special=PRESSURE), opp, t, t)
    assert pressure.rounds[0].r_a == plain.rounds[0].r_a + CFG.pressure_bonus
    assert pressure.rounds[1].r_a == plain.rounds[1].r_a
    finisher = resolve(Traits(11, 11, 12, 11, special=FINISHER), opp, t, t)
    assert finisher.rounds[2].r_a == plain.rounds[2].r_a + CFG.finisher_bonus
    # Counterstrike only in Counter vs Attack
    t_opp = Tactics((ATTACK, ATTACK, ATTACK), (4, 4, 3))
    me = Traits(11, 11, 12, 11, special=COUNTERSTRIKE)
    r = resolve(me, opp, Tactics((COUNTER, DEFENSE, COUNTER), (4, 4, 3)), t_opp)
    r0 = resolve(base, opp, Tactics((COUNTER, DEFENSE, COUNTER), (4, 4, 3)), t_opp)
    assert r.rounds[0].r_a == r0.rounds[0].r_a + CFG.counter_bonus
    assert r.rounds[1].r_a == r0.rounds[1].r_a
    # Adaptation zeroes my element and weakness, not the opponent's
    weak_me = Traits(11, 11, 12, 11, element=0, weakness=1)
    r_weak = resolve(weak_me, opp, t, t)
    assert r_weak.rounds[0].r_a == plain.rounds[0].r_a - CFG.weakness_penalty
    adapt = Traits(11, 11, 12, 11, element=0, weakness=1, special=ADAPTATION)
    r_adapt = resolve(adapt, opp, t, t)
    assert r_adapt.rounds[0].r_a == plain.rounds[0].r_a  # keeps the +element, ignores the weakness
    assert r_adapt.rounds[0].r_b == plain.rounds[0].r_b
    losing = Traits(11, 11, 12, 11, element=3, weakness=4, special=ADAPTATION)  # Water loses to Air? no: Air(1) vs Water(3): Water beats Fire, Air; here opp is Air -> Water loses
    r_losing = resolve(losing, opp, t, t)
    assert r_losing.rounds[0].r_a == resolve(Traits(11, 11, 12, 11, element=3, weakness=4), opp, t, t).rounds[0].r_a + CFG.element_bonus
    # Balance (defensive): budget 45, weakness applies, opponent's stance bonus against me is reduced
    bal = Traits(11, 11, 12, 11, element=0, weakness=1, special=BALANCE)
    r_bal = resolve(bal, opp, Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 3)), Tactics((COUNTER, COUNTER, COUNTER), (4, 4, 3)))
    plain_vs_kontra = resolve(Traits(11, 11, 12, 11, element=0, weakness=1), opp, Tactics((ATTACK, DEFENSE, COUNTER), (4, 4, 3)), Tactics((COUNTER, COUNTER, COUNTER), (4, 4, 3)))
    assert r_bal.rounds[0].r_b == plain_vs_kontra.rounds[0].r_b - CFG.balance_shield  # Counter beats my Attack: shielded
    assert r_bal.rounds[1].r_b == plain_vs_kontra.rounds[1].r_b  # Defense beats Counter: opp gets no bonus anyway
    assert r_bal.rounds[0].r_a == plain_vs_kontra.rounds[0].r_a  # weakness still applies to me
    # First strike (attack_r1): +4 in round 1 only when attacking
    fast = Traits(11, 11, 12, 11, special=FIRST_STRIKE)
    same = Traits(11, 11, 12, 11)
    tt = Tactics((ATTACK, ATTACK, ATTACK), (4, 4, 3))
    r = resolve(fast, same, tt, tt)
    r0 = resolve(same, same, tt, tt)
    assert r.rounds[0].r_a == r0.rounds[0].r_a + CFG.first_strike_bonus
    assert r.rounds[1].r_a == r0.rounds[1].r_a
    assert resolve(fast, same, Tactics((DEFENSE, ATTACK, ATTACK), (4, 4, 3)), tt).rounds[0].r_a == resolve(same, same, Tactics((DEFENSE, ATTACK, ATTACK), (4, 4, 3)), tt).rounds[0].r_a


def test_vectorised_matches_scalar():
    rng = random.Random(7)
    for _ in range(12):
        a, b = rand_traits(rng), rand_traits(rng)
        M = payoff_matrix(a, b)
        st_a, en_a = strategies(CFG.energy_budget(a.speed, a.special))
        st_b, en_b = strategies(CFG.energy_budget(b.speed, b.special))
        assert M.shape == (len(st_a), len(st_b))
        for _ in range(25):
            i, j = rng.randrange(len(st_a)), rng.randrange(len(st_b))
            ta = Tactics(tuple(int(x) for x in st_a[i]), tuple(int(x) for x in en_a[i]))
            tb = Tactics(tuple(int(x) for x in st_b[j]), tuple(int(x) for x in en_b[j]))
            assert M[i, j] == pytest.approx(resolve(a, b, ta, tb).value_a)


def test_payoff_is_antisymmetric():
    rng = random.Random(3)
    for _ in range(5):
        a, b = rand_traits(rng), rand_traits(rng)
        assert np.allclose(payoff_matrix(a, b), 1 - payoff_matrix(b, a).T)


def test_strategy_count():
    st, en = strategies(10)
    assert len(st) == 27 * 66
    assert all(e.sum() == 10 for e in en)
