/**
 * Read-only access to itch's butler database.
 *
 * `butler.db` is a SQLite database written by butler, itch's install/launch
 * backend. This module opens it through Node's built-in `node:sqlite` and
 * flattens the rows this library cares about: install locations, and the
 * "caves" that record each installed game.
 *
 * @module
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ItchDatabaseError } from "./errors.js";
import type {
  IItchBuild,
  IItchGame,
  IItchPlatforms,
  IItchUpload,
  IItchVerdict,
} from "./types.js";
import { parseJson } from "./utils.js";

/** An install location as butler.db records it. */
export interface IItchInstallLocationRow {
  /** `appdata` for the built-in location, otherwise a uuid. */
  id: string;
  /** Absolute path of the directory games are installed into. */
  path: string;
}

/** A "cave" is itch's record of one installed game. */
export interface IItchCaveRow {
  /** uuid identifying this installation. */
  id: string;
  /** itch.io game id. */
  gameId: number;
  /** The upload that was installed. */
  uploadId?: number;
  /** The wharf build that was installed; only for `storage: "build"` uploads. */
  buildId?: number;
  /** Install location holding the game; unset when `customInstallFolder` is. */
  installLocationId?: string;
  /** Folder name within the install location. */
  installFolderName?: string;
  /** Absolute path used instead of an install location, if the user chose one. */
  customInstallFolder?: string;
  /** When the game was last installed or updated. */
  installedAt?: string;
  /** Last run, reconciled with itch.io's cross-device play summary. */
  lastTouchedAt?: string;
  /** Last run on this machine, which itch tracks separately. */
  lastPlayedAt?: string;
  /** Total play time in seconds, as itch.io reports it across devices. */
  secondsRun?: number;
  /** Size on disk in bytes, as itch last measured it. */
  installedSize?: number;
  /** Whether the user pinned this install in the itch app. */
  pinned?: boolean;
  /** Butler's scan of the install folder: launch candidates and total size. */
  verdict?: IItchVerdict;
  /** The joined `games` row, when itch still has one. */
  game?: IItchGame;
  /** The joined `uploads` row. */
  upload?: IItchUpload;
  /** The joined `builds` row. */
  build?: IItchBuild;
}

/** One row as `node:sqlite` hands it back, before any coercion. */
type Row = Record<string, unknown>;

/** Reads a column as a string, treating both `NULL` and `''` as absent. */
const str = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

/** Reads a column as a number, narrowing the bigints large integers arrive as. */
const num = (value: unknown): number | undefined => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return undefined;
};

/** Reads a column as a boolean; SQLite has no boolean type, so these are 0/1. */
const bool = (value: unknown): boolean | undefined => {
  const n = num(value);
  return n === undefined ? undefined : n !== 0;
};

/** Rebuilds a `platforms` object from the three columns hades flattens it into. */
const platforms = (windows: unknown, linux: unknown, osx: unknown): IItchPlatforms | undefined => {
  const result: IItchPlatforms = {};
  if (str(windows)) result.windows = str(windows);
  if (str(linux)) result.linux = str(linux);
  if (str(osx)) result.osx = str(osx);
  return Object.keys(result).length > 0 ? result : undefined;
};

/** Drops `undefined` entries so the shapes match the on-disk receipts. */
function compact<T extends object>(value: T): T {
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] === undefined) delete value[key];
  }
  return value;
}

/**
 * Opens butler.db read-only.
 *
 * The itch app keeps the database open in WAL mode while it runs; concurrent
 * readers are fine, but if the file itself can't be opened (a read-only mount,
 * a permissions mismatch, a stale `-shm`) we retry against a private copy of
 * the database and its journal, which is still consistent.
 *
 * @param databasePath - Path to a butler.db.
 */
export function openButlerDatabase(databasePath: string): DatabaseSync {
  try {
    return new DatabaseSync(databasePath, { readOnly: true });
  } catch (directError) {
    try {
      return openDatabaseCopy(databasePath);
    } catch {
      throw new ItchDatabaseError(databasePath, directError);
    }
  }
}

function openDatabaseCopy(databasePath: string): DatabaseSync {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "find-itch-games-"));
  const copyPath = path.join(tempDir, path.basename(databasePath));

  // The `-wal` holds everything itch has written since the last checkpoint, so
  // copying the main file alone would return stale rows. The `-shm` is only an
  // index into the `-wal` and is rebuilt if absent, but copy it when we can.
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.copyFileSync(databasePath + suffix, copyPath + suffix);
    } catch (error) {
      if (suffix === "") throw error;
    }
  }

  const db = new DatabaseSync(copyPath, { readOnly: true });
  const close = db.close.bind(db);
  db.close = () => {
    try {
      close();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };
  return db;
}

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return row !== undefined;
}

