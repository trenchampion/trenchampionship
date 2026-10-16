"""Economy model: LaunchPool curve, founder position, RewardPool trajectory, farming.

All functions are pure and take an EconomyConfig so the report can show sensitivity.
"""

from __future__ import annotations

from dataclasses import dataclass

from .constants import DEFAULT_ECONOMY, EconomyConfig

# --- LaunchPool curve (constant product with virtual ETH reserve) ---------------------------


@dataclass(frozen=True)
class CurveState:
    eth_in: float  # cumulative real ETH in the pool
    tokens: float  # TL left on the curve

    def price(self, cfg: EconomyConfig) -> float:
        return (cfg.lp_virtual_eth + self.eth_in) / self.tokens


def initial_state(cfg: EconomyConfig = DEFAULT_ECONOMY) -> CurveState:
    return CurveState(0.0, float(cfg.tl_to_launchpool))


def k(cfg: EconomyConfig = DEFAULT_ECONOMY) -> float:
    return cfg.lp_virtual_eth * cfg.tl_to_launchpool


def buy(state: CurveState, eth: float, cfg: EconomyConfig = DEFAULT_ECONOMY) -> tuple[CurveState, float]:
    """Spend `eth`; returns new state and TL received."""
    new_tokens = k(cfg) / (cfg.lp_virtual_eth + state.eth_in + eth)
    return CurveState(state.eth_in + eth, new_tokens), state.tokens - new_tokens


def sell(state: CurveState, tl: float, cfg: EconomyConfig = DEFAULT_ECONOMY) -> tuple[CurveState, float]:
    """Sell `tl`; returns new state and ETH received (never more than the real reserve)."""
    new_tokens = state.tokens + tl
    eth_side = k(cfg) / new_tokens
    out = (cfg.lp_virtual_eth + state.eth_in) - eth_side
    out = min(out, state.eth_in)
    return CurveState(state.eth_in - out, new_tokens), out


def eth_for_tokens(tl: float, state: CurveState | None = None, cfg: EconomyConfig = DEFAULT_ECONOMY) -> float:
    state = state or initial_state(cfg)
    new_tokens = state.tokens - tl
    return k(cfg) / new_tokens - (cfg.lp_virtual_eth + state.eth_in)


def founder_position(cfg: EconomyConfig = DEFAULT_ECONOMY) -> dict:
    st, tl = buy(initial_state(cfg), cfg.founder_buy_eth, cfg)
    return {"eth": cfg.founder_buy_eth, "tl": tl, "share_of_supply": tl / cfg.tl_supply, "price_after": st.price(cfg), "state": st}


def founder_table(inflows: list[float], cfg: EconomyConfig = DEFAULT_ECONOMY) -> list[dict]:
    """For total inflow levels (incl. founder): spot, paper value and realizable value of the founder's TL."""
    fp = founder_position(cfg)
    rows = []
    for total in inflows:
        total = max(total, cfg.founder_buy_eth)
        st = CurveState(total, k(cfg) / (cfg.lp_virtual_eth + total))
        price = st.price(cfg)
        _, proceeds = sell(st, fp["tl"], cfg)
        rows.append({"total_inflow": total, "price": price, "paper": fp["tl"] * price, "realizable": proceeds})
    return rows


def cap_allowance(day: float, cfg: EconomyConfig = DEFAULT_ECONOMY) -> float:
    """Max cumulative inflow after the constructor at time `day`."""
    return cfg.lp_cap_rate_eth_per_day * min(day, cfg.lp_cap_period_days)


def ceiling_table(days: list[int], cfg: EconomyConfig = DEFAULT_ECONOMY) -> list[dict]:
    fp = founder_position(cfg)
    rows = []
    for d in days:
        total = cfg.founder_buy_eth + cap_allowance(d, cfg)
        st = CurveState(total, k(cfg) / (cfg.lp_virtual_eth + total))
        rows.append({
            "day": d,
            "max_total_inflow": total,
            "price_ceiling": st.price(cfg),
            "x_post_founder": st.price(cfg) / fp["price_after"],
            "max_sold_share_of_curve": 1 - st.tokens / cfg.tl_to_launchpool,
            "mint_fee_eth": cfg.mint_fee_tl * st.price(cfg),
        })
    return rows


