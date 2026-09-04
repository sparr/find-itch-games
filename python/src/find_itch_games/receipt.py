"""Reading the receipts itch leaves in install folders.

Every folder itch installs a game into gets a ``.itch/receipt.json.gz``
describing what was put there. It is the on-disk source of truth: it survives a
database reset, and its presence is what distinguishes an itch game folder from
any other directory.
"""

from __future__ import annotations

import gzip
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .types import Build, Game, Upload
from .utils import read_subdirectories

__all__ = [
    "RECEIPT_DIR",
    "FoundReceipt",
    "LegacyReceiptInfo",
    "Receipt",
    "find_receipts",
    "get_legacy_receipt_path",
    "get_receipt_path",
    "has_receipt",
    "read_receipt",
]

#: The metadata directory itch keeps inside an install folder.
RECEIPT_DIR = ".itch"

#: itch's staging area, never a game folder. Matches butler's own scan.
_STAGING_FOLDER = "downloads"


@dataclass
class LegacyReceiptInfo:
    """What the pre-v23 uncompressed ``.itch/receipt.json`` recorded.

    Mirrors butler's ``legacyReceipt``/``legacyCave`` structs, which it still
    reads when scanning install locations. There is no game title or url in
    that format, only ids.
    """

    game_id: int
    cave_id: str | None = None
    upload_id: int | None = None
    build_id: int | None = None
    install_location: str | None = None
    install_folder: str | None = None
    path_scheme: int | None = None
    seconds_run: float | None = None
    installed_at: Any | None = None
    last_touched: float | None = None


@dataclass
class Receipt:
    """itch's record of what it installed into a folder.

    Mirrors ``bfs.Receipt`` in ``github.com/itchio/hush``.
    """

    game: Game
    upload: Upload | None = None
    build: Build | None = None
    files: list[str] = field(default_factory=list)
    installer_name: str | None = None
    #: Set when the receipt came from the pre-v23 format.
    legacy: LegacyReceiptInfo | None = None


def get_receipt_path(install_path: Path | str) -> Path:
    """The current receipt path: ``<install_path>/.itch/receipt.json.gz``."""
    return Path(install_path) / RECEIPT_DIR / "receipt.json.gz"


def get_legacy_receipt_path(install_path: Path | str) -> Path:
    """The pre-v23 receipt path: ``<install_path>/.itch/receipt.json``."""
    return Path(install_path) / RECEIPT_DIR / "receipt.json"


def _receipt_from_modern(data: dict[str, Any]) -> Receipt | None:
    game = Game.from_dict(data.get("game"))
    if game is None or not isinstance(data.get("game", {}).get("id"), int):
        return None
    return Receipt(
        game=game,
        upload=Upload.from_dict(data.get("upload")),
        build=Build.from_dict(data.get("build")),
        files=list(data.get("files") or []),
        installer_name=data.get("installerName"),
    )


def _read_modern(receipt_path: Path) -> Receipt | None:
    try:
        raw = receipt_path.read_bytes()
    except OSError:
        return None
    try:
        # butler always gzips, but decide from the magic bytes rather than the
        # extension so a hand-edited receipt still reads.
        text = gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw
        data = json.loads(text)
    except (OSError, ValueError):
        return None
    return _receipt_from_modern(data) if isinstance(data, dict) else None


def _read_legacy(receipt_path: Path) -> Receipt | None:
    try:
        data = json.loads(receipt_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None

    # Some builds wrote the modern shape uncompressed to this path.
    modern = _receipt_from_modern(data)
    if modern is not None:
        return modern

    cave = data.get("cave")
    if not isinstance(cave, dict) or not isinstance(cave.get("gameId"), int):
        return None

    build_id = cave.get("buildId") or None
    return Receipt(
        game=Game(id=cave["gameId"]),
        upload=Upload(id=cave["uploadId"]) if isinstance(cave.get("uploadId"), int) else None,
        build=Build(id=build_id) if build_id else None,
        files=list(data.get("files") or []),
        legacy=LegacyReceiptInfo(
            game_id=cave["gameId"],
            cave_id=cave.get("id"),
            upload_id=cave.get("uploadId"),
            build_id=build_id,
            install_location=cave.get("installLocation"),
            install_folder=cave.get("installFolder"),
            path_scheme=cave.get("pathScheme"),
            seconds_run=cave.get("secondsRun"),
            installed_at=cave.get("installedAt"),
            last_touched=cave.get("lastTouched"),
        ),
    )


def read_receipt(install_path: Path | str) -> Receipt | None:
    """Reads the receipt itch left inside an install folder.

    Falls back to the pre-v23 ``receipt.json`` format, normalized into the same
    shape with its ids under :attr:`Receipt.legacy`. Returns ``None`` if the
    folder has no readable receipt.
    """
    modern = _read_modern(get_receipt_path(install_path))
    if modern is not None:
        return modern
    return _read_legacy(get_legacy_receipt_path(install_path))


def has_receipt(install_path: Path | str) -> bool:
    """Whether an install folder carries an itch receipt."""
    return read_receipt(install_path) is not None


@dataclass
class FoundReceipt:
    """A receipt found by scanning an install location, and where it was."""

    path: Path
    install_folder_name: str
    receipt: Receipt


def find_receipts(library_path: Path | str) -> list[FoundReceipt]:
    """Scans the immediate subdirectories of an install location for receipts.

    Follows the same rules as butler's own install-location scan: skip the
    ``downloads`` staging folder, require a ``.itch`` directory, then read the
    receipt.
    """
    library = Path(library_path)
    if not library.is_dir():
        return []

    found: list[FoundReceipt] = []
    for name in read_subdirectories(library):
        if name == _STAGING_FOLDER:
            continue
        install_path = library / name
        if not (install_path / RECEIPT_DIR).is_dir():
            continue
        receipt = read_receipt(install_path)
        if receipt is not None:
            found.append(FoundReceipt(path=install_path, install_folder_name=name, receipt=receipt))
    return found
