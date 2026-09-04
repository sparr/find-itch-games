"""Read-only access to itch's butler database.

``butler.db`` is a SQLite database written by butler, itch's install/launch
backend. This module opens it through the standard library's :mod:`sqlite3` and
flattens the rows this library cares about: install locations, and the "caves"
that record each installed game.
"""

from __future__ import annotations

import json
import shutil
import sqlite3
import tempfile
from contextlib import contextmanager
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import ItchDatabaseError
from .types import Build, Game, Platforms, Upload, User, Verdict

__all__ = ["CaveRow", "InstallLocationRow", "open_butler_database", "read_caves", "read_install_locations"]


@dataclass
class InstallLocationRow:
    """An install location as butler.db records it."""

    #: ``appdata`` for the built-in location, otherwise a uuid.
    id: str
    #: Absolute path of the directory games are installed into.
    path: str


@dataclass
class CaveRow:
    """A "cave" is itch's record of one installed game."""

    id: str
    game_id: int
    upload_id: int | None = None
    build_id: int | None = None
    install_location_id: str | None = None
    install_folder_name: str | None = None
    custom_install_folder: str | None = None
    installed_at: str | None = None
    #: Last run, reconciled with itch.io's cross-device play summary.
    last_touched_at: str | None = None
    #: Last run on this machine, which itch tracks separately.
    last_played_at: str | None = None
    #: Total play time in seconds, as itch.io reports it across devices.
    seconds_run: int | None = None
    installed_size: int | None = None
    pinned: bool | None = None
    verdict: Verdict | None = None
    game: Game | None = None
    upload: Upload | None = None
    build: Build | None = None


@contextmanager
def open_butler_database(database_path: Path | str) -> Iterator[sqlite3.Connection]:
    """Opens butler.db read-only, as a context manager.

    The itch app keeps the database open in WAL mode while it runs; concurrent
    readers are fine. If the file itself cannot be opened -- a read-only mount,
    a permissions mismatch, a stale ``-shm`` -- this retries against a private
    copy of the database and its journal, which is still consistent.

    Note the URI deliberately uses ``mode=ro`` and *not* ``immutable=1``: the
    latter ignores the write-ahead log, and would silently miss any game
    installed since the last checkpoint.
    """
    path = Path(database_path)
    try:
        connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    except sqlite3.Error as direct_error:
        try:
            with _copied_database(path) as copy:
                copy.row_factory = sqlite3.Row
                yield copy
            return
        except Exception:
            raise ItchDatabaseError(str(path), direct_error) from direct_error

    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


@contextmanager
def _copied_database(path: Path) -> Iterator[sqlite3.Connection]:
    with tempfile.TemporaryDirectory(prefix="find-itch-games-") as tmp:
        copy_path = Path(tmp) / path.name
        # The `-wal` holds everything itch has written since the last
        # checkpoint, so copying the main file alone would return stale rows.
        for suffix in ("", "-wal", "-shm"):
            try:
                shutil.copyfile(str(path) + suffix, str(copy_path) + suffix)
            except OSError:
                if suffix == "":
                    raise
        connection = sqlite3.connect(f"file:{copy_path}?mode=ro", uri=True)
        try:
            yield connection
        finally:
            connection.close()


def _table_exists(connection: sqlite3.Connection, table: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
    ).fetchone()
    return row is not None


def read_install_locations(connection: sqlite3.Connection) -> list[InstallLocationRow]:
    """Reads the install locations itch will place games into."""
    if not _table_exists(connection, "install_locations"):
        return []
    rows = connection.execute("SELECT id, path FROM install_locations").fetchall()
    return [
        InstallLocationRow(id=row["id"], path=row["path"])
        for row in rows
        if row["id"] and row["path"]
    ]


def _text(value: Any) -> str | None:
    return value if isinstance(value, str) and value != "" else None


def _number(value: Any) -> int | None:
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _flag(value: Any) -> bool | None:
    number = _number(value)
    return None if number is None else number != 0


def _platforms(row: Any, prefix: str) -> Platforms:
    return Platforms(
        windows=_text(row[f"{prefix}_windows"]),
        linux=_text(row[f"{prefix}_linux"]),
        osx=_text(row[f"{prefix}_osx"]),
    )


