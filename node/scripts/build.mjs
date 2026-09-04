import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const tsc = process.platform === "win32" ? "tsc.cmd" : "tsc";
const run = (...args) =>
  execFileSync(tsc, args, { stdio: "inherit", cwd: process.cwd(), shell: false });

run("-p", "tsconfig.json");
run("-p", "tsconfig.cjs.json");

// The package is `"type": "module"`, so the CommonJS output needs a scoped
// override or Node would load those .js files as ESM.
mkdirSync("lib/cjs", { recursive: true });
writeFileSync("lib/cjs/package.json", JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
mkdirSync("lib/esm", { recursive: true });
writeFileSync("lib/esm/package.json", JSON.stringify({ type: "module" }, null, 2) + "\n");
