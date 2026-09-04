/** Copies package.json's version into every other manifest. */
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

const jsr = JSON.parse(readFileSync("jsr.json", "utf8"));
writeFileSync("jsr.json", JSON.stringify({ ...jsr, version }, null, 2) + "\n");

const initPath = "../python/src/find_itch_games/__init__.py";
const init = readFileSync(initPath, "utf8");
const updated = init.replace(/^__version__ = "[^"]+"$/m, `__version__ = "${version}"`);
if (updated === init && !init.includes(`__version__ = "${version}"`)) {
  console.error(`sync: could not find a __version__ line in ${initPath}`);
  process.exit(1);
}
writeFileSync(initPath, updated);

console.log(`jsr.json and the Python package set to ${version}`);
