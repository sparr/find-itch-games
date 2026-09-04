/**
 * Reading the receipts itch leaves in install folders.
 *
 * Every folder itch installs a game into gets a `.itch/receipt.json.gz`
 * describing what was put there. It is the on-disk source of truth: it
 * survives a database reset, and its presence is what distinguishes an itch
 * game folder from any other directory.
 *
 * @module
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

import type { IItchBuild, IItchGame, IItchUpload } from "./types.js";
import { isDirectory, parseJson, readSubdirectories } from "./utils.js";

const gunzipAsync = promisify(gunzip);

/**
 * itch writes one of these into every folder it installs a game into.
 *
 * Mirrors `bfs.Receipt` in `github.com/itchio/hush`.
 */
export interface IItchReceipt {
  /** The itch.io game installed at this location. */
  game: IItchGame;
  /** The itch.io upload installed at this location. */
  upload?: IItchUpload;
  /** The itch.io build installed here. Absent for non-wharf uploads. */
  build?: IItchBuild;
  /** Installed files, as slash-separated paths relative to the folder. */
  files?: string[];
  /** The installer used, e.g. `archive`, `msi`, `inno`. */
  installerName?: string;
  /**
   * Set when the receipt came from the pre-v23 `.itch/receipt.json` format,
   * which recorded ids but no game metadata.
   */
  legacy?: IItchLegacyReceiptInfo;
}

/**
 * What the pre-v23 uncompressed `.itch/receipt.json` recorded.
 *
 * Mirrors butler's `legacyReceipt`/`legacyCave` structs, which it still reads
 * when scanning install locations. There is no game title or url in this
 * format, only ids.
 */
export interface IItchLegacyReceiptInfo {
  caveId?: string;
  gameId: number;
  uploadId?: number;
  buildId?: number;
  /** Id of the install location, as the old client recorded it. */
  installLocation?: string;
  installFolder?: string;
  /** `2` is the only scheme butler will import. */
  pathScheme?: number;
  secondsRun?: number;
  /** A unix timestamp or an RFC3339 string, depending on the client version. */
  installedAt?: number | string;
  lastTouched?: number;
}

/** The metadata directory itch keeps inside an install folder. */
export const RECEIPT_DIR = ".itch";

/**
 * The current receipt path: `<installPath>/.itch/receipt.json.gz`.
 *
 * @param installPath - A game's install folder.
 */
export function getReceiptPath(installPath: string): string {
  return path.join(installPath, RECEIPT_DIR, "receipt.json.gz");
}

/**
 * The pre-v23 receipt path: `<installPath>/.itch/receipt.json`.
 *
 * @param installPath - A game's install folder.
 */
export function getLegacyReceiptPath(installPath: string): string {
  return path.join(installPath, RECEIPT_DIR, "receipt.json");
}

/**
 * Where {@link readReceipt} looks, in the order butler looks.
 *
 * @param installPath - A game's install folder.
 */
export function getReceiptPaths(installPath: string): string[] {
  return [getReceiptPath(installPath), getLegacyReceiptPath(installPath)];
}

interface ILegacyReceiptFile {
  cave?: {
    id?: string;
    gameId?: number;
    uploadId?: number;
    buildId?: number;
    installLocation?: string;
    installFolder?: string;
    pathScheme?: number;
    secondsRun?: number;
    installedAt?: number | string;
    lastTouched?: number;
  };
  files?: string[];
}

/**
 * Reads the receipt itch left inside an install folder.
 *
 * Falls back to the pre-v23 `receipt.json` format, which is normalized into
 * the same shape with the ids it carries under `legacy`.
 *
 * @param installPath - A game's install folder.
 * @returns The receipt, or `null` if the folder has none.
 */
export async function readReceipt(installPath: string): Promise<IItchReceipt | null> {
  const modern = await readModernReceipt(getReceiptPath(installPath));
  if (modern !== null) return modern;
  return readLegacyReceipt(getLegacyReceiptPath(installPath));
}

