/**
 * Fails if package.json and jsr.json disagree about the version.
 *
 * The two registries read different manifests, so nothing else stops them
 * drifting apart and publishing mismatched versions of the same release.
 */
import { readFileSync } from "node:fs";

const npmVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const jsrVersion = JSON.parse(readFileSync("jsr.json", "utf8")).version;

if (npmVersion !== jsrVersion) {
  console.error(
    `version mismatch: package.json is ${npmVersion}, jsr.json is ${jsrVersion}.\n` +
      `Run \`npm run version:sync\` to copy package.json's version into jsr.json.`,
  );
  process.exit(1);
}
console.log(`version ${npmVersion} is consistent across package.json and jsr.json`);
