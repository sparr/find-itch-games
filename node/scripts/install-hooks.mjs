import { execFileSync } from "node:child_process";

// npm runs `prepare` on a local `npm install` and on git-URL installs, but not
// when a consumer installs the published tarball. Guard anyway: an extracted
// tarball has no repository to configure, and failing there would break the
// install for no reason.
try {
  execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
} catch {
  process.exit(0);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "inherit" });
