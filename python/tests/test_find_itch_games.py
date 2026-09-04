"""Tests for the Python implementation.

The installation under test is described by ``shared/fixtures.json`` and built
by ``conftest.py``; the JavaScript suite builds the same one from the same
file. Assertions that check a value both implementations must agree on are
taken from ``shared/definitions.json`` rather than written out here.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from conftest import DEFINITIONS, FIXTURE, Installation

import find_itch_games as fig
from find_itch_games import (
    AmbiguousAppError,
    AppNotFoundError,
    ItchNotFoundError,
    PathLookup,
)


# --- the shared vocabulary -------------------------------------------------


def test_strategies_match_shared_definitions():
    assert list(fig.ITCH_STRATEGIES) == DEFINITIONS["strategies"]["values"]


def test_app_names_match_shared_definitions():
    assert list(fig.ITCH_APP_NAMES) == DEFINITIONS["appNames"]["values"]


def test_receipt_layout_matches_shared_definitions():
    install_path = Path("/games/some-game")
    receipt = DEFINITIONS["receipt"]
    assert fig.RECEIPT_DIR == receipt["directory"]
    assert fig.get_receipt_path(install_path) == install_path / receipt["directory"] / receipt["fileName"]
    assert (
        fig.get_legacy_receipt_path(install_path)
        == install_path / receipt["directory"] / receipt["legacyFileName"]
    )


def test_staging_and_appdata_match_shared_definitions():
    assert fig.get_library_downloads_folder("/games") == Path("/games") / DEFINITIONS["stagingFolderName"]["value"]
    assert (
        fig.get_appdata_install_location("/itch")
        == Path("/itch") / DEFINITIONS["builtinInstallLocationId"]["relativePath"]
    )
    assert fig.get_database_path("/itch") == Path("/itch") / "db" / DEFINITIONS["databaseFileName"]["value"]


# --- the shared fixture's expected results ---------------------------------


@pytest.mark.parametrize("strategy", DEFINITIONS["strategies"]["values"])
def test_strategy_returns_the_shared_expected_game_ids(install: Installation, strategy: str):
    expected = FIXTURE["expected"]["gameIdsByStrategy"][strategy]
    apps = fig.find_itch_apps(itch_path=install.itch_path, strategy=strategy)
    assert sorted(app.game_id for app in apps) == sorted(expected)


def test_install_locations_match_the_shared_expectation(install: Installation):
    paths = fig.find_itch_libraries_paths(itch_path=install.itch_path)
    expected = [install.expand(p).resolve() for p in FIXTURE["expected"]["installLocationPaths"]]
    assert sorted(paths) == sorted(expected)


def test_default_install_location_is_marked(install: Installation):
    raw = fig.find_itch_libraries(itch_path=install.itch_path)
    defaults = [library for library in raw.libraries if library.is_default]
    assert [library.id for library in defaults] == [FIXTURE["defaultInstallLocation"]]


def test_drops_caves_whose_folder_is_gone(install: Installation):
    apps = fig.find_itch_apps(itch_path=install.itch_path)
    for game_id in FIXTURE["expected"]["droppedWhenCheckExists"]:
        assert game_id not in {app.game_id for app in apps}


def test_keeps_them_when_check_exists_is_off(install: Installation):
    apps = fig.find_itch_apps(itch_path=install.itch_path, check_exists=False)
    for game_id in FIXTURE["expected"]["droppedWhenCheckExists"]:
        assert game_id in {app.game_id for app in apps}


def test_ignores_unrelated_and_staging_folders(install: Installation):
    result = fig.find_itch(itch_path=install.itch_path)
    for library_template in FIXTURE["expected"]["librariesWithNoGames"]:
        path = install.expand(library_template).resolve()
        library = next(l for l in result.libraries if l.path == path)
        assert library.apps == []
    names = {app.manifest.install_folder_name for app in fig.find_itch_apps(itch_path=install.itch_path)}
    assert DEFINITIONS["stagingFolderName"]["value"] not in names


def test_synthesizes_a_library_for_a_custom_install_folder(install: Installation):
    result = fig.find_itch(itch_path=install.itch_path)
    elsewhere = (install.root / "Elsewhere").resolve()
    library = next(l for l in result.libraries if l.path == elsewhere)
    assert [app.game_id for app in library.apps] == [999002]


# --- lookups ---------------------------------------------------------------


def test_finds_a_game_by_id_and_name(install: Installation):
    options = {"itch_path": install.itch_path}
    expected = (install.root / "Games" / "itch" / "distributrains").resolve()
    assert fig.find_itch_app_by_id(4225297, **options) == expected
    assert fig.find_itch_app_by_name("Distributrains", **options) == expected
    assert fig.find_itch_app_by_name("distributrains", **options) == expected


def test_exact_by_default_and_fuzzy_on_request(install: Installation):
    options = {"itch_path": install.itch_path}
    with pytest.raises(AppNotFoundError):
        fig.find_itch_app_by_name("godot pck explorer", **options)
    assert fig.find_itch_app_by_name("godot pck explorer", exact=False, **options).name == "godot-pck-explorer"


def test_unknown_lookups_raise(install: Installation):
    options = {"itch_path": install.itch_path}
    with pytest.raises(AppNotFoundError):
        fig.find_itch_app_by_id(1, **options)
    with pytest.raises(AppNotFoundError):
        fig.find_itch_app_by_name("Half-Life 3", **options)
    assert fig.has_itch_app(4225297, **options) is True
    assert fig.has_itch_app(1, **options) is False


def test_strict_raises_on_ambiguity(install: Installation, tmp_path: Path):
    # The same game installed in two locations.
    import gzip, json as _json

    for name in ("A", "B"):
        folder = tmp_path / name / "twice" / ".itch"
        folder.mkdir(parents=True)
        folder.joinpath("receipt.json.gz").write_bytes(
            gzip.compress(_json.dumps({"game": {"id": 4242, "title": "Twice"}, "files": []}).encode())
        )
    options = {
        "itch_path": install.itch_path,
        "extra_libraries": [tmp_path / "A", tmp_path / "B"],
    }
    assert len(fig.find_itch_apps_by_id(4242, **options)) == 2
    assert fig.find_itch_app_by_id(4242, **options) is not None
    with pytest.raises(AmbiguousAppError):
        fig.find_itch_app_by_id(4242, strict=True, **options)


# --- strategies ------------------------------------------------------------


def test_rejects_an_unknown_strategy(install: Installation):
    for strategy in ("recipts", "DB", ""):
        with pytest.raises(ValueError, match="unknown itch strategy"):
            fig.find_itch_apps(itch_path=install.itch_path, strategy=strategy)


def test_rejects_an_unknown_strategy_even_with_ignore_database(install: Installation):
    with pytest.raises(ValueError):
        fig.find_itch_apps(itch_path=install.itch_path, strategy="recipts", ignore_database=True)


def test_manifest_sources_are_from_the_shared_vocabulary(install: Installation):
    allowed = set(DEFINITIONS["manifestSources"]["values"])
    for strategy in DEFINITIONS["strategies"]["values"]:
        for app in fig.find_itch_apps(itch_path=install.itch_path, strategy=strategy):
            assert app.manifest.source in allowed


# --- path searching --------------------------------------------------------


def test_searches_only_under_the_given_home(empty_home: Path):
    candidates = fig.get_itch_path_candidates(PathLookup(home=empty_home, env={}))
    assert candidates
    assert all(str(c).startswith(str(empty_home)) for c in candidates)


def test_finds_nothing_when_itch_is_absent(empty_home: Path):
    lookup = PathLookup(home=empty_home, env={})
    assert fig.find_itch_path(lookup) is None
    with pytest.raises(ItchNotFoundError):
        fig.find_itch(lookup=lookup)


def test_honours_the_environment_override(install: Installation, empty_home: Path):
    lookup = PathLookup(home=empty_home, env={"ITCH_USER_DATA_DIR": str(install.itch_path)})
    assert fig.find_itch_path(lookup) == install.itch_path


@pytest.mark.parametrize("platform", ["win32", "darwin", "linux"])
def test_platform_conventions_match_shared_templates(platform: str):
    env = {
        "APPDATA": "/appdata",
        "LOCALAPPDATA": "/localappdata",
        "XDG_CONFIG_HOME": "/xdg",
    }
    candidates = [
        str(c) for c in fig.get_itch_path_candidates(PathLookup(home="/home/u", env=env, platform=platform))
    ]
    for template in DEFINITIONS["pathCandidates"][platform]:
        for app_name in DEFINITIONS["appNames"]["values"]:
            expected = (
                template.replace("{home}", "/home/u")
                .replace("{app}", app_name)
                .replace("${APPDATA}", env["APPDATA"])
                .replace("${LOCALAPPDATA}", env["LOCALAPPDATA"])
                .replace("${XDG_CONFIG_HOME}", env["XDG_CONFIG_HOME"])
            )
            assert str(Path(expected)) in candidates


def test_overrides_come_first_on_every_platform():
    for platform in ("win32", "darwin", "linux"):
        candidates = fig.get_itch_path_candidates(
            PathLookup(home="/home/u", env={"ITCH_USER_DATA_DIR": "/override"}, platform=platform)
        )
        assert str(candidates[0]) == "/override"


# --- receipts --------------------------------------------------------------


def test_reads_gzipped_and_uncompressed_receipts(install: Installation):
    gzipped = fig.read_receipt(install.root / "Games" / "itch" / "distributrains")
    assert gzipped is not None and gzipped.game.id == 4225297
    plain = fig.read_receipt(install.root / "Games" / "itch" / "cosmic-collapse")
    assert plain is not None and plain.game.id == 2328674


def test_returns_none_without_a_receipt(install: Installation):
    assert fig.read_receipt(install.root / "Games" / "VintageStory") is None
    assert fig.read_receipt(install.root / "nope") is None


def test_reads_the_legacy_receipt_shape(tmp_path: Path):
    import json as _json

    folder = tmp_path / "old-game" / ".itch"
    folder.mkdir(parents=True)
    folder.joinpath("receipt.json").write_text(
        _json.dumps(
            {
                "cave": {
                    "id": "legacy-cave",
                    "gameId": 55555,
                    "uploadId": 66666,
                    "buildId": 0,
                    "pathScheme": 2,
                    "installLocation": "appdata",
                    "installFolder": "old-game",
                },
                "files": ["game.exe"],
            }
        )
    )
    receipt = fig.read_receipt(tmp_path / "old-game")
    assert receipt is not None
    assert receipt.game.id == 55555
    assert receipt.upload is not None and receipt.upload.id == 66666
    assert receipt.build is None
    assert receipt.legacy is not None and receipt.legacy.cave_id == "legacy-cave"


def test_scan_requires_a_dot_itch_directory(tmp_path: Path):
    (tmp_path / "not-a-game").mkdir()
    (tmp_path / "not-a-game" / "receipt.json").write_text('{"game":{"id":1}}')
    assert fig.find_receipts(tmp_path) == []