CAVES_QUERY = """
  SELECT
    caves.id                    AS cave_id,
    caves.game_id               AS game_id,
    caves.upload_id             AS upload_id,
    caves.build_id              AS build_id,
    caves.install_location_id   AS install_location_id,
    caves.install_folder_name   AS install_folder_name,
    caves.custom_install_folder AS custom_install_folder,
    caves.installed_at          AS installed_at,
    caves.last_touched_at       AS last_touched_at,
    caves.local_last_run_at     AS local_last_run_at,
    caves.seconds_run           AS seconds_run,
    caves.installed_size        AS installed_size,
    caves.pinned                AS pinned,
    caves.verdict               AS verdict,

    games.url                   AS game_url,
    games.title                 AS game_title,
    games.short_text            AS game_short_text,
    games.type                  AS game_type,
    games.classification        AS game_classification,
    games.cover_url             AS game_cover_url,
    games.still_cover_url       AS game_still_cover_url,
    games.created_at            AS game_created_at,
    games.published_at          AS game_published_at,
    games.min_price             AS game_min_price,
    games.can_be_bought         AS game_can_be_bought,
    games.has_demo              AS game_has_demo,
    games.in_press_system       AS game_in_press_system,
    games.windows               AS game_windows,
    games.linux                 AS game_linux,
    games.osx                   AS game_osx,
    games.user_id               AS game_user_id,

    users.username              AS user_username,
    users.display_name          AS user_display_name,
    users.url                   AS user_url,
    users.cover_url             AS user_cover_url,
    users.still_cover_url       AS user_still_cover_url,

    uploads.storage             AS upload_storage,
    uploads.host                AS upload_host,
    uploads.filename            AS upload_filename,
    uploads.display_name        AS upload_display_name,
    uploads.size                AS upload_size,
    uploads.channel_name        AS upload_channel_name,
    uploads.type                AS upload_type,
    uploads.preorder            AS upload_preorder,
    uploads.demo                AS upload_demo,
    uploads.windows             AS upload_windows,
    uploads.linux               AS upload_linux,
    uploads.osx                 AS upload_osx,
    uploads.created_at          AS upload_created_at,
    uploads.updated_at          AS upload_updated_at,

    builds.parent_build_id      AS build_parent_build_id,
    builds.state                AS build_state,
    builds.version              AS build_version,
    builds.user_version         AS build_user_version,
    builds.user_id              AS build_user_id,
    builds.created_at           AS build_created_at,
    builds.updated_at           AS build_updated_at
  FROM caves
  LEFT JOIN games   ON games.id   = caves.game_id
  LEFT JOIN users   ON users.id   = games.user_id
  LEFT JOIN uploads ON uploads.id = caves.upload_id
  LEFT JOIN builds  ON builds.id  = caves.build_id
"""


def read_caves(connection: sqlite3.Connection) -> list[CaveRow]:
    """Reads every installed game itch knows about."""
    caves: list[CaveRow] = []
    for row in connection.execute(CAVES_QUERY).fetchall():
        cave_id = _text(row["cave_id"])
        game_id = _number(row["game_id"])
        if cave_id is None or game_id is None:
            continue

        verdict_text = _text(row["verdict"])
        verdict = None
        if verdict_text:
            try:
                verdict = Verdict.from_dict(json.loads(verdict_text))
            except ValueError:
                verdict = None

        caves.append(
            CaveRow(
                id=cave_id,
                game_id=game_id,
                upload_id=_number(row["upload_id"]) or None,
                build_id=_number(row["build_id"]) or None,
                install_location_id=_text(row["install_location_id"]),
                install_folder_name=_text(row["install_folder_name"]),
                custom_install_folder=_text(row["custom_install_folder"]),
                installed_at=_text(row["installed_at"]),
                last_touched_at=_text(row["last_touched_at"]),
                last_played_at=_text(row["local_last_run_at"]),
                seconds_run=_number(row["seconds_run"]),
                installed_size=_number(row["installed_size"]),
                pinned=_flag(row["pinned"]),
                verdict=verdict,
                game=_build_game(game_id, row),
                upload=_build_upload(row),
                build=_build_build(row),
            )
        )
    return caves


def _build_game(game_id: int, row: Any) -> Game:
    user = None
    if _text(row["user_username"]):
        user = User(
            id=_number(row["game_user_id"]),
            username=_text(row["user_username"]),
            display_name=_text(row["user_display_name"]),
            url=_text(row["user_url"]),
            cover_url=_text(row["user_cover_url"]),
            still_cover_url=_text(row["user_still_cover_url"]),
        )
    return Game(
        id=game_id,
        url=_text(row["game_url"]),
        title=_text(row["game_title"]),
        short_text=_text(row["game_short_text"]),
        type=_text(row["game_type"]),
        classification=_text(row["game_classification"]),
        cover_url=_text(row["game_cover_url"]),
        still_cover_url=_text(row["game_still_cover_url"]),
        created_at=_text(row["game_created_at"]),
        published_at=_text(row["game_published_at"]),
        min_price=_number(row["game_min_price"]),
        can_be_bought=_flag(row["game_can_be_bought"]),
        has_demo=_flag(row["game_has_demo"]),
        in_press_system=_flag(row["game_in_press_system"]),
        platforms=_platforms(row, "game"),
        user=user,
        user_id=_number(row["game_user_id"]),
    )


def _build_upload(row: Any) -> Upload | None:
    upload_id = _number(row["upload_id"])
    if not upload_id:
        return None
    return Upload(
        id=upload_id,
        storage=_text(row["upload_storage"]),
        host=_text(row["upload_host"]),
        filename=_text(row["upload_filename"]),
        display_name=_text(row["upload_display_name"]),
        size=_number(row["upload_size"]),
        channel_name=_text(row["upload_channel_name"]),
        build_id=_number(row["build_id"]) or None,
        type=_text(row["upload_type"]),
        preorder=_flag(row["upload_preorder"]),
        demo=_flag(row["upload_demo"]),
        platforms=_platforms(row, "upload"),
        created_at=_text(row["upload_created_at"]),
        updated_at=_text(row["upload_updated_at"]),
    )


def _build_build(row: Any) -> Build | None:
    build_id = _number(row["build_id"])
    if not build_id:
        return None
    return Build(
        id=build_id,
        parent_build_id=_number(row["build_parent_build_id"]) or None,
        state=_text(row["build_state"]),
        version=_number(row["build_version"]),
        user_version=_text(row["build_user_version"]),
        upload_id=_number(row["upload_id"]) or None,
        game_id=_number(row["game_id"]),
        user_id=_number(row["build_user_id"]),
        created_at=_text(row["build_created_at"]),
        updated_at=_text(row["build_updated_at"]),
    )
