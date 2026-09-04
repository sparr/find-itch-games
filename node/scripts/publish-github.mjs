/**
 * Publishes to GitHub Packages.
 *
 * The GitHub npm registry only accepts package names scoped to the owning
 * account, so this package cannot be published there under the unscoped name
 * it uses on npmjs.com. Rather than renaming the package for everyone, this
 * script publishes a scoped copy: it rewrites `name` and `publishConfig`, runs
 * `npm publish`, and always restores package.json afterwards.
 *
 * Pass --dry-run to see what would be sent without publishing.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const REGISTRY = "https://npm.pkg.github.com";
const MANIFEST = "package.json";

const original = readFileSync(MANIFEST, "utf8");
const pkg = JSON.parse(original);

const owner = pkg.repository?.url?.match(/github\.com\/([^/]+)\//)?.[1];
if (!owner) {
  console.error("Could not read the GitHub owner from `repository.url` in package.json.");
  process.exit(1);
}

const scoped = `@${owner.toLowerCase()}/${pkg.name.replace(/^@[^/]+\//, "")}`;
console.log(`Publishing ${scoped}@${pkg.version} to ${REGISTRY}`);

try {
  writeFileSync(
    MANIFEST,
    JSON.stringify({ ...pkg, name: scoped, publishConfig: { registry: REGISTRY } }, null, 2) + "\n",
  );
  execFileSync(
    "npm",
    ["publish", "--registry", REGISTRY, ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
} finally {
  // Restore byte-for-byte, including on failure or Ctrl-C, so a botched
  // publish can never leave the scoped name committed.
  writeFileSync(MANIFEST, original);
}
