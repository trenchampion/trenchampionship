"""Trenchampionship balance and economy simulation.

The battle module is a reference implementation of the formula frozen in
the design notes §7.3 (variant L). It must stay bit-identical to
contracts/src/BattleEngine.sol and engine/ (TypeScript); shared JSON vectors
enforce that from WP3 on.
"""

from .constants import BattleConfig, EconomyConfig, DEFAULT_BATTLE, DEFAULT_ECONOMY  # noqa: F401
