"""Builds the shared test installation described by ``shared/fixtures.json``.

The JavaScript suite builds the same installation from the same file, so the
two implementations are tested against identical data and cannot drift apart in
what they consider a correct result.
"""

from __future__ import annotations

import gzip
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path

import pytest

SHARED = Path(__file__).resolve().parents[2] / "shared"
SCHEMA = (SHARED / "butler-schema.sql").read_text(encoding="utf-8")
DEFINITIONS = json.loads((SHARED / "definitions.json").read_text(encoding="utf-8"))
FIXTURE = json.loads((SHARED / "fixtures.json").read_text(encoding="utf-8"))


@dataclass
class Installation:
    """A throwaway itch installation on disk."""

    root: Path
    itch_path: Path

    def expand(self, template: str) -> Path:
        return Path(
            template.replace("{root}", str(self.root)).replace("{itch}", str(self.itch_path))
        )


def _write_receipt(install_path: Path, game: dict, *, gzip_it: bool = True, files: list[str] = ()) -> None:
    install_path.mkdir(parents=True, exist_ok=True)
    for name in files:
        target = install_path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.touch()

    receipt_dir = install_path / DEFINITIONS["receipt"]["directory"]
    receipt_dir.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(
        {
            "game": {**game, "platforms": {"linux": "all"}},
            "files": list(files),
            "installerName": "archive",
        }
    ).encode()
    if gzip_it:
        (receipt_dir / DEFINITIONS["receipt"]["fileName"]).write_bytes(gzip.compress(payload))
    else:
        (receipt_dir / DEFINITIONS["receipt"]["legacyFileName"]).write_bytes(payload)


def _write_database(install: Installation) -> None:
    db_path = install.itch_path / "db" / DEFINITIONS["databaseFileName"]["value"]
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.executescript(SCHEMA)

    for location in FIXTURE["installLocations"]:
        connection.execute(
            "INSERT INTO install_locations (id, path) VALUES (?, ?)",
            (location["id"], str(install.expand(location["path"]))),
        )

    for cave in FIXTURE["caves"]:
        game = cave.get("game", {})
        user = game.get("user")
        if user:
            connection.execute(
                "INSERT OR REPLACE INTO users (id, username, display_name) VALUES (?, ?, ?)",
                (user["id"], user["username"], user.get("displayName", "")),
            )
        connection.execute(
            "INSERT OR REPLACE INTO games "
            "(id, url, title, classification, windows, linux, osx, user_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                cave["gameId"],
                game.get("url"),
                game.get("title"),
                game.get("classification", "game"),
                game.get("windows"),
                game.get("linux"),
                game.get("osx"),
                (user or {}).get("id", 0),
            ),
        )
        upload = cave.get("upload")
        if upload:
            connection.execute(
                "INSERT OR REPLACE INTO uploads "
                "(id, storage, filename, display_name, size, channel_name, build_id, type) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    upload["id"],
                    upload.get("storage", "hosted"),
                    upload.get("filename"),
                    upload.get("displayName"),
                    upload.get("size", 0),
                    upload.get("channelName", ""),
                    upload.get("buildId", 0),
                    upload.get("type", "default"),
                ),
            )
        build = cave.get("build")
        if build:
            connection.execute(
                "INSERT OR REPLACE INTO builds "
                "(id, state, upload_id, game_id, version, user_version) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    build["id"],
                    build.get("state", "completed"),
                    (upload or {}).get("id", 0),
                    cave["gameId"],
                    build.get("version", 1),
                    build.get("userVersion"),
                ),
            )

        verdict = cave.get("verdict")
        if verdict is not None:
            verdict = json.loads(
                json.dumps(verdict)
                .replace("{root}", str(install.root))
                .replace("{itch}", str(install.itch_path))
            )
        connection.execute(
            "INSERT INTO caves (id, game_id, upload_id, build_id, pinned, installed_at, "
            "local_last_run_at, seconds_run, verdict, installed_size, install_location_id, "
            "install_folder_name, custom_install_folder) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                cave["id"],
                cave["gameId"],
                (upload or {}).get("id", 0),
                (build or {}).get("id", 0),
                1 if cave.get("pinned") else 0,
                cave.get("installedAt", "2026-01-01T00:00:00Z"),
                cave.get("lastPlayedAt"),
                cave.get("secondsRun", 0),
                json.dumps(verdict) if verdict is not None else None,
                cave.get("installedSize", 0),
                cave.get("installLocationId"),
                cave.get("installFolderName"),
                str(install.expand(cave["customInstallFolder"]))
                if cave.get("customInstallFolder")
                else "",
            ),
        )

    connection.commit()
    connection.close()


@pytest.fixture
def install(tmp_path: Path) -> Installation:
    """The canonical installation from shared/fixtures.json, on disk."""
    itch_path = tmp_path / "config" / "itch"
    (itch_path / "apps").mkdir(parents=True)
    built = Installation(root=tmp_path, itch_path=itch_path)

    (itch_path / "preferences.json").write_text(
        json.dumps(
            {
                "installLocations": {},
                "defaultInstallLocation": FIXTURE["defaultInstallLocation"],
            }
        )
    )
    _write_database(built)

    for cave in FIXTURE["caves"]:
        on_disk = cave.get("onDisk")
        if not on_disk:
            continue
        if cave.get("customInstallFolder"):
            install_path = built.expand(cave["customInstallFolder"])
        else:
            location = next(
                l for l in FIXTURE["installLocations"] if l["id"] == cave["installLocationId"]
            )
            install_path = built.expand(location["path"]) / cave["installFolderName"]
        game = cave.get("game", {})
        _write_receipt(
            install_path,
            {
                "id": cave["gameId"],
                "url": game.get("url"),
                "title": game.get("title"),
                "classification": game.get("classification", "game"),
            },
            files=on_disk.get("files", []),
        )

    for folder in FIXTURE["receiptOnlyFolders"]:
        _write_receipt(
            built.expand(folder["path"]), folder["game"], gzip_it=folder.get("gzip", True)
        )

    for noise in FIXTURE["noiseFolders"]["paths"]:
        built.expand(noise).mkdir(parents=True, exist_ok=True)

    return built


@pytest.fixture
def empty_home(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """A home directory with nothing in it, for path-search tests."""
    return tmp_path_factory.mktemp("empty-home")
