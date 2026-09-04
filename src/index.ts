/**
 * Find the itch.io app, its install locations, and the games installed in them.
 *
 * The entry point re-exports everything the library considers public. Start
 * with {@link findItch} for the whole picture, or {@link findItchAppById} /
 * {@link findItchAppByName} to locate one game.
 *
 * @packageDocumentation
 */
import * as path from "node:path";

import { openButlerDatabase, readCaves } from "./db.js";
import type { IItchCaveRow, IItchInstallLocationRow } from "./db.js";
import {
  AmbiguousAppError,
  AppNotFoundError,
  ItchDatabaseError,
  ItchNotFoundError,
} from "./errors.js";
import {
  ITCH_APP_NAMES,
  findItchPath,
  getAppdataInstallLocation,
  getDatabasePath,
  getItchPathCandidates,
  getPreferencesPath,
  requireItchPath,
  resolveDatabasePath,
} from "./itch.js";
import {
  getInstallFolderPath,
  getLibraryDownloadsFolder,
  getStagingFolder,
  loadItchLibraries,
} from "./locations.js";
import type { IItchLibrariesRaw, IItchLibraryRaw, IItchLocationSource } from "./locations.js";
import {
  getLaunchCandidatePaths,
  getManifestNames,
  manifestFromCave,
  manifestFromReceipt,
} from "./manifest.js";
import type { IItchAppManifest, IItchManifestSource } from "./manifest.js";
import {
  RECEIPT_DIR,
  findReceipts,
  getLegacyReceiptPath,
  getReceiptPath,
  hasReceipt,
  readReceipt,
} from "./receipt.js";
import type { IFoundReceipt, IItchLegacyReceiptInfo, IItchReceipt } from "./receipt.js";
import { isDirectory, normalizeName } from "./utils.js";

/**
 * Every value {@link IItchStrategy} accepts, in preference order.
 *
 * Exported so callers can offer the choice without hard-coding the list, and
 * so an unknown value can be rejected rather than silently misread.
 *
 * Frozen because it is the guard, not a registry: {@link findItch} dispatches
 * on these values directly, so widening the list would only disable the check
 * and let the new value fall through to `merge` behaviour.
 */
export const ITCH_STRATEGIES = Object.freeze(["merge", "db", "receipts"] as const);

/**
 * Which of itch's records to trust.
 *
 * - `merge` (default) reads butler.db and confirms each game against the
 *   receipt in its install folder, then adds any receipt the database has no
 *   row for. Most complete.
 * - `db` reads butler.db only. Fastest, and the only source of play times,
 *   launch candidates and custom install folders.
 * - `receipts` scans the install locations instead of reading caves. Useful
 *   when the database is out of date, but it loses the fields only the
 *   database has. Install locations still come from the database, since
 *   nothing on disk records them.
 */
export type IItchStrategy = (typeof ITCH_STRATEGIES)[number];

/**
 * Options shared by every lookup in this library.
 *
 * They control where itch is looked for and which of its records are trusted;
 * the defaults suit a normal installation, so most callers pass nothing.
 */
export interface IItchOptions {
  /** Override the itch user-data directory instead of searching for it. */
  itchPath?: string;
  /** @defaultValue "merge" */
  strategy?: IItchStrategy;
  /**
   * Drop games whose install folder is gone. itch leaves caves behind when a
   * folder is deleted outside the app, so this defaults to on.
   *
   * @defaultValue true
   */
  checkExists?: boolean;
  /** Extra install locations to scan, e.g. a drive itch was moved off. */
  extraLibraries?: readonly string[];
  /**
   * Don't touch butler.db at all, not even for install locations. Only
   * `preferences.json`, the built-in `appdata` location and `extraLibraries`
   * are used. Implies `strategy: "receipts"`.
   *
   * @defaultValue false
   */
  ignoreDatabase?: boolean;
}

/** One installed game inside a library. */
export interface IItchApp {
  gameId: number;
  /** Absolute path to the installed game. */
  path: string;
  /** Absolute path to the on-disk receipt, when there is one. */
  receiptPath?: string;
  manifest: IItchAppManifest;
}

/** An install location together with the games in it. */
export interface IItchLibrary extends IItchLibraryRaw {
  apps: IItchApp[];
}

/** The full picture: where itch is, where it installs, and what is installed. */
export interface IItchLibraries {
  itchPath: string;
  databasePath: string;
  databaseAvailable: boolean;
  strategy: IItchStrategy;
  libraries: IItchLibrary[];
}