/**
 * Reads the install locations itch will place games into.
 *
 * @param db - An open butler database.
 */
export function readInstallLocations(db: DatabaseSync): IItchInstallLocationRow[] {
  if (!tableExists(db, "install_locations")) return [];

  const rows = db.prepare("SELECT id, path FROM install_locations").all() as Row[];
  const locations: IItchInstallLocationRow[] = [];
  for (const row of rows) {
    const id = str(row["id"]);
    const locationPath = str(row["path"]);
    if (id !== undefined && locationPath !== undefined) {
      locations.push({ id, path: locationPath });
    }
  }
  return locations;
}

const CAVES_QUERY = `
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
`;

/**
 * Reads every installed game itch knows about.
 *
 * @param db - An open butler database.
 */
export function readCaves(db: DatabaseSync): IItchCaveRow[] {
  const rows = db.prepare(CAVES_QUERY).all() as Row[];
  const caves: IItchCaveRow[] = [];

  for (const row of rows) {
    const id = str(row["cave_id"]);
    const gameId = num(row["game_id"]);
    if (id === undefined || gameId === undefined) continue;

    const cave: IItchCaveRow = compact({
      id,
      gameId,
      uploadId: num(row["upload_id"]) || undefined,
      buildId: num(row["build_id"]) || undefined,
      installLocationId: str(row["install_location_id"]),
      installFolderName: str(row["install_folder_name"]),
      customInstallFolder: str(row["custom_install_folder"]),
      installedAt: str(row["installed_at"]),
      lastTouchedAt: str(row["last_touched_at"]),
      lastPlayedAt: str(row["local_last_run_at"]),
      secondsRun: num(row["seconds_run"]),
      installedSize: num(row["installed_size"]),
      pinned: bool(row["pinned"]),
      verdict: parseJson<IItchVerdict>(str(row["verdict"]) ?? "") ?? undefined,
      game: buildGame(gameId, row),
      upload: buildUpload(row),
      build: buildBuild(row),
    });

    caves.push(cave);
  }

  return caves;
}

function buildGame(gameId: number, row: Row): IItchGame {
  const userId = num(row["game_user_id"]);
  const user = str(row["user_username"])
    ? compact({
        id: userId,
        username: str(row["user_username"]),
        displayName: str(row["user_display_name"]),
        url: str(row["user_url"]),
        coverUrl: str(row["user_cover_url"]),
        stillCoverUrl: str(row["user_still_cover_url"]),
      })
    : undefined;

  return compact({
    id: gameId,
    url: str(row["game_url"]),
    title: str(row["game_title"]),
    shortText: str(row["game_short_text"]),
    type: str(row["game_type"]),
    classification: str(row["game_classification"]),
    coverUrl: str(row["game_cover_url"]),
    stillCoverUrl: str(row["game_still_cover_url"]),
    createdAt: str(row["game_created_at"]),
    publishedAt: str(row["game_published_at"]),
    minPrice: num(row["game_min_price"]),
    canBeBought: bool(row["game_can_be_bought"]),
    hasDemo: bool(row["game_has_demo"]),
    inPressSystem: bool(row["game_in_press_system"]),
    platforms: platforms(row["game_windows"], row["game_linux"], row["game_osx"]),
    user,
    userId,
  });
}

function buildUpload(row: Row): IItchUpload | undefined {
  const id = num(row["upload_id"]);
  if (id === undefined || id === 0) return undefined;

  return compact({
    id,
    storage: str(row["upload_storage"]),
    host: str(row["upload_host"]),
    filename: str(row["upload_filename"]),
    displayName: str(row["upload_display_name"]),
    size: num(row["upload_size"]),
    channelName: str(row["upload_channel_name"]),
    buildId: num(row["build_id"]) || undefined,
    type: str(row["upload_type"]),
    preorder: bool(row["upload_preorder"]),
    demo: bool(row["upload_demo"]),
    platforms: platforms(row["upload_windows"], row["upload_linux"], row["upload_osx"]),
    createdAt: str(row["upload_created_at"]),
    updatedAt: str(row["upload_updated_at"]),
  });
}

function buildBuild(row: Row): IItchBuild | undefined {
  const id = num(row["build_id"]);
  if (id === undefined || id === 0) return undefined;

  return compact({
    id,
    parentBuildId: num(row["build_parent_build_id"]) || undefined,
    state: str(row["build_state"]),
    version: num(row["build_version"]),
    userVersion: str(row["build_user_version"]),
    uploadId: num(row["upload_id"]) || undefined,
    gameId: num(row["game_id"]),
    userId: num(row["build_user_id"]),
    createdAt: str(row["build_created_at"]),
    updatedAt: str(row["build_updated_at"]),
  });
}
