/**
 * Locating the itch app itself.
 *
 * itch is an Electron app, so its user data lives wherever
 * `app.getPath("userData")` resolves to on each platform, under the name of
 * the variant that was installed (`itch` stable or `kitch` canary). Everything
 * else this library reads is addressed relative to that directory.
 *
 * @module
 */
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";

import { ItchNotFoundError } from "./errors.js";
import { isDirectory, isFile } from "./utils.js";

/**
 * The app names itch ships under.
 *
 * The codebase builds two variants that install side by side: `itch` (stable)
 * and `kitch` (canary), selected by whether the release tag ends in `-canary`.
 * Each gets its own Electron `userData` directory.
 */
export const ITCH_APP_NAMES: readonly string[] = Object.freeze(["itch", "kitch"]);

/**
 * Where to look for itch, when not the current user on the current machine.
 *
 * Every field defaults to the ambient value, so passing nothing searches for
 * the running user's own installation. Supplying them lets a caller ask where
 * itch *would* be for another home directory, environment or operating system
 * -- useful for tools that scan several user profiles or inspect a mounted
 * disk, and the reason this library's own tests never have to mutate
 * `process.env`.
 */
export interface IItchPathLookup {
  /**
   * Home directory to resolve `~`-relative candidates against.
   *
   * @defaultValue `os.homedir()`
   */
  home?: string;
  /**
   * Environment to read `APPDATA`, `XDG_CONFIG_HOME` and this library's own
   * overrides from.
   *
   * @defaultValue `process.env`
   */
  env?: Record<string, string | undefined>;
  /**
   * Operating system whose conventions to follow.
   *
   * @defaultValue `process.platform`
   */
  platform?: NodeJS.Platform;
}

/**
 * Directories the itch app may keep its user data in, most specific first.
 *
 * This mirrors Electron's `app.getPath("userData")` for each app variant, so
 * it follows the same platform conventions.
 *
 * `ITCH_USER_DATA_DIR` and `ITCH_APP_DIR` are this library's own escape hatch
 * for unusual installs -- the itch app itself does not read them.
 *
 * @param lookup - See {@link IItchPathLookup}. Defaults to the current user.
 */
export function getItchPathCandidates(lookup: IItchPathLookup = {}): string[] {
  const home = lookup.home ?? homedir();
  const env = lookup.env ?? process.env;
  const platform = lookup.platform ?? process.platform;
  const candidates: string[] = [];

  const push = (...parts: (string | undefined)[]) => {
    if (parts.every((part) => part)) candidates.push(path.join(...(parts as string[])));
  };

  push(env["ITCH_USER_DATA_DIR"]);
  push(env["ITCH_APP_DIR"]);

  for (const appName of ITCH_APP_NAMES) {
    switch (platform) {
      case "win32":
        // Electron's `appData` on Windows is %APPDATA% (Roaming).
        push(env["APPDATA"], appName);
        push(home, "AppData", "Roaming", appName);
        push(env["LOCALAPPDATA"], appName);
        break;
      case "darwin":
        push(home, "Library", "Application Support", appName);
        break;
      default:
        push(env["XDG_CONFIG_HOME"], appName);
        push(home, ".config", appName);
        // Flatpak redirects XDG_CONFIG_HOME inside the sandbox only; from
        // outside it, the app's config lives here.
        push(home, ".var", "app", `io.${appName}.${appName}`, "config", appName);
        break;
    }
  }

  return [...new Set(candidates)];
}

/**
 * The default butler database inside an itch user-data directory.
 *
 * Builds pointed at a non-standard itch.io host name the database after that
 * host instead; {@link resolveDatabasePath} handles those.
 *
 * @param itchPath - An itch user-data directory.
 */
export function getDatabasePath(itchPath: string): string {
  return path.join(itchPath, "db", "butler.db");
}

/**
 * Locates the butler database, allowing for the `butler-<host>.db` name that
 * builds configured against a non-standard itch.io host use.
 *
 * @param itchPath - An itch user-data directory.
 * @returns The database path. Falls back to the default name when there is
 *   none on disk, so callers always have a path to report.
 */
export async function resolveDatabasePath(itchPath: string): Promise<string> {
  const defaultPath = getDatabasePath(itchPath);
  if (await isFile(defaultPath)) return defaultPath;

  let entries: string[];
  try {
    entries = await fs.readdir(path.join(itchPath, "db"));
  } catch {
    return defaultPath;
  }

  const alternate = entries
    .filter((entry) => /^butler.*\.db$/.test(entry))
    .sort()[0];

  return alternate === undefined ? defaultPath : path.join(itchPath, "db", alternate);
}

/**
 * The itch app's preferences file inside an itch user-data directory.
 *
 * @param itchPath - An itch user-data directory.
 */
export function getPreferencesPath(itchPath: string): string {
  return path.join(itchPath, "preferences.json");
}

/**
 * The built-in `appdata` install location, which itch derives from its own
 * user-data directory rather than storing as a path.
 *
 * @param itchPath - An itch user-data directory.
 */
export function getAppdataInstallLocation(itchPath: string): string {
  return path.join(itchPath, "apps");
}

async function looksLikeItchPath(candidate: string): Promise<boolean> {
  if (!(await isDirectory(candidate))) return false;
  return (
    (await isFile(getDatabasePath(candidate))) ||
    (await isFile(getPreferencesPath(candidate))) ||
    (await isDirectory(getAppdataInstallLocation(candidate)))
  );
}

/**
 * Searches for the itch app's user-data directory.
 *
 * @param lookup - See {@link IItchPathLookup}. Defaults to the current user.
 * @returns Location of itch. `undefined` if itch wasn't found.
 */
export async function findItchPath(lookup: IItchPathLookup = {}): Promise<string | undefined> {
  for (const candidate of getItchPathCandidates(lookup)) {
    if (await looksLikeItchPath(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Like {@link findItchPath}, but throws {@link ItchNotFoundError} instead.
 *
 * @param itchPath - Use this directory instead of searching, if given.
 * @param lookup - See {@link IItchPathLookup}. Ignored when `itchPath` is set.
 */
export async function requireItchPath(
  itchPath?: string,
  lookup: IItchPathLookup = {},
): Promise<string> {
  if (itchPath !== undefined) {
    if (!(await isDirectory(itchPath))) throw new ItchNotFoundError([itchPath]);
    return itchPath;
  }

  const found = await findItchPath(lookup);
  if (found === undefined) throw new ItchNotFoundError(getItchPathCandidates(lookup));
  return found;
}
