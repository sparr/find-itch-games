/**
 * Reading itch's `preferences.json`.
 *
 * Only two fields matter here: the deprecated pre-v23 install locations, and
 * the id of the location itch installs into by default.
 *
 * @module
 */
import { getPreferencesPath } from "./itch.js";
import { readJsonFile } from "./utils.js";

/** The subset of `preferences.json` that says where games go. */
export interface IItchPreferences {
  /**
   * Legacy install locations. Newer itch versions migrate these into
   * butler.db and leave this empty, but the id -> path mapping is still the
   * only record of them on installs that never launched a newer itch.
   */
  installLocations?: Record<string, { path?: string } | string>;
  /** Id of the location itch installs into unless told otherwise. */
  defaultInstallLocation?: string;
  [key: string]: unknown;
}

export async function readPreferences(itchPath: string): Promise<IItchPreferences | null> {
  return readJsonFile<IItchPreferences>(getPreferencesPath(itchPath));
}

/** Flattens `installLocations` into id/path pairs, tolerating both shapes. */
export function getPreferenceInstallLocations(
  preferences: IItchPreferences | null,
): { id: string; path: string }[] {
  const locations: { id: string; path: string }[] = [];
  for (const [id, value] of Object.entries(preferences?.installLocations ?? {})) {
    const locationPath = typeof value === "string" ? value : value?.path;
    if (locationPath) locations.push({ id, path: locationPath });
  }
  return locations;
}