/**
 * Settles on a strategy, rejecting anything that isn't one.
 *
 * Every strategy is defined by what it is *not* (`!== "db"`, `!== "receipts"`),
 * so a misspelled value would otherwise slip through and behave like `merge`.
 * TypeScript catches that; a plain JavaScript caller has nothing but this.
 */
function resolveStrategy(options: IItchOptions): IItchStrategy {
  const { strategy } = options;

  // Validated before `ignoreDatabase` is honoured, so that option can't mask a
  // typo in a value the caller clearly meant to have an effect.
  if (strategy !== undefined && !ITCH_STRATEGIES.includes(strategy)) {
    throw new TypeError(
      `unknown itch strategy ${JSON.stringify(strategy)}; ` +
        `expected one of ${ITCH_STRATEGIES.map((s) => JSON.stringify(s)).join(", ")}`,
    );
  }

  if (options.ignoreDatabase) return "receipts";
  return strategy ?? "merge";
}

/**
 * Finds itch, its install locations and every game installed in them.
 *
 * @param options - See {@link IItchOptions}.
 * @throws {@link ItchNotFoundError} if the itch user-data directory can't be found.
 * @throws A `TypeError` if `strategy` isn't one of {@link ITCH_STRATEGIES}.
 */
export async function findItch(options: IItchOptions = {}): Promise<IItchLibraries> {
  const strategy = resolveStrategy(options);
  const checkExists = options.checkExists ?? true;
  const itchPath = await requireItchPath(options.itchPath);

  const raw = await loadItchLibraries(itchPath, {
    extraLibraries: options.extraLibraries,
    skipDatabase: options.ignoreDatabase,
  });

  const libraries = new LibrarySet(raw.libraries);

  if (strategy !== "receipts" && raw.databaseAvailable) {
    for (const app of await appsFromDatabase(raw, libraries, strategy, checkExists)) {
      libraries.addApp(app);
    }
  }

  if (strategy !== "db") {
    for (const app of await appsFromReceipts(libraries)) {
      libraries.addApp(app);
    }
  }

  return {
    itchPath: raw.itchPath,
    databasePath: raw.databasePath,
    databaseAvailable: raw.databaseAvailable,
    strategy,
    libraries: libraries.toArray(),
  };
}

/**
 * Groups apps under the install location that contains them, synthesizing an
 * entry for anything installed outside a known one.
 */
class LibrarySet {
  private readonly byPath = new Map<string, IItchLibrary>();
  private readonly seenAppPaths = new Set<string>();

  constructor(libraries: readonly IItchLibraryRaw[]) {
    for (const library of libraries) {
      this.byPath.set(library.path, { ...library, apps: [] });
    }
  }

  public get existing(): IItchLibrary[] {
    return [...this.byPath.values()].filter((library) => library.exists);
  }

  public findByPath(libraryPath: string): IItchLibrary | undefined {
    return this.byPath.get(path.resolve(libraryPath));
  }

  public findById(id: string): IItchLibrary | undefined {
    for (const library of this.byPath.values()) {
      if (library.id === id) return library;
    }
    return undefined;
  }

  public hasApp(appPath: string): boolean {
    return this.seenAppPaths.has(path.resolve(appPath));
  }

  public addApp(app: IItchApp): void {
    const appPath = path.resolve(app.path);
    if (this.seenAppPaths.has(appPath)) return;
    this.seenAppPaths.add(appPath);

    const parent = path.dirname(appPath);
    let library = this.byPath.get(parent);
    if (library === undefined) {
      // A custom install folder, or a location itch has since forgotten.
      library = {
        id: app.manifest.installLocationId ?? `external:${parent}`,
        path: parent,
        isDefault: false,
        exists: true,
        source: "option" as IItchLocationSource,
        apps: [],
      };
      this.byPath.set(parent, library);
    }
    library.apps.push(app);
  }

