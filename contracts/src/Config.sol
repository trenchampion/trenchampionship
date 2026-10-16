// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title Config
/// @notice Every economic and game constant of Trenchampionship, fixed once at deploy.
/// @dev Mirrors sim/traitleague_sim/constants.py; each constant carries a one-line rationale.
///      Nothing here is adjustable after deploy: there is no owner anywhere in the protocol.
library Config {
    uint256 internal constant BPS = 10_000;

    // ------------------------------------------------------------------ TL supply
    /// @dev Fixed supply, minted once in the TLToken constructor; no mint function exists.
    uint256 internal constant TL_SUPPLY = 1_000_000_000e18;
    /// @dev 90 % goes on the public curve; nobody receives TL except by buying or playing.
    uint256 internal constant TL_TO_LAUNCHPOOL = 900_000_000e18;
    /// @dev 10 % seeds RewardPool so players earn TL by playing from season one.
    uint256 internal constant TL_TO_REWARDPOOL_SEED = 100_000_000e18;
    /// @dev Seed unlocks linearly so the first season is not a farming jackpot.
    uint256 internal constant SEED_RELEASE_PERIOD = 730 days;

    // ------------------------------------------------------------------ LaunchPool
    /// @dev Virtual ETH reserve: sets start price and curve steepness; sized to the founder budget
    ///      (20 % of supply costs 2/7 ETH; decided 2026-10-13, pump.fun scale). Cap and max buy stay as designed.
    uint256 internal constant LP_VIRTUAL_ETH = 1 ether;
    /// @dev Cumulative inflow allowance grows 1 ETH per day after the constructor...
    uint256 internal constant LP_CAP_RATE_PER_DAY = 1 ether;
    /// @dev ...for 30 days, then the cap disappears. Limits front-loading and bug damage.
    uint256 internal constant LP_CAP_PERIOD = 30 days;
    /// @dev Per-transaction ceiling during the cap period; friction against single-shot whales.
    uint256 internal constant LP_MAX_BUY_PER_TX = 0.5 ether;

    // ------------------------------------------------------------------ Characters
    /// @dev Creation fee; the only TL sink that scales with league growth.
    uint256 internal constant MINT_FEE = 5000e18;
    /// @dev Half of the fee is burned: deflation tied to creation.
    uint256 internal constant MINT_BURN_BPS = 5000;
    /// @dev A quarter funds player rewards.
    uint256 internal constant MINT_REWARDPOOL_BPS = 2500;
    /// @dev A quarter is the service fee for creation (treasury switch #1).
    uint256 internal constant TREASURY_MINT_BPS = 2500;
    /// @dev Creator-chosen virtual TL reserve bounds: initial market cap of a character.
    uint256 internal constant CHAR_VIRTUAL_TL_MIN = 1000e18;
    uint256 internal constant CHAR_VIRTUAL_TL_MAX = 1_000_000e18;
    /// @dev Creator-chosen supply bounds; supply is cosmetic for the curve.
    uint256 internal constant CHAR_SUPPLY_MIN = 1_000_000e18;
    uint256 internal constant CHAR_SUPPLY_MAX = 1_000_000_000_000e18;
    /// @dev Free creator allocation cap; always vests, never unlocked.
    uint256 internal constant CREATOR_ALLOC_MAX_BPS = 2000;
    uint256 internal constant CREATOR_VESTING_MIN = 30 days;
    uint256 internal constant CREATOR_VESTING_MAX = 365 days;
    /// @dev Optional creator fee on character trades, paid to the current controller.
    uint256 internal constant CREATOR_FEE_MAX_BPS = 100;
    /// @dev Creator strings live on chain and go into every tokenURI of that character; the bounds keep
    ///      one character from making its own metadata unreadable (lengths in bytes).
    uint256 internal constant CHAR_NAME_MAX_BYTES = 64;
    uint256 internal constant CHAR_SYMBOL_MAX_BYTES = 16;
    /// @dev metadataURI is a data URI with the creator's reference image link and story (<= 400 chars).
    uint256 internal constant METADATA_URI_MAX_BYTES = 2048;
    /// @dev Protocol fee on character curves, in TL, both directions.
    uint256 internal constant POOL_FEE_BPS = 100;
    /// @dev Share of the protocol fee to treasury (switch #2); the rest to RewardPool.
    uint256 internal constant TREASURY_TRADE_BPS = 5000;

    // ------------------------------------------------------------------ Matches
    /// @dev Stake bounds per side; 0 is a friendly match (no escrow, no rating, no staking).
    uint256 internal constant STAKE_MIN = 100e18;
    uint256 internal constant STAKE_MAX = 1_000_000e18;
    /// @dev 5 % of total stakes is the rake; split below must sum to RAKE_BPS.
    uint256 internal constant RAKE_BPS = 500;
    /// @dev Rake share that funds staker rewards for this very match (pass-through).
    uint256 internal constant RAKE_TO_REWARDPOOL_BPS = 300;
    /// @dev Rake share burned: deflation tied to activity.
    uint256 internal constant RAKE_TO_BURN_BPS = 200;
    /// @dev Treasury switch #3; 0 until there is a written opinion on rake.
    uint256 internal constant RAKE_TO_TREASURY_BPS = 0;
    /// @dev Must equal RAKE_TO_REWARDPOOL_BPS so no match can fill or drain RewardPool.
    uint256 internal constant STAKER_REWARD_BPS = 300;
    /// @dev Hard cap per match: 2 % of RewardPool.available; protects the pool early on.
    uint256 internal constant STAKER_REWARD_POOL_CAP_BPS = 200;
    /// @dev Same pair of characters cannot play again for 24 h (anti-farming).
    uint256 internal constant PAIR_COOLDOWN = 24 hours;
    /// @dev Only the first 3 matches of a pair per season move ratings (anti-farming).
    uint256 internal constant RATED_PER_PAIR_PER_SEASON = 3;
    /// @dev Challenge acceptance window, all presets.
    uint256 internal constant ACCEPT_WINDOW = 48 hours;
    /// @dev Presets: staking window == commit window == reveal window.
    uint256 internal constant PRESET_BLITZ = 1 hours;
    uint256 internal constant PRESET_STANDARD = 24 hours;
    uint256 internal constant PRESET_TOURNAMENT = 12 hours;

    // ------------------------------------------------------------------ Seasons and rating
    uint256 internal constant SEASON_LENGTH = 28 days;
    /// @dev 20 % of RewardPool.available per season; percentage so the pool never empties.
    uint256 internal constant SEASON_PAYOUT_BPS = 2000;
    uint256 internal constant SEASON_MIN_RATED_MATCHES = 10;
    uint256 internal constant SEASON_MIN_DISTINCT_OPPONENTS = 6;
    /// @dev Refundable deposit required to compete for season rewards (demand + anti-farming).
    uint256 internal constant SEASON_LICENSE = 10_000e18;
    uint256 internal constant RATING_START = 1000;
    uint256 internal constant ELO_K_EARLY = 32;
    uint256 internal constant ELO_K_LATE = 16;
    uint256 internal constant ELO_EARLY_MATCHES = 20;
    /// @dev new = 1000 + 0.8 * (old - 1000) at each season boundary.
    uint256 internal constant ELO_SQUEEZE_BPS = 8000;

    // ------------------------------------------------------------------ Tournaments
    uint256 internal constant TOURNAMENT_RAKE_BPS = 500;
    uint256 internal constant TOURNAMENT_PRIZE_WINNER_BPS = 6000;
    uint256 internal constant TOURNAMENT_PRIZE_FINALIST_BPS = 2500;
    uint256 internal constant TOURNAMENT_PRIZE_SEMI_BPS = 750; // each of two
    uint256 internal constant TOURNAMENT_ORGANIZER_FEE_MAX_BPS = 200;
    /// @dev Total staker rewards across a bracket equal the rake share to RewardPool (pass-through).
    uint256 internal constant TOURNAMENT_STAKER_TOTAL_BPS = 300;
    uint256 internal constant TOURNAMENT_REGISTRATION_WINDOW = 72 hours;

    // ------------------------------------------------------------------ AMM (WP11, secondary market)
    /// @dev Swap fee that stays in the pair for its liquidity providers; Uniswap v2 level. Confirmed by the founder 2026-10-13.
    uint256 internal constant AMM_LP_FEE_BPS = 30;
    /// @dev Protocol share of every AMM swap, always taken in TL, never in character tokens. Confirmed 2026-10-13.
    uint256 internal constant AMM_PROTOCOL_FEE_BPS = 5;
    /// @dev Share of the AMM protocol fee to treasury (switch #4); the rest to RewardPool. Confirmed 2026-10-13.
    uint256 internal constant TREASURY_AMM_BPS = 5000;
    /// @dev First-deposit LP shares locked forever so the share price cannot be inflated (Uniswap v2).
    uint256 internal constant AMM_MINIMUM_LIQUIDITY = 1000;

    // ------------------------------------------------------------------ Guardian
    /// @dev pause() stops working 365 days after deploy; nothing else was ever privileged.
    uint256 internal constant PAUSE_EXPIRY = 365 days;

    // ------------------------------------------------------------------ Battle (variant L)
    uint8 internal constant ROUNDS = 3;
    uint8 internal constant TRAIT_MIN = 1;
    /// @dev Cap 15 prevents extreme stat dumping regardless of formula.
    uint8 internal constant TRAIT_MAX = 15;
    /// @dev 40 + 5 from the mandatory weakness; the same for every special.
    uint8 internal constant TRAIT_BUDGET = 45;
    /// @dev +8 is where generalist and specialists balance (BALANCE-REPORT.md).
    int16 internal constant STANCE_BONUS = 8;
    int16 internal constant ENERGY_MULT = 2;
    /// @dev Energy budget = 5 + Speed / 2: speed buys tactical flexibility.
    uint8 internal constant ENERGY_BASE = 5;
    uint8 internal constant ENERGY_SPEED_DIV = 2;
    /// @dev +-1: an element edge is worth ~0.64 between identical characters (+-3 gave 0.86).
    int16 internal constant ELEMENT_BONUS = 1;
    /// @dev -2: losing the element and taking the weakness hit is ~0.24 (was 0.03 at -4).
    int16 internal constant WEAKNESS_PENALTY = 2;
    /// @dev Specials are tuned so each is worth ~+0.05 over no special (BALANCE-REPORT.md).
    /// @dev First strike: +4 in round 1 when attacking (the tie-break version was worth +0.01).
    int16 internal constant FIRST_STRIKE_BONUS = 4;
    /// @dev Balance: the opponent's stance bonus against the holder is 6 instead of 8.
    int16 internal constant BALANCE_SHIELD = 2;
    uint8 internal constant ARMOR_STRENGTH = 2;
    uint8 internal constant ENDURANCE_ENERGY = 1;
    int16 internal constant PRESSURE_BONUS = 2;
    int16 internal constant FINISHER_BONUS = 2;
    int16 internal constant COUNTER_BONUS = 8;

    /// @notice Season payout split for places 1..10, in bps of the season payout.
    function seasonSplit(uint256 place) internal pure returns (uint256) {
        if (place == 0) return 4000;
        if (place == 1) return 2000;
        if (place == 2) return 1000;
        if (place == 3) return 800;
        if (place == 4) return 600;
        if (place == 5) return 500;
        if (place == 6) return 400;
        if (place == 7) return 300;
        if (place == 8) return 200;
        if (place == 9) return 200;
        return 0;
    }
}
