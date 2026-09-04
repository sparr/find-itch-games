"""Checks the two implementations agree on a real itch installation.

Skipped unless itch is actually installed on the machine running the tests, and
unless the JavaScript package has been built. This is the only test that
compares the implementations directly rather than through shared fixtures.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

import find_itch_games as fig

NODE_DIR = Path(__file__).resolve().parents[2] / "node"

SCRIPT = """
import { findItch } from "./lib/esm/index.js";
const r = await findItch({ strategy: process.argv[1] });
const apps = r.libraries.flatMap((l) => l.apps).map((a) => ({
  gameId: a.gameId, path: a.path, source: a.manifest.source, title: a.manifest.title ?? null,
}));
console.log(JSON.stringify(apps.sort((a, b) => a.gameId - b.gameId)));
"""


def _node_result(strategy: str) -> list[dict]:
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", SCRIPT, "--", strategy],
        cwd=NODE_DIR,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(proc.stdout)


@pytest.mark.parametrize("strategy", ["merge", "db", "receipts"])
def test_python_matches_javascript_on_this_machine(strategy: str):
    if fig.find_itch_path() is None:
        pytest.skip("itch is not installed on this machine")
    if not (NODE_DIR / "lib" / "esm" / "index.js").is_file():
        pytest.skip("the JavaScript package has not been built")

    expected = _node_result(strategy)
    actual = sorted(
        (
            {
                "gameId": app.game_id,
                "path": str(app.path),
                "source": app.manifest.source,
                "title": app.manifest.title,
            }
            for app in fig.find_itch_apps(strategy=strategy)
        ),
        key=lambda a: a["gameId"],
    )
    assert actual == expected
