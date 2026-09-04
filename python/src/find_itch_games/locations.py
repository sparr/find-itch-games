"""Discovering itch's install locations.

An install location is a directory itch installs games into. They are
user-created and stored in butler.db, apart from the built-in ``appdata``
location, which itch derives from its own user-data directory. Older itch
versions kept them in ``preferences.json`` instead.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .db import open_butler_database, read_install_locations
from .itch import get_appdata_install_location, resolve_database_path
from .preferences import get_preference_install_locations, read_preferences

__all__ = [
    "LibraryRaw",
    "LibrariesRaw",
    "get_install_folder_path",
    "get_library_downloads_folder",
    "get_staging_folder",
    "load_itch_libraries",
]


@dataclass
class LibraryRaw:
    """An install location, before its contents are looked at."""

    #: itch's own id: a uuid, or the built-in ``appdata``.
    id: str
    path: Path
    #: True for the location itch installs into by default.
    is_default: bool
    #: Whether the directory currently exists on disk.
    exists: bool
    #: Where the record came from: ``db``, ``preferences``, ``appdata`` or ``option``.
    source: str


@dataclass
class LibrariesRaw:
    """itch's install locations, with the state of the records they came from."""

    itch_path: Path
    database_path: Path
    #: Whether butler.db was present and readable.
    database_available: bool
    libraries: list[LibraryRaw]


def get_library_downloads_folder(library_path: Path | str) -> Path:
    """The staging directory itch downloads into inside an install location."""
    return Path(library_path) / "downloads"


def get_staging_folder(library_path: Path | str, download_id: str) -> Path:
    """Where an in-progress download is staged, matching butler's
    ``InstallLocation.GetStagingFolder``."""
    return Path(library_path) / "downloads" / download_id


def get_install_folder_path(library_path: Path | str, install_folder_name: str) -> Path:
    """Where a game with the given install folder name lives inside a location.

    itch installs games directly into the location -- there is no equivalent of
    Steam's ``steamapps/common`` nesting -- so this is a plain join.
    """
    return Path(library_path) / install_folder_name


def load_itch_libraries(
    itch_path: Path | str,
    extra_libraries: list[Path | str] | None = None,
    skip_database: bool = False,
) -> LibrariesRaw:
    """Collects install locations from every place itch records them.

    butler.db is authoritative when readable. ``preferences.json`` covers itch
    versions that predate the database, and the built-in ``appdata`` location is
    derived from the itch directory itself because itch never stores it as a
    path.
    """
    itch_path = Path(itch_path)
    database_path = resolve_database_path(itch_path)
    preferences = read_preferences(itch_path)
    default_id = (preferences or {}).get("defaultInstallLocation")

    by_path: dict[str, tuple[str, Path, str]] = {}

    def add(location_id: str, location_path: Path | str, source: str) -> None:
        resolved = Path(location_path).resolve()
        # First source wins, and they are added most-authoritative first.
        by_path.setdefault(str(resolved), (location_id, resolved, source))

    database_available = False
    if not skip_database and database_path.is_file():
        try:
            with open_butler_database(database_path) as connection:
                for location in read_install_locations(connection):
                    add(location.id, location.path, "db")
            database_available = True
        except Exception:
            # An unreadable database should degrade to a worse answer, not to
            # no answer.
            pass

    for location_id, location_path in get_preference_install_locations(preferences):
        add(location_id, location_path, "preferences")

    add("appdata", get_appdata_install_location(itch_path), "appdata")

    for extra in extra_libraries or []:
        add(f"option:{Path(extra).resolve()}", extra, "option")

    libraries = [
        LibraryRaw(
            id=location_id,
            path=location_path,
            is_default=default_id is not None and location_id == default_id,
            exists=location_path.is_dir(),
            source=source,
        )
        for location_id, location_path, source in by_path.values()
    ]

    return LibrariesRaw(
        itch_path=itch_path,
        database_path=database_path,
        database_available=database_available,
        libraries=libraries,
    )
