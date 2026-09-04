/** Copies package.json's version into jsr.json. */
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const jsr = JSON.parse(readFileSync("jsr.json", "utf8"));
writeFileSync("jsr.json", JSON.stringify({ ...jsr, version }, null, 2) + "\n");
console.log(`jsr.json set to ${version}`);
