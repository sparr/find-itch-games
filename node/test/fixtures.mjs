import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { gzipSync } from "node:zlib";

/** The shared DDL, so both language suites build the same database. */
const SHARED = path.join(import.meta.dirname, "..", "..", "shared");
const SCHEMA = fs.readFileSync(path.join(SHARED, "butler-schema.sql"), "utf8");

/** The language-neutral vocabulary every implementation must agree on. */
export const DEFINITIONS = JSON.parse(
  fs.readFileSync(path.join(SHARED, "definitions.json"), "utf8"),
);

/** The canonical test installation, shared with the Python suite. */
export const SHARED_FIXTURE = JSON.parse(
  fs.readFileSync(path.join(SHARED, "fixtures.json"), "utf8"),
);

let counter = 0;

/**
 * Builds a throwaway itch installation on disk.
 *
 * Returns `{ root, itchPath, dir, cleanup }`; `dir(...parts)` resolves a path
 * inside the fixture so tests can point install locations at real folders.
 */
export function createFixture({ appName = "itch" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `find-itch-test-${counter++}-`));
  const itchPath = path.join(root, "config", appName);
  fs.mkdirSync(path.join(itchPath, "db"), { recursive: true });
  fs.mkdirSync(path.join(itchPath, "apps"), { recursive: true });

  return {
    root,
    itchPath,
    dir: (...parts) => path.join(root, ...parts),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

export function writePreferences(fixture, preferences) {
  fs.writeFileSync(
    path.join(fixture.itchPath, "preferences.json"),
    JSON.stringify(preferences),
  );
}

/**
 * Writes a butler.db.
 *
 * `installLocations` is a list of `{ id, path }`, `caves` a list of partial
 * cave rows that also carry the `game`, `upload` and `build` rows to insert.
 */
export function writeDatabase(
  fixture,
  { installLocations = [], caves = [], dbName = "butler.db" } = {},
) {
  const dbPath = path.join(fixture.itchPath, "db", dbName);
  fs.rmSync(dbPath, { force: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);

  const insertLocation = db.prepare("INSERT INTO install_locations (id, path) VALUES (?, ?)");
  for (const location of installLocations) insertLocation.run(location.id, location.path);

  const insertGame = db.prepare(
    `INSERT OR REPLACE INTO games (id, url, title, classification, windows, linux, osx, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertUser = db.prepare(
    "INSERT OR REPLACE INTO users (id, username, display_name) VALUES (?, ?, ?)",
  );
  const insertUpload = db.prepare(
    `INSERT OR REPLACE INTO uploads (id, storage, filename, display_name, size, channel_name, build_id, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertBuild = db.prepare(
    `INSERT OR REPLACE INTO builds (id, state, upload_id, game_id, version, user_version)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertCave = db.prepare(
    `INSERT INTO caves (id, game_id, upload_id, build_id, pinned, installed_at, local_last_run_at,
       seconds_run, verdict, installed_size, install_location_id, install_folder_name,
       custom_install_folder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const cave of caves) {
    const game = cave.game ?? {};
    if (game.user) insertUser.run(game.user.id, game.user.username, game.user.displayName ?? "");
    insertGame.run(
      cave.gameId,
      game.url ?? null,
      game.title ?? null,
      game.classification ?? "game",
      game.windows ?? null,
      game.linux ?? null,
      game.osx ?? null,
      game.user?.id ?? 0,
    );
    if (cave.upload) {
      insertUpload.run(
        cave.upload.id,
        cave.upload.storage ?? "hosted",
        cave.upload.filename ?? null,
        cave.upload.displayName ?? null,
        cave.upload.size ?? 0,
        cave.upload.channelName ?? "",
        cave.upload.buildId ?? 0,
        cave.upload.type ?? "default",
      );
    }
    if (cave.build) {
      insertBuild.run(
        cave.build.id,
        cave.build.state ?? "completed",
        cave.upload?.id ?? 0,
        cave.gameId,
        cave.build.version ?? 1,
        cave.build.userVersion ?? null,
      );
    }
    insertCave.run(
      cave.id,
      cave.gameId,
      cave.upload?.id ?? 0,
      cave.build?.id ?? 0,
      cave.pinned ? 1 : 0,
      cave.installedAt ?? "2026-01-01T00:00:00Z",
      cave.lastPlayedAt ?? null,
      cave.secondsRun ?? 0,
      cave.verdict === undefined ? null : JSON.stringify(cave.verdict),
      cave.installedSize ?? 0,
      cave.installLocationId ?? null,
      cave.installFolderName ?? null,
      cave.customInstallFolder ?? "",
    );
  }

  db.close();
  return dbPath;
}

/** Creates an install folder, optionally with the receipt itch would leave. */
export function writeInstallFolder(installPath, { receipt, gzip = true, files = [] } = {}) {
  fs.mkdirSync(installPath, { recursive: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(installPath, file)), { recursive: true });
    fs.writeFileSync(path.join(installPath, file), "");
  }
  if (receipt) {
    fs.mkdirSync(path.join(installPath, ".itch"), { recursive: true });
    const json = JSON.stringify(receipt);
    if (gzip) {
      fs.writeFileSync(path.join(installPath, ".itch", "receipt.json.gz"), gzipSync(json));
    } else {
      fs.writeFileSync(path.join(installPath, ".itch", "receipt.json"), json);
    }
  }
  return installPath;
}

/** The pre-v23 `.itch/receipt.json`, which recorded a cave rather than a game. */
export function writeLegacyInstallFolder(installPath, cave, files = []) {
  fs.mkdirSync(path.join(installPath, ".itch"), { recursive: true });
  fs.writeFileSync(
    path.join(installPath, ".itch", "receipt.json"),
    JSON.stringify({ cave, files }),
  );
  return installPath;
}

/** A minimal but realistically shaped receipt. */
export function makeReceipt({ id, url, title, classification = "game", upload, build } = {}) {
  return {
    game: { id, url, title, classification, platforms: { linux: "all" } },
    ...(upload ? { upload } : {}),
    ...(build ? { build } : {}),
    files: ["run.sh"],
    installerName: "archive",
  };
}
