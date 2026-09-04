/**
 * Small filesystem, JSON and name-matching helpers used across the library.
 *
 * @module
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isFile();
  } catch {
    return false;
  }
}

/** Immediate subdirectories of `dir`, or `[]` if it isn't readable. */
export async function readSubdirectories(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      dirs.push(entry.name);
    } else if (entry.isSymbolicLink() && (await isDirectory(path.join(dir, entry.name)))) {
      dirs.push(entry.name);
    }
  }
  return dirs.sort();
}

export function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    return parseJson<T>(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Case-insensitive, punctuation-insensitive comparison key, so that
 * `"Cosmic Collapse"`, `"cosmic-collapse"` and `"cosmic_collapse"` all match.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}

/** The `slug` in `https://author.itch.io/slug`. */
export function slugFromGameUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments[segments.length - 1];
  } catch {
    return undefined;
  }
}

/** The `author` in `https://author.itch.io/slug`. */
export function authorFromGameUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { hostname } = new URL(url);
    const [author] = hostname.split(".");
    return author && hostname.includes(".itch.io") ? author : undefined;
  } catch {
    return undefined;
  }
}
