"""Export contract ABIs from Foundry artefacts as `as const` TypeScript modules.

Writes indexer/abis/<Name>.ts and web/src/abis/<Name>.ts. Run after `forge build`:

    uv run --python 3.12 python scripts/export-abis.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "contracts" / "out"
NAMES = [
    "TLToken", "LaunchPool", "CharacterFactory", "CharacterPool", "CharacterToken", "ControllerNFT",
    "CreatorVesting", "RewardPool", "StakingVault", "Rating", "MatchManager", "Tournament",
    "AmmFactory", "AmmPair",
]
TARGETS = [ROOT / "indexer" / "abis", ROOT / "web" / "src" / "abis"]


def main() -> None:
    for target in TARGETS:
        target.mkdir(parents=True, exist_ok=True)
    index_lines = []
    for n in NAMES:
        abi = json.load(open(OUT / f"{n}.sol" / f"{n}.json", encoding="utf-8"))["abi"]
        body = f"export const {n}Abi = {json.dumps(abi, indent=1)} as const;\n"
        for target in TARGETS:
            (target / f"{n}.ts").write_text(body, encoding="utf-8")
        index_lines.append(f'export {{ {n}Abi }} from "./{n}";')
    for target in TARGETS:
        (target / "index.ts").write_text("\n".join(index_lines) + "\n", encoding="utf-8")
    print(f"wrote {len(NAMES)} ABIs to {', '.join(str(t.relative_to(ROOT)) for t in TARGETS)}")


if __name__ == "__main__":
    main()
