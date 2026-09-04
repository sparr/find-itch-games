"""Small filesystem, JSON and name-matching helpers used across the library."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

__all__ = [
    "author_from_game_url",
    "normalize_name",
    "read_json_file",
    "read_subdirectories",
    "slug_from_game_url",
]

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def read_subdirectories(directory: Path) -> list[str]:
    """Immediate subdirectory names of ``directory``, or ``[]`` if unreadable."""
    try:
        return sorted(entry.name for entry in directory.iterdir() if entry.is_dir())
    except OSError:
        return []


def read_json_file(file: Path) -> Any | None:
    """Parses a JSON file, returning ``None`` if it is missing or malformed."""
    try:
        return json.loads(file.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def normalize_name(name: str) -> str:
    """Case-, spacing- and punctuation-insensitive comparison key.

    ``"Cosmic Collapse"``, ``"cosmic-collapse"`` and ``"cosmic_collapse"`` all
    reduce to the same value.
    """
    folded = unicodedata.normalize("NFKD", name.lower())
    return _NON_ALNUM.sub("", folded)


def slug_from_game_url(url: str | None) -> str | None:
    """The ``slug`` in ``https://author.itch.io/slug``."""
    if not url:
        return None
    segments = [segment for segment in urlparse(url).path.split("/") if segment]
    return segments[-1] if segments else None


def author_from_game_url(url: str | None) -> str | None:
    """The ``author`` in ``https://author.itch.io/slug``."""
    if not url:
        return None
    hostname = urlparse(url).hostname or ""
    author = hostname.split(".")[0]
    return author if author and ".itch.io" in hostname else None
