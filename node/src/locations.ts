/**
 * Discovering itch's install locations.
 *
 * An install location is a directory itch installs games into. They are
 * user-created and stored in butler.db, apart from the built-in `appdata`
 * location, which itch derives from its own user-data directory. Older itch
 * versions kept them in `preferences.json` instead.
 *
 * @module
 */
import * as path from "node:path";

import { openButlerDatabase, readInstallLocations } from "./db.js";
import { getAppdataInstallLocation, resolveDatabasePath } from "./itch.js";
import { getPreferenceInstallLocations, readPreferences } from "./preferences.js";
import { isDirectory, isFile } from "./utils.js";

/** Where an install location's record came from. */
export type IItchLocationSource = "db" | "preferences" | "appdata" | "option";

/** An install location, before its contents are looked at. */
export interface IItchLibraryRaw {
  /** itch's own id: a uuid, or the built-in `appdata`. */
  id: string;
  path: string;
  /** True for the location itch installs into by default. */
  isDefault: boolean;
  /** Whether the directory currently exists on disk. */
  exists: boolean;
  source: IItchLocationSource;
}

/**
 * itch's install locations, with the state of the records they came from.
 *
 * "Raw" because the locations have not been scanned for games yet -- see
 * {@link IItchLibraries} for that.
 */
export interface IItchLibrariesRaw {
  itchPath: string;
  databasePath: string;
  /** Whether butler.db was present and readable. */
  databaseAvailable: boolean;
  libraries: IItchLibraryRaw[];
}

/**
 * The staging directory itch downloads into inside an install location.
 *
 * @param libraryPath - An install location's path.
 */
export function getLibraryDownloadsFolder(libraryPath: string): string {
  return path.join(libraryPath, "downloads");
}

/**
 * Where an in-progress download is staged, matching butler's
 * `InstallLocation.GetStagingFolder`.
 *
 * @param libraryPath - An install location's path.
 * @param downloadId - itch's id for the in-progress download.
 */
export function getStagingFolder(libraryPath: string, downloadId: string): string {
  return path.join(libraryPath, "downloads", downloadId);
}

/**
 * Where a game with the given install folder name lives inside a location.
 *
 * itch installs games directly into the location -- there is no equivalent of
 * Steam's `steamapps/common` nesting -- so this is a plain join.
 *
 * @param libraryPath - An install location's path.
 * @param installFolderName - The game's install folder name.
 */
export function getInstallFolderPath(libraryPath: string, installFolderName: string): string {
  return path.join(libraryPath, installFolderName);
}

export interface ILoadLibrariesOptions {
  /** Extra install locations to consider, e.g. a drive itch was moved off. */
  extraLibraries?: readonly string[];
  /** Skip butler.db and rely on `preferences.json` plus the derived defaults. */
  skipDatabase?: boolean;
}

/**
 * Collects install locations from every place itch records them.
 *
 * butler.db is authoritative when it is readable. `preferences.json` covers
 * itch versions that predate the database, and the built-in `appdata` location
 * is derived from the itch directory itself because itch never stores it as a
 * path.
 *
 * @param itchPath - An itch user-data directory.
 * @param options - Extra locations to consider, and whether to skip the database.
 */
export async function loadItchLibraries(
  itchPath: string,
  options: ILoadLibrariesOptions = {},
): Promise<IItchLibrariesRaw> {
  const databasePath = await resolveDatabasePath(itchPath);
  const preferences = await readPreferences(itchPath);
  const defaultId = preferences?.defaultInstallLocation;

  const byPath = new Map<string, { id: string; path: string; source: IItchLocationSource }>();
  const add = (id: string, locationPath: string, source: IItchLocationSource) => {
    const resolved = path.resolve(locationPath);
    // First source wins, and they are added most-authoritative first.
    if (!byPath.has(resolved)) byPath.set(resolved, { id, path: resolved, source });
  };

  let databaseAvailable = false;
  if (!options.skipDatabase && (await isFile(databasePath))) {
    let db;
    try {
      db = openButlerDatabase(databasePath);
      for (const location of readInstallLocations(db)) add(location.id, location.path, "db");
      databaseAvailable = true;
    } catch {
      // Fall through to the other sources: an unreadable database should
      // degrade to a worse answer, not to no answer.
    } finally {
      db?.close();
    }
  }

  for (const location of getPreferenceInstallLocations(preferences)) {
    add(location.id, location.path, "preferences");
  }

  add("appdata", getAppdataInstallLocation(itchPath), "appdata");

  for (const extra of options.extraLibraries ?? []) {
    add(`option:${path.resolve(extra)}`, extra, "option");
  }

  const libraries = await Promise.all(
    [...byPath.values()].map(async (location): Promise<IItchLibraryRaw> => ({
      id: location.id,
      path: location.path,
      isDefault: defaultId !== undefined && location.id === defaultId,
      exists: await isDirectory(location.path),
      source: location.source,
    })),
  );

  return { itchPath, databasePath, databaseAvailable, libraries };
}