async function readModernReceipt(receiptPath: string): Promise<IItchReceipt | null> {
  let raw: Buffer;
  try {
    raw = await fs.readFile(receiptPath);
  } catch {
    return null;
  }

  // butler always gzips, but decide from the magic bytes rather than the
  // extension so a hand-edited receipt still reads.
  const isGzipped = raw[0] === 0x1f && raw[1] === 0x8b;
  let text: string;
  try {
    text = isGzipped ? (await gunzipAsync(raw)).toString("utf8") : raw.toString("utf8");
  } catch {
    return null;
  }

  const receipt = parseJson<IItchReceipt>(text);
  return typeof receipt?.game?.id === "number" ? receipt : null;
}

async function readLegacyReceipt(receiptPath: string): Promise<IItchReceipt | null> {
  let text: string;
  try {
    text = await fs.readFile(receiptPath, "utf8");
  } catch {
    return null;
  }

  const parsed = parseJson<ILegacyReceiptFile | IItchReceipt>(text);
  if (parsed === null) return null;

  // Some builds wrote the modern shape uncompressed to this path.
  if (typeof (parsed as IItchReceipt).game?.id === "number") return parsed as IItchReceipt;

  const cave = (parsed as ILegacyReceiptFile).cave;
  if (typeof cave?.gameId !== "number") return null;

  return {
    game: { id: cave.gameId },
    ...(typeof cave.uploadId === "number" ? { upload: { id: cave.uploadId } } : {}),
    ...(typeof cave.buildId === "number" && cave.buildId !== 0
      ? { build: { id: cave.buildId } }
      : {}),
    files: (parsed as ILegacyReceiptFile).files ?? [],
    legacy: {
      caveId: cave.id,
      gameId: cave.gameId,
      uploadId: cave.uploadId,
      buildId: cave.buildId || undefined,
      installLocation: cave.installLocation,
      installFolder: cave.installFolder,
      pathScheme: cave.pathScheme,
      secondsRun: cave.secondsRun,
      installedAt: cave.installedAt,
      lastTouched: cave.lastTouched,
    },
  };
}

/**
 * Whether an install folder carries an itch receipt.
 *
 * @param installPath - A game's install folder.
 */
export async function hasReceipt(installPath: string): Promise<boolean> {
  return (await readReceipt(installPath)) !== null;
}

/** A receipt found by scanning an install location, with where it was found. */
export interface IFoundReceipt {
  /** Absolute path to the install folder. */
  path: string;
  /** The folder's own name, which is itch's `installFolderName`. */
  installFolderName: string;
  receipt: IItchReceipt;
}

/**
 * Scans the immediate subdirectories of an install location for receipts.
 *
 * This follows the same rules as butler's own install-location scan: skip the
 * `downloads` staging folder, require a `.itch` directory, then read the
 * receipt. It is the on-disk source of truth -- it finds games butler.db has
 * forgotten, and it ignores unrelated folders, which matters because an
 * install location is often a directory the user keeps other things in.
 *
 * @param libraryPath - An install location's path.
 */
export async function findReceipts(libraryPath: string): Promise<IFoundReceipt[]> {
  if (!(await isDirectory(libraryPath))) return [];

  const names = await readSubdirectories(libraryPath);
  const found = await Promise.all(
    names.map(async (installFolderName): Promise<IFoundReceipt | null> => {
      // itch's own staging area, never a game folder.
      if (installFolderName === "downloads") return null;

      const installPath = path.join(libraryPath, installFolderName);
      if (!(await isDirectory(path.join(installPath, RECEIPT_DIR)))) return null;

      const receipt = await readReceipt(installPath);
      return receipt === null ? null : { path: installPath, installFolderName, receipt };
    }),
  );

  return found.filter((entry): entry is IFoundReceipt => entry !== null);
}