  public toArray(): IItchLibrary[] {
    for (const library of this.byPath.values()) {
      library.apps.sort((a, b) => a.gameId - b.gameId);
    }
    return [...this.byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  }
}

async function appsFromDatabase(
  raw: IItchLibrariesRaw,
  libraries: LibrarySet,
  strategy: IItchStrategy,
  checkExists: boolean,
): Promise<IItchApp[]> {
  let caves: IItchCaveRow[];
  const db = openButlerDatabase(raw.databasePath);
  try {
    caves = readCaves(db);
  } finally {
    db.close();
  }

  const apps = await Promise.all(
    caves.map(async (cave): Promise<IItchApp | null> => {
      const installPath = resolveCaveInstallPath(cave, libraries);
      if (installPath === null) return null;
      if (checkExists && !(await isDirectory(installPath))) return null;

      const receipt = strategy === "db" ? null : await readReceipt(installPath);
      const manifest = manifestFromCave({ cave, installPath, receipt });
      return { gameId: manifest.gameId, path: manifest.path, receiptPath: manifest.receiptPath, manifest };
    }),
  );

  return apps.filter((app): app is IItchApp => app !== null);
}

/**
 * Works out where a cave's files are.
 *
 * `custom_install_folder` wins, then the install location plus folder name,
 * and finally the base path butler recorded when it last scanned the folder --
 * which is the only hint left if the install location has been removed.
 */
function resolveCaveInstallPath(cave: IItchCaveRow, libraries: LibrarySet): string | null {
  if (cave.customInstallFolder) return path.resolve(cave.customInstallFolder);

  const library = cave.installLocationId ? libraries.findById(cave.installLocationId) : undefined;
  if (library !== undefined && cave.installFolderName) {
    return getInstallFolderPath(library.path, cave.installFolderName);
  }

  if (cave.verdict?.basePath) return path.resolve(cave.verdict.basePath);
  return null;
}

async function appsFromReceipts(libraries: LibrarySet): Promise<IItchApp[]> {
  const perLibrary = await Promise.all(
    libraries.existing.map(async (library) => {
      const found = await findReceipts(library.path);
      return found
        .filter((entry) => !libraries.hasApp(entry.path))
        .map((entry): IItchApp => {
          const manifest = manifestFromReceipt(entry, library.id);
          return {
            gameId: manifest.gameId,
            path: manifest.path,
            receiptPath: manifest.receiptPath,
            manifest,
          };
        });
    }),
  );

  return perLibrary.flat();
}

/**
 * Every installed game, flattened out of {@link findItch}.
 *
 * @param options - See {@link IItchOptions}.
 */
export async function findItchApps(options?: IItchOptions): Promise<IItchApp[]> {
  const { libraries } = await findItch(options);
  return libraries.flatMap((library) => library.apps);
}

/**
 * Just the install location paths, cheapest call in the library.
 *
 * @param options - See {@link IItchOptions}.
 */
export async function findItchLibrariesPaths(options: IItchOptions = {}): Promise<string[]> {
  const raw = await findItchLibraries(options);
  return raw.libraries.map((library) => library.path);
}

/**
 * Install locations with their metadata, but without scanning for games.
 *
 * @param options - See {@link IItchOptions}.
 */
export async function findItchLibraries(options: IItchOptions = {}): Promise<IItchLibrariesRaw> {
  return loadItchLibraries(await requireItchPath(options.itchPath), {
    extraLibraries: options.extraLibraries,
    skipDatabase: options.ignoreDatabase,
  });
}

/**
 * Reads the merged cave/receipt record for a game.
 *
 * @param gameId - The itch.io game id.
 * @param options - See {@link IItchOptions}.
 * @returns The manifest, or `null` if the game isn't installed.
 */
export async function findItchAppManifest(
  gameId: number,
  options?: IItchOptions,
): Promise<IItchAppManifest | null> {
  const apps = await findItchApps(options);
  return apps.find((app) => app.gameId === gameId)?.manifest ?? null;
}

/** Options for looking up a single game. */
export interface IItchLookupOptions extends IItchOptions {
  /**
   * Throw {@link AmbiguousAppError} when more than one installed game matches,
   * instead of returning the first. The same game can legitimately be
   * installed in two locations, and a fuzzy name search can collide, so set
   * this when picking the wrong one would be worse than failing.
   *
   * @defaultValue false
   */
  strict?: boolean;
}

/** Options for looking up a single game by name. */
export interface IItchNameLookupOptions extends IItchLookupOptions {
  /**
   * Require the name to equal the game's title, url slug or install folder
   * name exactly.
   *
   * With `exact: false`, matching instead ignores case, spacing and
   * punctuation, so `"Cosmic Collapse"`, `"cosmic-collapse"` and
   * `"cosmiccollapse"` all resolve to the same game -- at the cost of
   * occasional collisions between similarly named games.
   *
   * @defaultValue true
   */
  exact?: boolean;
}

/** Picks one result, honouring `strict`. */
function pickOne(
  apps: readonly IItchApp[],
  query: string | number,
  strict: boolean | undefined,
): IItchApp {
  const first = apps[0];
  if (first === undefined) throw new AppNotFoundError(query);
  if (strict && apps.length > 1) {
    throw new AmbiguousAppError(query, apps.map((app) => app.path));
  }
  return first;
}

/**
 * Every install of a game, by itch.io game id.
 *
 * Usually zero or one, but itch will happily install the same game into more
 * than one location.
 *
 * @param gameId - The itch.io game id.
 * @param options - See {@link IItchOptions}.
 */
export async function findItchAppsById(
  gameId: number,
  options?: IItchOptions,
): Promise<IItchApp[]> {
  const apps = await findItchApps(options);
  return apps.filter((app) => app.gameId === gameId);
}

/**
 * Finds where a game is installed, by itch.io game id.
 *
 * @param gameId - The itch.io game id.
 * @param options - See {@link IItchLookupOptions}.
 * @returns Absolute path to the install folder.
 * @throws {@link AppNotFoundError} if the game isn't installed.
 * @throws {@link AmbiguousAppError} if `strict` is set and it is installed twice.
 */
export async function findItchAppById(
  gameId: number,
  options: IItchLookupOptions = {},
): Promise<string> {
  return pickOne(await findItchAppsById(gameId, options), gameId, options.strict).path;
}

/**
 * Every installed game matching a title, url slug or install folder name.
 *
 * Exact by default; pass `exact: false` for a fuzzy search. Results keep the
 * order of {@link findItchApps}, so they are stable across calls.
 *
 * @param name - A title, url slug or install folder name.
 * @param options - See {@link IItchNameLookupOptions}.
 */
export async function findItchAppsByName(
  name: string,
  options: IItchNameLookupOptions = {},
): Promise<IItchApp[]> {
  const exact = options.exact ?? true;
  const wanted = exact ? name : normalizeName(name);
  const apps = await findItchApps(options);

  return apps.filter((app) =>
    getManifestNames(app.manifest).some((alias) =>
      exact ? alias === wanted : normalizeName(alias) === wanted,
    ),
  );
}

/**
 * Finds where a game is installed, by title, url slug or install folder name.
 *
 * @param name - A title, url slug or install folder name.
 * @param options - See {@link IItchNameLookupOptions}.
 * @returns Absolute path to the install folder.
 * @throws {@link AppNotFoundError} if no installed game matches.
 * @throws {@link AmbiguousAppError} if `strict` is set and several match.
 */
export async function findItchAppByName(
  name: string,
  options: IItchNameLookupOptions = {},
): Promise<string> {
  return pickOne(await findItchAppsByName(name, options), name, options.strict).path;
}

/**
 * Whether a game is currently installed, by game id or by name.
 *
 * @param game - An itch.io game id, or a title, url slug or install folder name.
 * @param options - See {@link IItchNameLookupOptions}.
 */
export async function hasItchApp(
  game: number | string,
  options?: IItchNameLookupOptions,
): Promise<boolean> {
  const matches =
    typeof game === "number"
      ? await findItchAppsById(game, options)
      : await findItchAppsByName(game, options);
  return matches.length > 0;
}

export {
  AmbiguousAppError,
  AppNotFoundError,
  ITCH_APP_NAMES,
  ItchDatabaseError,
  ItchNotFoundError,
  RECEIPT_DIR,
  findItchPath,
  findReceipts,
  getAppdataInstallLocation,
  getDatabasePath,
  getInstallFolderPath,
  getItchPathCandidates,
  getLaunchCandidatePaths,
  getLegacyReceiptPath,
  getLibraryDownloadsFolder,
  getManifestNames,
  getPreferencesPath,
  getReceiptPath,
  getStagingFolder,
  hasReceipt,
  readReceipt,
  resolveDatabasePath,
};

export type {
  IFoundReceipt,
  IItchAppManifest,
  IItchLegacyReceiptInfo,
  IItchCaveRow,
  IItchInstallLocationRow,
  IItchLibrariesRaw,
  IItchLibraryRaw,
  IItchLocationSource,
  IItchManifestSource,
  IItchReceipt,
};

export type {
  IItchArch,
  IItchArchitectures,
  IItchBuild,
  IItchFlavor,
  IItchGame,
  IItchGameClassification,
  IItchGameType,
  IItchJarInfo,
  IItchLaunchCandidate,
  IItchLinuxInfo,
  IItchLoveInfo,
  IItchMacosInfo,
  IItchPlatforms,
  IItchScriptInfo,
  IItchUpload,
  IItchUploadStorage,
  IItchUploadType,
  IItchUser,
  IItchVerdict,
  IItchWindowsInfo,
  IItchWindowsInstallerType,
} from "./types.js";
