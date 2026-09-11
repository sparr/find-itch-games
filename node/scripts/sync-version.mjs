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

const shellPath = "../shell/find-itch-games.sh";
const shell = readFileSync(shellPath, "utf8");
const shellUpdated = shell.replace(/^ITCH_VERSION='[^']+'$/m, `ITCH_VERSION='${version}'`);
if (shellUpdated === shell && !shell.includes(`ITCH_VERSION='${version}'`)) {
  console.error(`sync: could not find an ITCH_VERSION line in ${shellPath}`);
  process.exit(1);
}
writeFileSync(shellPath, shellUpdated);

console.log(`jsr.json, the Python package and the shell script set to ${version}`);
