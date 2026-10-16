import numpy as np
import pytest

from traitleague_sim.battle import Traits, payoff_matrix
from traitleague_sim.nash import double_oracle, exact_value, game_value, rm_plus


def test_rock_paper_scissors():
    M = np.array([[0.5, 0, 1], [1, 0.5, 0], [0, 1, 0.5]])
    assert exact_value(M) == pytest.approx(0.5)
    r = double_oracle(M)
    assert r.value == pytest.approx(0.5)
    assert sorted(r.row_support.tolist()) == [0, 1, 2]
    assert rm_plus(M, tol=1e-3).value == pytest.approx(0.5, abs=1e-3)


def test_double_oracle_matches_exact_on_random_games():
    rng = np.random.default_rng(11)
    for _ in range(20):
        n, m = rng.integers(5, 60), rng.integers(5, 60)
        M = rng.choice([0.0, 0.5, 1.0], size=(n, m), p=[0.4, 0.2, 0.4])
        assert double_oracle(M).value == pytest.approx(exact_value(M), abs=1e-6)


def test_rm_plus_certificate_on_random_games():
    rng = np.random.default_rng(5)
    for _ in range(10):
        n, m = rng.integers(20, 200), rng.integers(20, 200)
        M = rng.choice([0.0, 0.5, 1.0], size=(n, m), p=[0.4, 0.2, 0.4])
        r = rm_plus(M, iters=3000, tol=0.005)
        exact = exact_value(M)
        assert r.exploitability < 0.005 or r.iterations == 3000
        assert r.value == pytest.approx(exact, abs=max(r.exploitability, 0.005))


def test_rm_plus_on_small_battle_matrix():
    # speed 1 -> energy 5 (21 compositions) -> 567 strategies: exact LP is cheap here
    a = Traits(15, 14, 1, 15)
    b = Traits(14, 15, 1, 15)
    M = payoff_matrix(a, b)
    assert M.shape == (567, 567)
    exact = exact_value(M)
    r = rm_plus(M, tol=0.01)
    assert r.value == pytest.approx(exact, abs=0.01)
    assert game_value(M) == pytest.approx(exact, abs=1e-6)  # small games use the exact LP


def test_rm_plus_on_full_size_battle_matrix_is_fast_enough():
    a = Traits(15, 1, 14, 15)  # energy 12 -> 2457 strategies
    b = Traits(11, 11, 12, 11)  # energy 11 -> 2106 strategies
    M = payoff_matrix(a, b)
    r = rm_plus(M, tol=0.01)
    assert r.exploitability < 0.02
    assert 0.0 <= r.value <= 1.0
