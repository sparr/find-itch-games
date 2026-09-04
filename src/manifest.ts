/**
 * The flattened per-game record.
 *
 * itch describes an installed game twice -- as a cave row in butler.db and as
 * a receipt in the install folder. This module merges the two into a single
 * {@link IItchAppManifest}, the itch counterpart of a Steam
 * `appmanifest_*.acf`.
 *
 * @module
 */
import * as path from "node:path";

import type { IItchCaveRow } from "./db.js";
import type { IFoundReceipt, IItchReceipt } from "./receipt.js";
import { getLegacyReceiptPath, getReceiptPath } from "./receipt.js";
import type {
  IItchBuild,
  IItchGame,
  IItchLaunchCandidate,
  IItchPlatforms,
  IItchUpload,
  IItchVerdict,
} from "./types.js";
import { authorFromGameUrl, slugFromGameUrl } from "./utils.js";

/** Which of itch's two records an app was assembled from. */
export type IItchManifestSource = "db" | "receipt" | "db+receipt";

/**
 * Everything itch knows about one installed game, flattened.
 *
 * This is the itch counterpart of a Steam `appmanifest_*.acf`: it is stitched
 * together from the game's "cave" row in butler.db and the receipt itch wrote
 * into the install folder.
 */
export interface IItchAppManifest {
  /** itch.io game id -- the closest thing to a Steam appid. */
  gameId: number;
  /** itch's own id for this installation. Absent for receipt-only finds. */
  caveId?: string;
  title?: string;
  /** e.g. `https://hempuli.itch.io/a-solitaire-mystery`. */
  url?: string;
  /** `a-solitaire-mystery` in the url above. */
  slug?: string;
  /** `hempuli` in the url above. */
  author?: string;
  /** `game`, `tool`, `assets`, `game_mod`, ... */
  classification?: string;
  /** Absolute path to the installed game. */
  path: string;
  /** Name of the install folder itself. */
  installFolderName: string;
  /** Id of the install location holding it, if it is in a known one. */
  installLocationId?: string;
  /** Set when the game was installed outside any install location. */
  customInstallFolder?: string;
  /** Path of the on-disk receipt, when there is one. */
  receiptPath?: string;
  uploadId?: number;
  buildId?: number;
  /** The developer's own version string, for butler-pushed uploads. */
  version?: string;
  /** butler channel, e.g. `native-console-linux-64`. */
  channelName?: string;
  installedAt?: string;
  lastPlayedAt?: string;
  secondsRun?: number;
  /** Size on disk in bytes, as itch last measured it. */
  installedSize?: number;
  pinned?: boolean;
  platforms?: IItchPlatforms;
  /** Launchables butler found, with paths relative to {@link path}. */
  candidates: IItchLaunchCandidate[];
  game?: IItchGame;
  upload?: IItchUpload;
  build?: IItchBuild;
  source: IItchManifestSource;
}

/**
 * Absolute paths of the launch candidates butler found, best first.
 *
 * @param manifest - The game to resolve candidates for.
 */
export function getLaunchCandidatePaths(manifest: IItchAppManifest): string[] {
  return manifest.candidates.map((candidate) => path.join(manifest.path, candidate.path));
}

/**
 * Names a manifest answers to in {@link findItchAppByName}.
 *
 * @param manifest - The game to list names for.
 */
export function getManifestNames(manifest: IItchAppManifest): string[] {
  return [manifest.title, manifest.slug, manifest.installFolderName].filter(
    (name): name is string => typeof name === "string" && name !== "",
  );
}

/** The pre-v23 format lives at a different path, so report the real one. */
function receiptPathFor(installPath: string, receipt: IItchReceipt): string {
  return receipt.legacy ? getLegacyReceiptPath(installPath) : getReceiptPath(installPath);
}

function candidatesOf(verdict: IItchVerdict | undefined): IItchLaunchCandidate[] {
  return verdict?.candidates ?? [];
}

export interface IBuildFromCaveInput {
  cave: IItchCaveRow;
  /** Absolute install path, already resolved against the install locations. */
  installPath: string;
  receipt?: IItchReceipt | null;
}

/** Builds a manifest from a butler.db cave, filling gaps from the receipt. */
export function manifestFromCave({
  cave,
  installPath,
  receipt,
}: IBuildFromCaveInput): IItchAppManifest {
  const game = cave.game ?? receipt?.game;
  const upload = cave.upload ?? receipt?.upload;
  const build = cave.build ?? receipt?.build ?? upload?.build;
  const url = game?.url;

  return prune({
    gameId: cave.gameId,
    caveId: cave.id,
    title: game?.title,
    url,
    slug: slugFromGameUrl(url),
    author: authorFromGameUrl(url) ?? game?.user?.username,
    classification: game?.classification,
    path: installPath,
    installFolderName: cave.installFolderName ?? path.basename(installPath),
    installLocationId: cave.installLocationId,
    customInstallFolder: cave.customInstallFolder,
    receiptPath: receipt ? receiptPathFor(installPath, receipt) : undefined,
    uploadId: cave.uploadId ?? upload?.id,
    buildId: cave.buildId ?? build?.id,
    version: build?.userVersion,
    channelName: upload?.channelName,
    installedAt: cave.installedAt,
    lastPlayedAt: cave.lastPlayedAt,
    secondsRun: cave.secondsRun,
    installedSize: cave.installedSize ?? cave.verdict?.totalSize,
    pinned: cave.pinned,
    platforms: game?.platforms,
    candidates: candidatesOf(cave.verdict),
    game,
    upload,
    build,
    source: receipt ? "db+receipt" : "db",
  });
}

/**
 * Builds a manifest from an on-disk receipt alone.
 *
 * Used for games butler.db has no cave for: itch reinstalled from scratch, the
 * database was reset, or the folder was copied in from another machine.
 */
export function manifestFromReceipt(
  found: IFoundReceipt,
  installLocationId?: string,
): IItchAppManifest {
  const { receipt } = found;
  const url = receipt.game?.url;
  const build = receipt.build ?? receipt.upload?.build;

  return prune({
    gameId: receipt.game.id,
    title: receipt.game?.title,
    url,
    slug: slugFromGameUrl(url),
    author: authorFromGameUrl(url) ?? receipt.game?.user?.username,
    classification: receipt.game?.classification,
    path: found.path,
    installFolderName: found.installFolderName,
    installLocationId,
    receiptPath: receiptPathFor(found.path, receipt),
    uploadId: receipt.upload?.id,
    buildId: build?.id,
    version: build?.userVersion,
    channelName: receipt.upload?.channelName,
    platforms: receipt.game?.platforms,
    candidates: [],
    game: receipt.game,
    upload: receipt.upload,
    build,
    source: "receipt",
  });
}

function prune(manifest: IItchAppManifest): IItchAppManifest {
  for (const key of Object.keys(manifest) as (keyof IItchAppManifest)[]) {
    if (manifest[key] === undefined) delete manifest[key];
  }
  return manifest;
}
