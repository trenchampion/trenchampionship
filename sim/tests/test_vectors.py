"""The committed shared vectors must equal what the reference engine generates today.

If this fails, either the engine changed (regenerate the vectors and update Solidity + TS) or
the vectors were edited by hand.
"""

import json
import pathlib
import subprocess
import sys

VECTORS = pathlib.Path(__file__).resolve().parents[2] / "engine" / "vectors" / "battle-vectors.json"


def test_committed_vectors_match_reference(tmp_path):
    out = tmp_path / "v.json"
    subprocess.run(
        [sys.executable, "-m", "traitleague_sim.vectors", "--out", str(out), "--n", "220", "--seed", "42"],
        check=True,
        cwd=pathlib.Path(__file__).resolve().parents[1],
    )
    fresh = json.loads(out.read_text(encoding="utf-8"))
    committed = json.loads(VECTORS.read_text(encoding="utf-8"))
    assert fresh["config"] == committed["config"]
    assert fresh["count"] == committed["count"] >= 200
    assert fresh["cases"] == committed["cases"]


def test_vector_layout():
    committed = json.loads(VECTORS.read_text(encoding="utf-8"))
    for c in committed["cases"]:
        assert len(c) == 37
        assert c[26] + c[27] <= 3
        assert all(w in (-1, 0, 1) for w in c[34:37])
