"""Reading itch's ``preferences.json``.

Only two fields matter here: the deprecated pre-v23 install locations, and the
id of the location itch installs into by default.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .itch import get_preferences_path
from .utils import read_json_file

__all__ = ["get_preference_install_locations", "read_preferences"]


def read_preferences(itch_path: Path | str) -> dict[str, Any] | None:
    """Reads ``preferences.json``, or ``None`` if it is missing or malformed."""
    data = read_json_file(get_preferences_path(itch_path))
    return data if isinstance(data, dict) else None


def get_preference_install_locations(
    preferences: dict[str, Any] | None,
) -> list[tuple[str, str]]:
    """Flattens ``installLocations`` into ``(id, path)`` pairs.

    Newer itch migrates these into butler.db and leaves the field empty, but it
    is the only record of them on installs that never launched a newer itch.
    Both the modern ``{"id": path}`` and older ``{"id": {"path": ...}}`` shapes
    are accepted.
    """
    locations: list[tuple[str, str]] = []
    for location_id, value in ((preferences or {}).get("installLocations") or {}).items():
        path = value if isinstance(value, str) else (value or {}).get("path")
        if path:
            locations.append((location_id, path))
    return locations
