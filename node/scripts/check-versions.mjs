/**
 * Fails unless every manifest in the repository agrees about the version.
 *
 * The three registries read three different files, and the two language
 * packages are released in lockstep, so nothing else stops them drifting apart
 * and publishing mismatched versions of the same release.
 */
import { readFileSync } from "node:fs";

const MANIFESTS = [
  {
    path: "package.json",
    read: (text) => JSON.parse(text).version,
  },
  {
    path: "jsr.json",
    read: (text) => JSON.parse(text).version,
  },
  {
    path: "../python/src/find_itch_games/__init__.py",
    // Single-sourced for the Python package too: hatchling reads __version__
    // from here, so there is no separate manifest to keep in step.
    read: (text) => text.match(/^__version__ = "([^"]+)"$/m)?.[1],
  },
];

const found = MANIFESTS.map(({ path, read }) => {
  let version;
  try {
    version = read(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`version check: could not read ${path}: ${error.message}`);
    process.exit(1);
  }
  if (!version) {
    console.error(`version check: no version found in ${path}`);
    process.exit(1);
  }
  return { path, version };
});

const versions = new Set(found.map((entry) => entry.version));
if (versions.size > 1) {
  console.error("version mismatch across manifests:");
  for (const { path, version } of found) console.error(`  ${version}  ${path}`);
  console.error("\nRun `npm run version:sync` to copy package.json's version into the others.");
  process.exit(1);
}

console.log(`version ${found[0].version} is consistent across ${found.length} manifests`);
