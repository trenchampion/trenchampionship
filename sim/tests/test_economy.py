import pytest

from traitleague_sim.constants import DEFAULT_ECONOMY as CFG
from traitleague_sim.economy import (
    SCENARIOS,
    buy,
    cap_allowance,
    ceiling_table,
    eth_for_tokens,
    farming_breakeven,
    founder_position,
    founder_table,
    initial_state,
    reward_pool_trajectory,
    sell,
)


def test_founder_buy_is_about_twenty_percent():
    fp = founder_position()
    assert fp["share_of_supply"] == pytest.approx(0.20, abs=0.002)
    assert eth_for_tokens(200_000_000) == pytest.approx(0.2857, abs=0.001)
    assert fp["price_after"] == pytest.approx(1.84e-9, rel=0.02)


def test_sell_everything_returns_at_most_what_went_in():
    st = initial_state()
    st, tl1 = buy(st, 0.2857)
    st, tl2 = buy(st, 10.0)
    st, out = sell(st, tl1 + tl2)
    assert out == pytest.approx(10.2857, abs=1e-9)
    assert st.eth_in == pytest.approx(0.0, abs=1e-9)
    assert st.tokens == pytest.approx(CFG.tl_to_launchpool)


def test_price_is_monotonic_in_eth():
    st = initial_state()
    last = st.price(CFG)
    for _ in range(50):
        st, _ = buy(st, 0.5)
        assert st.price(CFG) > last
        last = st.price(CFG)


def test_cap_and_ceiling():
    assert cap_allowance(0) == 0
    assert cap_allowance(7) == 7
    assert cap_allowance(45) == 30
    rows = {r["day"]: r for r in ceiling_table([1, 7, 30])}
    # V = 1 with the cap kept at 1 ETH/day: (1 + 0.2857 + 30)^2 / (1 + 0.2857)^2 = 592
    assert rows[30]["x_post_founder"] == pytest.approx(592, abs=2)
    assert rows[30]["max_sold_share_of_curve"] == pytest.approx(0.97, abs=0.01)


def test_founder_table_realizable_le_paper():
    for r in founder_table([0.2857, 10, 50, 100]):
        assert r["realizable"] <= r["paper"] + 1e-9
    assert founder_table([0.2857])[0]["realizable"] == pytest.approx(0.2857, abs=1e-6)


def test_reward_pool_never_negative_and_seed_locked():
    for sc in SCENARIOS:
        rows = reward_pool_trajectory(sc)
        for r in rows:
            assert r["available"] >= -1e-6
            assert r["balance"] >= r["locked"] - 1e-6
        assert rows[-1]["locked"] == 0  # 36 months > 24-month release


def test_farming_breakeven_scales_with_costs():
    f = farming_breakeven(available_pool_tl=1_000_000, puppets=6, matches=20, stake_tl=100)
    assert f["mint_cost"] == 35_000
    assert f["capital_tied"] == 70_000
    assert f["prize_if_first"] == 80_000
    assert f["breakeven_available"] > 400_000
