"""Game and economy constants.

Mirrors contracts/src/Config.sol. Every value here has the same name and rationale as
the Solidity constant; when one changes, both change (checked by a test in WP2).

Special-design variants (``first_strike_mode``, ``adaptation_mode``, ``balance_mode``) exist
only in the simulation to measure proposed redesigns; the on-chain engine implements the
"spec" mode of each until a decision is recorded in the design notes.
"""

from __future__ import annotations

from dataclasses import dataclass

# --- enums (indices are the on-chain encodings) -------------------------------------------

ELEMENTS = ("Fire", "Air", "Earth", "Water", "Shadow")
#: element i beats (i+1) % 5 and (i+2) % 5, loses to (i+3) % 5 and (i+4) % 5

STANCES = ("Attack", "Defense", "Counter")
ATTACK, DEFENSE, COUNTER = 0, 1, 2
#: Attack beats Defense, Defense beats Counter, Counter beats Attack

SPECIALS = (
    "None",  # 0: simulation-only baseline, not available on chain
    "FirstStrike",  # 1: +3 Speed in round 1 (tie-break only)          [variant: +4 R in round 1 when in Attack]
    "Armor",  # 2: opponent's Strength -ARMOR in base computation
    "Endurance",  # 3: +ENDURANCE energy budget
    "Adaptation",  # 4: my element term is 0                          [variant: never a negative element term]
    "Pressure",  # 5: +PRESSURE R in round 1
    "Finisher",  # 6: +FINISHER R in round 3
    "Counterstrike",  # 7: +COUNTER R when I am in Counter and the opponent in Attack
    "Balance",  # 8: weakness has no effect; budget 40            [variant: budget 45, opponent's stance bonus vs me -2]
)
NONE, FIRST_STRIKE, ARMOR, ENDURANCE, ADAPTATION, PRESSURE, FINISHER, COUNTERSTRIKE, BALANCE = range(9)


@dataclass(frozen=True)
class BattleConfig:
    """Battle coefficients (design notes §7.1, §7.3 variant L; tuned in BALANCE-REPORT.md)."""

    rounds: int = 3
    trait_min: int = 1
    trait_max: int = 15  # cap 15: prevents extreme dumping regardless of formula
    budget: int = 45  # 40 + 5 from the mandatory weakness
    budget_balance: int = 40  # Balance (spec mode): weakness inactive, no bonus points
    stance_bonus: int = 8  # +8: the point where generalist and specialists balance (Appendix B)
    energy_mult: int = 2  # R gains 2 per energy point
    energy_base: int = 5  # energy budget = 5 + Speed / 2 -> 5..12
    energy_speed_div: int = 2
    element_bonus: int = 1  # +-1: element edge worth ~0.64 between identical characters (was 3 -> 0.86)
    weakness_penalty: int = 2  # -2: losing element + weakness ~0.24 (was 4 -> 0.03)
    first_strike_speed: int = 3
    first_strike_bonus: int = 4  # variant "attack_r1"
    armor_strength: int = 2  # was 3 (+0.10 mean); target ~+0.05
    endurance_energy: int = 1  # was 2 (+0.11); target ~+0.05
    pressure_bonus: int = 2  # was 4 (+0.10); target ~+0.05
    finisher_bonus: int = 2  # was 4 (+0.10); target ~+0.05
    counter_bonus: int = 8  # was 5 (+0.03); target ~+0.05
    balance_shield: int = 2  # variant "defensive": opponent's stance bonus against me is reduced by this
    first_strike_mode: str = "attack_r1"  # "spec" | "attack_r1"   (adopted: attack_r1, BALANCE-REPORT)
    adaptation_mode: str = "no_negative"  # "spec" | "no_negative" (adopted)
    balance_mode: str = "defensive"  # "spec" | "defensive"   (adopted)

    def energy_budget(self, speed: int, special: int) -> int:
        e = self.energy_base + speed // self.energy_speed_div
        if special == ENDURANCE:
            e += self.endurance_energy
        return e

    def trait_budget(self, special: int) -> int:
        if special == BALANCE and self.balance_mode == "spec":
            return self.budget_balance
        return self.budget


