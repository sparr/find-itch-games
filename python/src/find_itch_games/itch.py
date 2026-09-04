"""Locating the itch app itself.

itch is an Electron app, so its user data lives wherever
``app.getPath("userData")`` resolves to on each platform, under the name of the
variant that was installed (``itch`` stable or ``kitch`` canary). Everything
else this library reads is addressed relative to that directory.
"""

from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from .errors import ItchNotFoundError

__all__ = [
    "ITCH_APP_NAMES",
    "PathLookup",
    "find_itch_path",
    "get_appdata_install_location",
    "get_database_path",
    "get_itch_path_candidates",
    "get_preferences_path",
    "require_itch_path",
    "resolve_database_path",
]

#: The app names itch ships under.
#:
#: The codebase builds two variants that install side by side: ``itch``
#: (stable) and ``kitch`` (canary), selected by whether the release tag ends in
#: ``-canary``. Each gets its own Electron ``userData`` directory.
ITCH_APP_NAMES: tuple[str, ...] = ("itch", "kitch")

_ALTERNATE_DATABASE = re.compile(r"^butler.*\.db$")


@dataclass
class PathLookup:
    """Where to look for itch, when not the current user on the current machine.

    Every field defaults to the ambient value, so the default searches for the
    running user's own installation. Supplying them asks where itch *would* be
    for another home directory, environment or operating system -- useful for
    tools that scan several user profiles or inspect a mounted disk, and the
    reason this library's tests never mutate the environment.
    """

    #: Home directory to resolve ``~``-relative candidates against.
    home: Path | str | None = None
    #: Environment to read ``APPDATA``, ``XDG_CONFIG_HOME`` and the overrides from.
    env: dict[str, str] | None = None
    #: Operating system whose conventions to follow, as ``sys.platform`` spells it.
    platform: str | None = None

    def resolved(self) -> tuple[Path, dict[str, str], str]:
        home = Path(self.home) if self.home is not None else Path.home()
        env = dict(os.environ) if self.env is None else self.env
        platform = self.platform if self.platform is not None else sys.platform
        return home, env, platform


def get_itch_path_candidates(lookup: PathLookup | None = None) -> list[Path]:
    """Directories itch may keep its user data in, most specific first.

    Mirrors Electron's ``app.getPath("userData")`` for each app variant.

    ``ITCH_USER_DATA_DIR`` and ``ITCH_APP_DIR`` are this library's own escape
    hatch for unusual installs -- the itch app itself does not read them.
    """
    home, env, platform = (lookup or PathLookup()).resolved()
    candidates: list[Path] = []

    def push(*parts: str | Path | None) -> None:
        if all(parts):
            candidates.append(Path(*(str(p) for p in parts)))  # type: ignore[arg-type]

    push(env.get("ITCH_USER_DATA_DIR"))
    push(env.get("ITCH_APP_DIR"))

    for app_name in ITCH_APP_NAMES:
        if platform == "win32":
            # Electron's `appData` on Windows is %APPDATA% (Roaming).
            push(env.get("APPDATA"), app_name)
            push(home, "AppData", "Roaming", app_name)
            push(env.get("LOCALAPPDATA"), app_name)
        elif platform == "darwin":
            push(home, "Library", "Application Support", app_name)
        else:
            push(env.get("XDG_CONFIG_HOME"), app_name)
            push(home, ".config", app_name)
            # Flatpak redirects XDG_CONFIG_HOME inside the sandbox only; from
            # outside it, the app's config lives here.
            push(home, ".var", "app", f"io.{app_name}.{app_name}", "config", app_name)

    seen: dict[str, Path] = {}
    for candidate in candidates:
        seen.setdefault(str(candidate), candidate)
    return list(seen.values())


def get_database_path(itch_path: Path | str) -> Path:
    """The default butler database inside an itch user-data directory."""
    return Path(itch_path) / "db" / "butler.db"


def resolve_database_path(itch_path: Path | str) -> Path:
    """Locates butler.db, allowing for the ``butler-<host>.db`` name that builds
    configured against a non-standard itch.io host use.

    Falls back to the default name when there is none on disk, so callers
    always have a path to report.
    """
    default = get_database_path(itch_path)
    if default.is_file():
        return default
    try:
        entries = sorted(p.name for p in (Path(itch_path) / "db").iterdir())
    except OSError:
        return default
    alternates = [name for name in entries if _ALTERNATE_DATABASE.match(name)]
    return Path(itch_path) / "db" / alternates[0] if alternates else default


def get_preferences_path(itch_path: Path | str) -> Path:
    """The itch app's preferences file inside an itch user-data directory."""
    return Path(itch_path) / "preferences.json"


def get_appdata_install_location(itch_path: Path | str) -> Path:
    """The built-in ``appdata`` install location, which itch derives from its
    own user-data directory rather than storing as a path."""
    return Path(itch_path) / "apps"


def _looks_like_itch_path(candidate: Path) -> bool:
    if not candidate.is_dir():
        return False
    return (
        get_database_path(candidate).is_file()
        or get_preferences_path(candidate).is_file()
        or get_appdata_install_location(candidate).is_dir()
    )


def find_itch_path(lookup: PathLookup | None = None) -> Path | None:
    """Searches for the itch app's user-data directory.

    Returns ``None`` if itch was not found.
    """
    for candidate in get_itch_path_candidates(lookup):
        if _looks_like_itch_path(candidate):
            return candidate
    return None


def require_itch_path(
    itch_path: Path | str | None = None, lookup: PathLookup | None = None
) -> Path:
    """Like :func:`find_itch_path`, but raises :class:`ItchNotFoundError`."""
    if itch_path is not None:
        if not Path(itch_path).is_dir():
            raise ItchNotFoundError([str(itch_path)])
        return Path(itch_path)

    found = find_itch_path(lookup)
    if found is None:
        raise ItchNotFoundError([str(p) for p in get_itch_path_candidates(lookup)])
    return found