# --- RewardPool trajectory ---------------------------------------------------------------


@dataclass(frozen=True)
class Scenario:
    name: str
    chars_per_month: float
    matches_per_month: float
    avg_stake_tl: float  # per side
    trade_volume_tl: float  # character-curve volume per month
    months: int = 36


def reward_pool_trajectory(sc: Scenario, cfg: EconomyConfig = DEFAULT_ECONOMY) -> list[dict]:
    """Monthly steps. Seasons are 28 days; we approximate one season per month."""
    locked = float(cfg.tl_to_rewardpool_seed)
    balance = float(cfg.tl_to_rewardpool_seed)  # includes locked seed
    release_per_month = cfg.tl_to_rewardpool_seed / (cfg.seed_release_days / 30.4)
    rows = []
    for m in range(1, sc.months + 1):
        locked = max(0.0, locked - release_per_month)
        mint_in = sc.chars_per_month * cfg.mint_fee_tl * cfg.mint_rewardpool_bps / 10_000
        trade_in = sc.trade_volume_tl * cfg.pool_fee_bps / 10_000 * (10_000 - cfg.treasury_trade_bps) / 10_000
        kot_total = sc.matches_per_month * 2 * sc.avg_stake_tl
        rake_in = kot_total * cfg.rake_to_rewardpool_bps / 10_000
        balance += mint_in + trade_in + rake_in
        available = balance - locked
        # staker rewards: 3 % of each match's total, each capped at 2 % of available (approximate with the average match)
        per_match = min(2 * sc.avg_stake_tl * cfg.staker_reward_bps / 10_000, available * cfg.staker_reward_pool_cap_bps / 10_000)
        staker_out = min(per_match * sc.matches_per_month, available)
        balance -= staker_out
        available = balance - locked
        season_out = available * cfg.season_payout_bps / 10_000
        balance -= season_out
        rows.append({
            "month": m, "balance": balance, "locked": locked, "available": balance - locked,
            "mint_in": mint_in, "trade_in": trade_in, "rake_in": rake_in,
            "staker_out": staker_out, "season_out": season_out,
            "first_place": season_out * cfg.season_split_bps[0] / 10_000,
            "burn": sc.chars_per_month * cfg.mint_fee_tl * cfg.mint_burn_bps / 10_000 + kot_total * cfg.rake_to_burn_bps / 10_000,
        })
    return rows


SCENARIOS = [
    Scenario("S", 100, 1_000, 500, 5_000_000),
    Scenario("M", 1_000, 10_000, 1_000, 100_000_000),
    Scenario("L", 10_000, 100_000, 2_000, 2_000_000_000),
]


# --- farming the season prize -------------------------------------------------------------


def farming_breakeven(available_pool_tl: float, puppets: int, matches: int, stake_tl: float,
                      cfg: EconomyConfig = DEFAULT_ECONOMY) -> dict:
    """Attacker with one favourite and `puppets` puppets plays `matches` rated matches to take 1st place.

    Cost = mint fees for puppets and favourite (all sink), burn on each match (2 % of total), capital
    tied in licenses (returned). Benefit = 40 % of 20 % of available at season close, assuming the
    attacker actually reaches 1st place (upper bound on benefit).
    """
    mint_cost = (puppets + 1) * cfg.mint_fee_tl
    burn_cost = matches * 2 * stake_tl * cfg.rake_to_burn_bps / 10_000
    licenses = (puppets + 1) * cfg.season_license_tl
    prize = available_pool_tl * cfg.season_payout_bps / 10_000 * cfg.season_split_bps[0] / 10_000
    return {
        "mint_cost": mint_cost, "burn_cost": burn_cost, "capital_tied": licenses,
        "prize_if_first": prize, "net_if_first": prize - mint_cost - burn_cost,
        "breakeven_available": (mint_cost + burn_cost) / (cfg.season_payout_bps / 10_000 * cfg.season_split_bps[0] / 10_000),
    }