@dataclass(frozen=True)
class EconomyConfig:
    """Economic constants (design notes §2, §5, §6, §9, §11). Amounts in whole TL / ETH."""

    # TL supply split
    tl_supply: int = 1_000_000_000
    tl_to_launchpool: int = 900_000_000
    tl_to_rewardpool_seed: int = 100_000_000
    seed_release_days: int = 730  # linear release of the seed into RewardPool.available

    # LaunchPool curve
    lp_virtual_eth: float = 1.0  # V: founder budget sized (20 % = 2/7 ETH, decided 2026-10-13); pump.fun scale
    lp_cap_rate_eth_per_day: float = 1.0  # cumulative inflow cap after the constructor
    lp_cap_period_days: int = 30
    lp_max_buy_per_tx_eth: float = 0.5  # only during the cap period
    founder_buy_eth: float = 0.2857  # executed in the constructor; ~20 % of supply at V = 1

    # Character creation
    mint_fee_tl: int = 5_000
    mint_burn_bps: int = 5_000
    mint_rewardpool_bps: int = 2_500
    treasury_mint_bps: int = 2_500
    char_virtual_tl_min: int = 1_000
    char_virtual_tl_max: int = 1_000_000
    char_virtual_tl_default: int = 10_000
    char_supply_min: int = 1_000_000
    char_supply_max: int = 1_000_000_000_000
    char_supply_default: int = 1_000_000_000
    creator_alloc_max_bps: int = 2_000
    creator_vesting_min_days: int = 30
    creator_vesting_max_days: int = 365
    creator_fee_max_bps: int = 100
    creator_fee_default_bps: int = 50
    pool_fee_bps: int = 100  # protocol fee on character curves, in TL
    treasury_trade_bps: int = 5_000  # share of pool_fee to treasury; rest RewardPool

    # Matches
    stake_min_tl: int = 100
    stake_max_tl: int = 1_000_000
    rake_bps: int = 500  # 5 % of the total stake
    rake_to_rewardpool_bps: int = 300
    rake_to_burn_bps: int = 200
    rake_to_treasury_bps: int = 0  # [⚖] if > 0, taken from the burn share
    staker_reward_bps: int = 300  # must equal rake_to_rewardpool_bps (pass-through)
    staker_reward_pool_cap_bps: int = 200  # <= 2 % of RewardPool.available per match
    pair_cooldown_hours: int = 24
    rated_matches_per_pair_per_season: int = 3

    # Seasons
    season_days: int = 28
    season_payout_bps: int = 2_000  # 20 % of RewardPool.available
    season_split_bps: tuple[int, ...] = (4_000, 2_000, 1_000, 800, 600, 500, 400, 300, 200, 200)
    season_min_rated_matches: int = 10
    season_min_distinct_opponents: int = 6
    season_license_tl: int = 10_000
    elo_k_early: int = 32
    elo_k_late: int = 16
    elo_early_matches: int = 20
    elo_squeeze_bps: int = 8_000  # new = 1000 + 0.8 * (old - 1000)

    # Tournaments
    tournament_rake_bps: int = 500
    tournament_prize_split_bps: tuple[int, ...] = (6_000, 2_500, 750, 750)
    tournament_organizer_fee_max_bps: int = 200
    tournament_staker_total_bps: int = 300

    def __post_init__(self) -> None:
        assert self.tl_to_launchpool + self.tl_to_rewardpool_seed == self.tl_supply
        assert self.mint_burn_bps + self.mint_rewardpool_bps + self.treasury_mint_bps == 10_000
        assert self.rake_to_rewardpool_bps + self.rake_to_burn_bps + self.rake_to_treasury_bps == self.rake_bps
        assert self.staker_reward_bps == self.rake_to_rewardpool_bps, "matches must be pass-through"
        assert sum(self.season_split_bps) == 10_000
        assert sum(self.tournament_prize_split_bps) == 10_000


DEFAULT_BATTLE = BattleConfig()
DEFAULT_ECONOMY = EconomyConfig()
