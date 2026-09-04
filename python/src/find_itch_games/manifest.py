"""The flattened per-game record.

itch describes an installed game twice -- as a cave row in butler.db and as a
receipt in the install folder. This module merges the two into a single
:class:`AppManifest`, the itch counterpart of a Steam ``appmanifest_*.acf``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .db import CaveRow
from .receipt import FoundReceipt, Receipt, get_legacy_receipt_path, get_receipt_path
from .types import Build, Game, LaunchCandidate, Platforms, Upload
from .utils import author_from_game_url, slug_from_game_url

__all__ = ["AppManifest", "get_launch_candidate_paths", "get_manifest_names"]


@dataclass
class AppManifest:
    """Everything itch knows about one installed game, flattened."""

    #: itch.io game id -- the closest thing to a Steam appid.
    game_id: int
    #: Absolute path to the installed game.
    path: Path
    #: Name of the install folder itself.
    install_folder_name: str
    #: Which record this came from: ``db``, ``receipt`` or ``db+receipt``.
    source: str
    #: itch's own id for this installation. Absent for receipt-only finds.
    cave_id: str | None = None
    title: str | None = None
    url: str | None = None
    #: ``distributrains`` in ``https://oddwarg.itch.io/distributrains``.
    slug: str | None = None
    #: ``oddwarg`` in the url above.
    author: str | None = None
    classification: str | None = None
    install_location_id: str | None = None
    #: Set when the game was installed outside any install location.
    custom_install_folder: str | None = None
    receipt_path: Path | None = None
    upload_id: int | None = None
    build_id: int | None = None
    #: The developer's own version string, for butler-pushed uploads.
    version: str | None = None
    channel_name: str | None = None
    installed_at: str | None = None
    last_played_at: str | None = None
    seconds_run: int | None = None
    installed_size: int | None = None
    pinned: bool | None = None
    platforms: Platforms = field(default_factory=Platforms)
    #: Launchables butler found, with paths relative to :attr:`path`.
    candidates: list[LaunchCandidate] = field(default_factory=list)
    game: Game | None = None
    upload: Upload | None = None
    build: Build | None = None


def get_launch_candidate_paths(manifest: AppManifest) -> list[Path]:
    """Absolute paths of the launch candidates butler found, best first."""
    return [manifest.path / candidate.path for candidate in manifest.candidates]


def get_manifest_names(manifest: AppManifest) -> list[str]:
    """Names a manifest answers to in :func:`find_itch_app_by_name`."""
    return [name for name in (manifest.title, manifest.slug, manifest.install_folder_name) if name]


def _receipt_path_for(install_path: Path, receipt: Receipt) -> Path:
    """The pre-v23 format lives at a different path, so report the real one."""
    return get_legacy_receipt_path(install_path) if receipt.legacy else get_receipt_path(install_path)


def manifest_from_cave(
    cave: CaveRow, install_path: Path, receipt: Receipt | None = None
) -> AppManifest:
    """Builds a manifest from a butler.db cave, filling gaps from the receipt."""
    game = cave.game or (receipt.game if receipt else None)
    upload = cave.upload or (receipt.upload if receipt else None)
    build = cave.build or (receipt.build if receipt else None) or (upload.build if upload else None)
    url = game.url if game else None

    return AppManifest(
        game_id=cave.game_id,
        path=install_path,
        install_folder_name=cave.install_folder_name or install_path.name,
        source="db+receipt" if receipt else "db",
        cave_id=cave.id,
        title=game.title if game else None,
        url=url,
        slug=slug_from_game_url(url),
        author=author_from_game_url(url) or (game.user.username if game and game.user else None),
        classification=game.classification if game else None,
        install_location_id=cave.install_location_id,
        custom_install_folder=cave.custom_install_folder,
        receipt_path=_receipt_path_for(install_path, receipt) if receipt else None,
        upload_id=cave.upload_id or (upload.id if upload else None),
        build_id=cave.build_id or (build.id if build else None),
        version=build.user_version if build else None,
        channel_name=upload.channel_name if upload else None,
        installed_at=cave.installed_at,
        last_played_at=cave.last_played_at,
        seconds_run=cave.seconds_run,
        installed_size=cave.installed_size
        or (cave.verdict.total_size if cave.verdict else None),
        pinned=cave.pinned,
        platforms=game.platforms if game else Platforms(),
        candidates=list(cave.verdict.candidates) if cave.verdict else [],
        game=game,
        upload=upload,
        build=build,
    )


def manifest_from_receipt(
    found: FoundReceipt, install_location_id: str | None = None
) -> AppManifest:
    """Builds a manifest from an on-disk receipt alone.

    Used for games butler.db has no cave for: itch reinstalled from scratch,
    the database was reset, or the folder was copied in from another machine.
    """
    receipt = found.receipt
    url = receipt.game.url
    build = receipt.build or (receipt.upload.build if receipt.upload else None)

    return AppManifest(
        game_id=receipt.game.id,
        path=found.path,
        install_folder_name=found.install_folder_name,
        source="receipt",
        title=receipt.game.title,
        url=url,
        slug=slug_from_game_url(url),
        author=author_from_game_url(url) or (receipt.game.user.username if receipt.game.user else None),
        classification=receipt.game.classification,
        install_location_id=install_location_id,
        receipt_path=_receipt_path_for(found.path, receipt),
        upload_id=receipt.upload.id if receipt.upload else None,
        build_id=build.id if build else None,
        version=build.user_version if build else None,
        channel_name=receipt.upload.channel_name if receipt.upload else None,
        platforms=receipt.game.platforms,
        game=receipt.game,
        upload=receipt.upload,
        build=build,
    )
