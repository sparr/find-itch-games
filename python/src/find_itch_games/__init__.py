"""Find the itch.io app, its install locations, and the games installed in them.

A Python counterpart to the ``find-itch-games`` JavaScript package. Both read
the same two records itch keeps -- ``butler.db`` and the receipts itch writes
into install folders -- and are tested against the same shared fixtures.

Start with :func:`find_itch` for the whole picture, or :func:`find_itch_app_by_id`
/ :func:`find_itch_app_by_name` to locate one game.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from .db import CaveRow, InstallLocationRow, open_butler_database, read_caves
from .errors import AmbiguousAppError, AppNotFoundError, ItchDatabaseError, ItchNotFoundError
from .itch import (
    ITCH_APP_NAMES,
    PathLookup,
    find_itch_path,
    get_appdata_install_location,
    get_database_path,
    get_itch_path_candidates,
    get_preferences_path,
    require_itch_path,
    resolve_database_path,
)
from .locations import (
    LibrariesRaw,
    LibraryRaw,
    get_install_folder_path,
    get_library_downloads_folder,
    get_staging_folder,
    load_itch_libraries,
)
from .manifest import (
    AppManifest,
    get_launch_candidate_paths,
    get_manifest_names,
    manifest_from_cave,
    manifest_from_receipt,
)
from .receipt import (
    RECEIPT_DIR,
    FoundReceipt,
    LegacyReceiptInfo,
    Receipt,
    find_receipts,
    get_legacy_receipt_path,
    get_receipt_path,
    has_receipt,
    read_receipt,
)
from .types import Build, Game, LaunchCandidate, Platforms, Upload, User, Verdict
from .utils import normalize_name

__version__ = "0.1.0"

__all__ = [
    "ITCH_APP_NAMES",
    "ITCH_STRATEGIES",
    "RECEIPT_DIR",
    "AmbiguousAppError",
    "App",
    "AppManifest",
    "AppNotFoundError",
    "Build",
    "CaveRow",
    "FoundReceipt",
    "Game",
    "InstallLocationRow",
    "ItchDatabaseError",
    "ItchNotFoundError",
    "LaunchCandidate",
    "LegacyReceiptInfo",
    "Libraries",
    "LibrariesRaw",
    "Library",
    "LibraryRaw",
    "PathLookup",
    "Platforms",
    "Receipt",
    "Strategy",
    "Upload",
    "User",
    "Verdict",
    "find_itch",
    "find_itch_app_by_id",
    "find_itch_app_by_name",
    "find_itch_app_manifest",
    "find_itch_apps",
    "find_itch_apps_by_id",
    "find_itch_apps_by_name",
    "find_itch_libraries",
    "find_itch_libraries_paths",
    "find_itch_path",
    "find_receipts",
    "get_appdata_install_location",
    "get_database_path",
    "get_install_folder_path",
    "get_itch_path_candidates",
    "get_launch_candidate_paths",
    "get_legacy_receipt_path",
    "get_library_downloads_folder",
    "get_manifest_names",
    "get_preferences_path",
    "get_receipt_path",
    "get_staging_folder",
    "has_itch_app",
    "has_receipt",
    "read_receipt",
    "resolve_database_path",
]

#: Which of itch's records to trust.
#:
#: - ``merge`` (default) reads butler.db and confirms each game against the
#:   receipt in its install folder, then adds any receipt the database has no
#:   row for. Most complete.
#: - ``db`` reads butler.db only. Fastest, and the only source of play times,
#:   launch candidates and custom install folders.
#: - ``receipts`` scans the install locations instead of reading caves. Useful
#:   when the database is out of date, but it loses the fields only the
#:   database has. Install locations still come from the database, since
#:   nothing on disk records them.
Strategy = Literal["merge", "db", "receipts"]

#: Every value :data:`Strategy` accepts, in preference order.
#:
#: A tuple because it is the guard, not a registry: :func:`find_itch` dispatches
#: on these values directly, so widening the list would only disable the check
#: and let the new value fall through to ``merge`` behaviour.
ITCH_STRATEGIES: tuple[str, ...] = ("merge", "db", "receipts")


@dataclass
class App:
    """One installed game inside a library."""

    game_id: int
    #: Absolute path to the installed game.
    path: Path
    manifest: AppManifest
    #: Absolute path to the on-disk receipt, when there is one.
    receipt_path: Path | None = None


@dataclass
class Library(LibraryRaw):
    """An install location together with the games in it."""

    apps: list[App] = field(default_factory=list)


@dataclass
class Libraries:
    """The full picture: where itch is, where it installs, and what is installed."""

    itch_path: Path
    database_path: Path
    database_available: bool
    strategy: str
    libraries: list[Library]


def _resolve_strategy(strategy: str | None, ignore_database: bool) -> str:
    """Settles on a strategy, rejecting anything that isn't one.

    Every strategy is defined by what it is *not*, so a misspelled value would
    otherwise slip through and behave like ``merge``.
    """
    # Validated before `ignore_database` is honoured, so that argument cannot
    # mask a typo in a value the caller clearly meant to have an effect.
    if strategy is not None and strategy not in ITCH_STRATEGIES:
        expected = ", ".join(repr(s) for s in ITCH_STRATEGIES)
        raise ValueError(f"unknown itch strategy {strategy!r}; expected one of {expected}")
    if ignore_database:
        return "receipts"
    return strategy or "merge"


class _LibrarySet:
    """Groups apps under the install location containing them, synthesizing an
    entry for anything installed outside a known one."""

    def __init__(self, libraries: list[LibraryRaw]) -> None:
        self._by_path: dict[str, Library] = {
            str(library.path): Library(**vars(library), apps=[]) for library in libraries
        }
        self._seen: set[str] = set()

    @property
    def existing(self) -> list[Library]:
        return [library for library in self._by_path.values() if library.exists]

    def find_by_id(self, location_id: str) -> Library | None:
        return next((l for l in self._by_path.values() if l.id == location_id), None)

    def has_app(self, app_path: Path) -> bool:
        return str(app_path.resolve()) in self._seen

    def add_app(self, app: App) -> None:
        resolved = app.path.resolve()
        if str(resolved) in self._seen:
            return
        self._seen.add(str(resolved))

        parent = str(resolved.parent)
        library = self._by_path.get(parent)
        if library is None:
            # A custom install folder, or a location itch has since forgotten.
            library = Library(
                id=app.manifest.install_location_id or f"external:{parent}",
                path=resolved.parent,
                is_default=False,
                exists=True,
                source="option",
                apps=[],
            )
            self._by_path[parent] = library
        library.apps.append(app)

    def to_list(self) -> list[Library]:
        for library in self._by_path.values():
            library.apps.sort(key=lambda app: app.game_id)
        return sorted(self._by_path.values(), key=lambda library: str(library.path))


def _resolve_cave_install_path(cave: CaveRow, libraries: _LibrarySet) -> Path | None:
    """Works out where a cave's files are.

    ``custom_install_folder`` wins, then the install location plus folder name,
    and finally the base path butler recorded when it last scanned the folder --
    the only hint left if the install location has been removed.
    """
    if cave.custom_install_folder:
        return Path(cave.custom_install_folder).resolve()

    library = libraries.find_by_id(cave.install_location_id) if cave.install_location_id else None
    if library is not None and cave.install_folder_name:
        return get_install_folder_path(library.path, cave.install_folder_name)

    if cave.verdict and cave.verdict.base_path:
        return Path(cave.verdict.base_path).resolve()
    return None


def find_itch(
    *,
    itch_path: Path | str | None = None,
    strategy: Strategy | None = None,
    check_exists: bool = True,
    extra_libraries: list[Path | str] | None = None,
    ignore_database: bool = False,
    lookup: PathLookup | None = None,
) -> Libraries:
    """Finds itch, its install locations and every game installed in them.

    :raises ItchNotFoundError: if the itch user-data directory cannot be found.
    :raises ValueError: if ``strategy`` is not one of :data:`ITCH_STRATEGIES`.
    """
    resolved_strategy = _resolve_strategy(strategy, ignore_database)
    itch_dir = require_itch_path(itch_path, lookup)

    raw = load_itch_libraries(
        itch_dir, extra_libraries=extra_libraries, skip_database=ignore_database
    )
    libraries = _LibrarySet(raw.libraries)

    if resolved_strategy != "receipts" and raw.database_available:
        with open_butler_database(raw.database_path) as connection:
            caves = read_caves(connection)
        for cave in caves:
            install_path = _resolve_cave_install_path(cave, libraries)
            if install_path is None:
                continue
            if check_exists and not install_path.is_dir():
                continue
            receipt = None if resolved_strategy == "db" else read_receipt(install_path)
            manifest = manifest_from_cave(cave, install_path, receipt)
            libraries.add_app(
                App(
                    game_id=manifest.game_id,
                    path=manifest.path,
                    manifest=manifest,
                    receipt_path=manifest.receipt_path,
                )
            )

    if resolved_strategy != "db":
        for library in libraries.existing:
            for found in find_receipts(library.path):
                if libraries.has_app(found.path):
                    continue
                manifest = manifest_from_receipt(found, library.id)
                libraries.add_app(
                    App(
                        game_id=manifest.game_id,
                        path=manifest.path,
                        manifest=manifest,
                        receipt_path=manifest.receipt_path,
                    )
                )

    return Libraries(
        itch_path=raw.itch_path,
        database_path=raw.database_path,
        database_available=raw.database_available,
        strategy=resolved_strategy,
        libraries=libraries.to_list(),
    )


def find_itch_apps(**options) -> list[App]:
    """Every installed game, flattened out of :func:`find_itch`."""
    return [app for library in find_itch(**options).libraries for app in library.apps]


def find_itch_libraries(
    *,
    itch_path: Path | str | None = None,
    extra_libraries: list[Path | str] | None = None,
    ignore_database: bool = False,
    lookup: PathLookup | None = None,
    **_ignored,
) -> LibrariesRaw:
    """Install locations with their metadata, without scanning for games."""
    return load_itch_libraries(
        require_itch_path(itch_path, lookup),
        extra_libraries=extra_libraries,
        skip_database=ignore_database,
    )


def find_itch_libraries_paths(**options) -> list[Path]:
    """Just the install location paths, cheapest call in the library."""
    return [library.path for library in find_itch_libraries(**options).libraries]


def _pick_one(apps: list[App], query: str | int, strict: bool) -> App:
    if not apps:
        raise AppNotFoundError(query)
    if strict and len(apps) > 1:
        raise AmbiguousAppError(query, [str(app.path) for app in apps])
    return apps[0]


def find_itch_apps_by_id(game_id: int, **options) -> list[App]:
    """Every install of a game, by itch.io game id.

    Usually zero or one, but itch will happily install the same game into more
    than one location.
    """
    return [app for app in find_itch_apps(**options) if app.game_id == game_id]


def find_itch_app_by_id(game_id: int, *, strict: bool = False, **options) -> Path:
    """Finds where a game is installed, by itch.io game id.

    :raises AppNotFoundError: if the game is not installed.
    :raises AmbiguousAppError: if ``strict`` and it is installed twice.
    """
    return _pick_one(find_itch_apps_by_id(game_id, **options), game_id, strict).path


def find_itch_apps_by_name(name: str, *, exact: bool = True, **options) -> list[App]:
    """Every installed game matching a title, url slug or install folder name.

    Exact by default; pass ``exact=False`` for a search that ignores case,
    spacing and punctuation.
    """
    wanted = name if exact else normalize_name(name)
    return [
        app
        for app in find_itch_apps(**options)
        if any(
            (alias == wanted) if exact else (normalize_name(alias) == wanted)
            for alias in get_manifest_names(app.manifest)
        )
    ]


def find_itch_app_by_name(
    name: str, *, exact: bool = True, strict: bool = False, **options
) -> Path:
    """Finds where a game is installed, by title, url slug or install folder name.

    :raises AppNotFoundError: if no installed game matches.
    :raises AmbiguousAppError: if ``strict`` and several match.
    """
    return _pick_one(find_itch_apps_by_name(name, exact=exact, **options), name, strict).path


def find_itch_app_manifest(game_id: int, **options) -> AppManifest | None:
    """Reads the merged cave/receipt record for a game, or ``None``."""
    apps = find_itch_apps_by_id(game_id, **options)
    return apps[0].manifest if apps else None


def has_itch_app(game: int | str, *, exact: bool = True, **options) -> bool:
    """Whether a game is currently installed, by game id or by name."""
    if isinstance(game, int):
        return bool(find_itch_apps_by_id(game, **options))
    return bool(find_itch_apps_by_name(game, exact=exact, **options))
