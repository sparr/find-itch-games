"""The error types this library raises."""

from __future__ import annotations

from collections.abc import Sequence

__all__ = [
    "AmbiguousAppError",
    "AppNotFoundError",
    "ItchDatabaseError",
    "ItchNotFoundError",
]


class ItchNotFoundError(Exception):
    """Raised when the itch app's user-data directory cannot be located."""

    def __init__(self, searched: Sequence[str] | None = None) -> None:
        self.searched = list(searched or [])
        if self.searched:
            listed = "\n  ".join(self.searched)
            super().__init__(f"itch installation not found. Searched:\n  {listed}")
        else:
            super().__init__("itch installation not found")


class AppNotFoundError(Exception):
    """Raised when a game is installed nowhere itch knows about."""

    def __init__(self, query: str | int) -> None:
        self.query = query
        super().__init__(f"itch game not found: {query}")


class AmbiguousAppError(Exception):
    """Raised when a lookup matches more than one installed game.

    Only raised when ``strict`` is set; otherwise the first match wins. Use
    :func:`find_itch_apps_by_name` or :func:`find_itch_apps_by_id` to see every
    match.
    """

    def __init__(self, query: str | int, paths: Sequence[str]) -> None:
        self.query = query
        self.paths = list(paths)
        listed = "\n  ".join(self.paths)
        super().__init__(
            f'itch game "{query}" matched {len(self.paths)} installed games:\n  {listed}'
        )


class ItchDatabaseError(Exception):
    """Raised when butler.db exists but cannot be opened or read."""

    def __init__(self, database_path: str, cause: BaseException) -> None:
        self.database_path = database_path
        self.__cause__ = cause
        super().__init__(f"failed to read butler database at {database_path}: {cause}")
