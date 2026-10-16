# sim/prototype — the scripts behind the figures in the design notes

Temporary prototypes; in WP1 they grow into the real simulation package (/sim).

- `curve.py` — LaunchPool bonding curve (constant product with a virtual ETH reserve): founder buy, FDV, steepness, cost of play in ETH/USD.
- `battle_check.py` — minimax (LP) value of the SPEC battle formula for five archetypes.
- `battle_variants_fast.py` — the same values for formula variants A–E (vectorised).
- `battle_speed_energy.py` — cyclic formula with Speed as the energy budget (variants I/J); the argument is the variant name.

Running (no installation, via uv):

    uv run --python 3.12 --with numpy --with scipy python battle_variants_fast.py
    uv run --python 3.12 --with numpy --with scipy python battle_speed_energy.py "I cyclic,cap15,+5,2E,E=6+Br/3"
    uv run --python 3.12 python curve.py
