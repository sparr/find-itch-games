"""Types mirroring itch's own definitions.

Game/Upload/Build/User follow ``github.com/itchio/go-itchio``, and the verdict
types follow ``github.com/itchio/dash``. The permitted string values are listed
in ``shared/definitions.json``, which the test suites check these against.
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields
from typing import Any, Literal, TypeVar

__all__ = [
    "Architectures",
    "Build",
    "Flavor",
    "Game",
    "GameClassification",
    "LaunchCandidate",
    "Platforms",
    "Upload",
    "UploadStorage",
    "User",
    "Verdict",
]

#: ``"all"``, ``"386"`` or ``"amd64"``.
Architectures = str
#: ``game``, ``tool``, ``assets``, ``game_mod``, ...
GameClassification = str
#: ``hosted``, ``build`` or ``external``.
UploadStorage = str
#: ``linux``, ``macos``, ``windows``, ``app-macos``, ``jar``, ``html``, ...
Flavor = str

_T = TypeVar("_T", bound="_FromMapping")


def _snake(name: str) -> str:
    return "".join(f"_{c.lower()}" if c.isupper() else c for c in name)


class _FromMapping:
    """Builds a dataclass from itch's camelCase JSON, ignoring unknown keys.

    itch adds fields over time; anything this library does not model is dropped
    rather than raising, so a newer itch cannot break a lookup.
    """

    @classmethod
    def from_dict(cls: type[_T], data: dict[str, Any] | None) -> _T | None:
        if not data:
            return None
        known = {f.name: f for f in fields(cls)}  # type: ignore[arg-type]
        kwargs: dict[str, Any] = {}
        for key, value in data.items():
            name = _snake(key)
            if name not in known:
                continue
            kwargs[name] = cls._convert(name, value)
        return cls(**kwargs)  # type: ignore[return-value]

    @classmethod
    def _convert(cls, name: str, value: Any) -> Any:
        return value


@dataclass
class Platforms:
    """Which OS/architectures a game or upload is compatible with."""

    windows: Architectures | None = None
    linux: Architectures | None = None
    osx: Architectures | None = None

    def __bool__(self) -> bool:
        return any((self.windows, self.linux, self.osx))


@dataclass
class User(_FromMapping):
    """The itch.io account a game belongs to."""

    id: int | None = None
    username: str | None = None
    display_name: str | None = None
    developer: bool | None = None
    press_user: bool | None = None
    url: str | None = None
    cover_url: str | None = None
    still_cover_url: str | None = None


@dataclass
class Game(_FromMapping):
    """A game as itch describes it, from butler.db or an on-disk receipt."""

    id: int = 0
    url: str | None = None
    title: str | None = None
    short_text: str | None = None
    type: str | None = None
    classification: GameClassification | None = None
    cover_url: str | None = None
    still_cover_url: str | None = None
    created_at: str | None = None
    published_at: str | None = None
    min_price: int | None = None
    can_be_bought: bool | None = None
    has_demo: bool | None = None
    in_press_system: bool | None = None
    platforms: Platforms = field(default_factory=Platforms)
    user: User | None = None
    user_id: int | None = None

    @classmethod
    def _convert(cls, name: str, value: Any) -> Any:
        if name == "platforms" and isinstance(value, dict):
            return Platforms(**{k: v for k, v in value.items() if k in ("windows", "linux", "osx")})
        if name == "user" and isinstance(value, dict):
            return User.from_dict(value)
        return value


@dataclass
class Build(_FromMapping):
    """Present only for wharf (``storage="build"``) uploads."""

    id: int = 0
    parent_build_id: int | None = None
    state: str | None = None
    version: int | None = None
    user_version: str | None = None
    upload_id: int | None = None
    game_id: int | None = None
    user_id: int | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class Upload(_FromMapping):
    """The specific file or channel that was installed."""

    id: int = 0
    storage: UploadStorage | None = None
    host: str | None = None
    filename: str | None = None
    display_name: str | None = None
    size: int | None = None
    channel_name: str | None = None
    build_id: int | None = None
    build: Build | None = None
    type: str | None = None
    preorder: bool | None = None
    demo: bool | None = None
    platforms: Platforms = field(default_factory=Platforms)
    created_at: str | None = None
    updated_at: str | None = None

    @classmethod
    def _convert(cls, name: str, value: Any) -> Any:
        if name == "platforms" and isinstance(value, dict):
            return Platforms(**{k: v for k, v in value.items() if k in ("windows", "linux", "osx")})
        if name == "build" and isinstance(value, dict):
            return Build.from_dict(value)
        return value


@dataclass
class LaunchCandidate(_FromMapping):
    """A launchable target butler found while scanning an install folder.

    ``path`` is relative to the install folder; use
    :func:`get_launch_candidate_paths` to resolve it.
    """

    path: str = ""
    mode: int | None = None
    depth: int | None = None
    flavor: Flavor | None = None
    arch: str | None = None
    size: int | None = None
    spell: list[str] | None = None
    windows_info: dict[str, Any] | None = None
    linux_info: dict[str, Any] | None = None
    macos_info: dict[str, Any] | None = None
    love_info: dict[str, Any] | None = None
    script_info: dict[str, Any] | None = None
    jar_info: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


@dataclass
class Verdict(_FromMapping):
    """Butler's scan of an install folder, stored on the cave."""

    base_path: str | None = None
    total_size: int | None = None
    candidates: list[LaunchCandidate] = field(default_factory=list)

    @classmethod
    def _convert(cls, name: str, value: Any) -> Any:
        if name == "candidates":
            return [c for c in (LaunchCandidate.from_dict(v) for v in value or []) if c]
        return value
