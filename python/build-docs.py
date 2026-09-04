#!/usr/bin/env python3
"""Generates the Python API reference into ``docs/python/api``.

Kept as a script rather than a shell one-liner because the module list has to
be explicit: ``__init__.py`` re-exports the public API through ``__all__``, so
pdoc given only the package documents a single page and omits the submodules.

Run directly, or via the pre-commit hook, which regenerates the docs from the
staged tree so they cannot drift from the code.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
OUT = HERE.parent / "docs" / "python" / "api"

MODULES = [
    "find_itch_games",
    *(
        f"find_itch_games.{path.stem}"
        for path in sorted((SRC / "find_itch_games").glob("*.py"))
        if path.stem != "__init__"
    ),
]


def main() -> int:
    pdoc = HERE / ".venv" / "bin" / "pdoc"
    if not pdoc.is_file():
        pdoc = Path(sys.executable).with_name("pdoc")
    if not pdoc.is_file():
        print(
            "pdoc is not installed. Run:\n"
            '  python -m venv .venv && .venv/bin/pip install -e ".[dev]"',
            file=sys.stderr,
        )
        return 1

    # Inherit the environment rather than replacing it -- pdoc needs HOME and
    # the rest -- and only prepend the source tree so the package imports
    # without being installed.
    env = {**os.environ, "PYTHONPATH": str(SRC)}
    return subprocess.run([str(pdoc), "-o", str(OUT), *MODULES], env=env, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
