import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";

import {
  AmbiguousAppError,
  AppNotFoundError,
  ITCH_APP_NAMES,
  ITCH_STRATEGIES,
  ItchNotFoundError,
  findItch,
  findItchAppById,
  findItchAppByName,
  findItchAppManifest,
  findItchApps,
  findItchAppsById,
  findItchAppsByName,
  findItchLibraries,
  findItchLibrariesPaths,
  findItchPath,
  findReceipts,
  getItchPathCandidates,
  getInstallFolderPath,
  getLaunchCandidatePaths,
  getLegacyReceiptPath,
  getLibraryDownloadsFolder,
  getReceiptPath,
  getStagingFolder,
  hasItchApp,
  readReceipt,
  resolveDatabasePath,
} from "../lib/esm/index.js";

import {
  createFixture,
  makeReceipt,
  writeDatabase,
  writeInstallFolder,
  withIsolatedHome,
  writeLegacyInstallFolder,
  writePreferences,
} from "./fixtures.mjs";

const LOCATION_ID = "87c69020-7130-495e-a91e-fa146c0125df";
const SECOND_LOCATION_ID = "b85d5b35-9d3e-4985-94b0-6c6d47a5afa9";

/**
 * A fixture mirroring the real-world shape: a default install location holding
 * several games, a second location the user also keeps unrelated things in,
 * plus the edge cases itch produces over time.
 */
function buildStandardFixture() {
  const fixture = createFixture();
  const games = fixture.dir("Games", "itch");
  const other = fixture.dir("Games");

  writePreferences(fixture, { installLocations: {}, defaultInstallLocation: LOCATION_ID });

  const distributrains = {
    id: "cave-distributrains",
    gameId: 4225297,
    installLocationId: LOCATION_ID,
    installFolderName: "distributrains",
    installedSize: 35495975,
    secondsRun: 120,
    lastPlayedAt: "2026-05-01T10:00:00Z",
    game: {
      url: "https://oddwarg.itch.io/distributrains",
      title: "Distributrains",
      linux: "all",
      windows: "all",
      user: { id: 1, username: "oddwarg" },
    },
    upload: { id: 17222913, filename: "Distributrains.zip", size: 19715532 },
    verdict: {
      basePath: path.join(games, "distributrains"),
      totalSize: 35495975,
      candidates: [
        { path: "Distributrains/Distributrains64", depth: 2, flavor: "linux", arch: "amd64" },
      ],
    },
  };

  const pckExplorer = {
    id: "cave-godot-pck-explorer",
    gameId: 1323129,
    installLocationId: LOCATION_ID,
    installFolderName: "godot-pck-explorer",
    installedSize: 15783510,
    pinned: true,
    game: {
      url: "https://dmitriysalnikov.itch.io/godot-pck-explorer",
      title: "Godot PCK Explorer",
      classification: "tool",
      linux: "all",
      user: { id: 133178, username: "DmitriySalnikov" },
    },
    upload: {
      id: 11178280,
      storage: "build",
      channelName: "native-console-linux-64",
      buildId: 1385998,
    },
    build: { id: 1385998, version: 8, userVersion: "1.6.0" },
    verdict: { candidates: [{ path: "GodotPCKExplorer.Console", depth: 1, flavor: "linux" }] },
  };

  // itch keeps the cave when the folder is deleted from outside the app.
  const uninstalled = {
    id: "cave-vanished",
    gameId: 999001,
    installLocationId: LOCATION_ID,
    installFolderName: "vanished",
    game: { url: "https://someone.itch.io/vanished", title: "Vanished" },
  };

  // "Install elsewhere" puts a game outside every install location.
  const custom = {
    id: "cave-elsewhere",
    gameId: 999002,
    customInstallFolder: fixture.dir("Elsewhere", "portable-game"),
    game: { url: "https://someone.itch.io/portable-game", title: "Portable Game" },
  };

  writeDatabase(fixture, {
    installLocations: [
      { id: "appdata", path: path.join(fixture.itchPath, "apps") },
      { id: SECOND_LOCATION_ID, path: other },
      { id: LOCATION_ID, path: games },
    ],
    caves: [distributrains, pckExplorer, uninstalled, custom],
  });

  writeInstallFolder(path.join(games, "distributrains"), {
    receipt: makeReceipt({
      id: 4225297,
      url: "https://oddwarg.itch.io/distributrains",
      title: "Distributrains",
    }),
    files: ["Distributrains/Distributrains64"],
  });
  writeInstallFolder(path.join(games, "godot-pck-explorer"), {
    receipt: makeReceipt({
      id: 1323129,
      url: "https://dmitriysalnikov.itch.io/godot-pck-explorer",
      title: "Godot PCK Explorer",
      classification: "tool",
    }),
  });
  writeInstallFolder(fixture.dir("Elsewhere", "portable-game"), {
    receipt: makeReceipt({
      id: 999002,
      url: "https://someone.itch.io/portable-game",
      title: "Portable Game",
    }),
  });

  // A game the database has no cave for -- reinstalled after a database reset.
  writeInstallFolder(path.join(games, "cosmic-collapse"), {
    receipt: makeReceipt({
      id: 2328674,
      url: "https://johanpeitz.itch.io/cosmic-collapse",
      title: "Cosmic Collapse, a suika-like",
    }),
    gzip: false,
  });

  // Noise that must never be reported: itch's own staging folder, and the
  // unrelated directories a user keeps in a shared install location.
  fs.mkdirSync(path.join(games, "downloads"), { recursive: true });
  fs.mkdirSync(path.join(other, "Steam", "steamapps"), { recursive: true });
  fs.mkdirSync(path.join(other, "VintageStory"), { recursive: true });

  return { fixture, games, other };
}

describe("find-itch-games", () => {
  let fixture;
  let games;
  let other;
  let options;

  before(() => {
    ({ fixture, games, other } = buildStandardFixture());
    options = { itchPath: fixture.itchPath };
  });

  after(() => fixture.cleanup());

  describe("findItchPath", () => {
    it("honours the ITCH_USER_DATA_DIR override", async () => {
      await withIsolatedHome({ ITCH_USER_DATA_DIR: fixture.itchPath }, async () => {
        assert.equal(await findItchPath(), fixture.itchPath);
      });
    });

    it("skips a directory that isn't an itch installation", async () => {
      // `~/Games` exists but holds no butler.db, preferences.json or apps/,
      // so it must be rejected rather than returned.
      await withIsolatedHome({ ITCH_USER_DATA_DIR: fixture.dir("Games") }, async () => {
        assert.equal(await findItchPath(), undefined);
      });
    });

    it("searches only under the current home directory", async () => {
      await withIsolatedHome({}, async (home) => {
        const candidates = getItchPathCandidates();
        assert.ok(candidates.length > 0);
        assert.ok(
          candidates.every((candidate) => candidate.startsWith(home + path.sep)),
          `candidates escaped the home directory: ${candidates.join(", ")}`,
        );
      });
    });

    it("throws ItchNotFoundError for a bad explicit path", async () => {
      await assert.rejects(
        () => findItch({ itchPath: fixture.dir("nope") }),
        ItchNotFoundError,
      );
    });
  });

  describe("when itch isn't installed at all", () => {
    it("findItchPath returns undefined", async () => {
      await withIsolatedHome({}, async () => {
        assert.equal(await findItchPath(), undefined);
      });
    });

    it("every entry point throws ItchNotFoundError", async () => {
      await withIsolatedHome({}, async () => {
        for (const call of [
          () => findItch(),
          () => findItchApps(),
          () => findItchLibraries(),
          () => findItchLibrariesPaths(),
          () => findItchAppById(4225297),
          () => findItchAppByName("Distributrains"),
          () => findItchAppManifest(4225297),
          () => hasItchApp(4225297),
        ]) {
          await assert.rejects(call, ItchNotFoundError);
        }
      });
    });

    it("names the directories it searched", async () => {
      await withIsolatedHome({}, async (home) => {
        await assert.rejects(findItch(), (error) => {
          assert.ok(error instanceof ItchNotFoundError);
          assert.match(error.message, /itch installation not found/);
          assert.ok(error.message.includes(home), "should list the searched paths");
          return true;
        });
      });
    });
  });

  describe("install locations", () => {
    it("reads every location out of butler.db", async () => {
      const paths = await findItchLibrariesPaths(options);
      assert.deepEqual(new Set(paths), new Set([path.join(fixture.itchPath, "apps"), other, games]));
    });

    it("marks the default location from preferences.json", async () => {
      const { libraries } = await findItchLibraries(options);
      const defaults = libraries.filter((library) => library.isDefault);
      assert.equal(defaults.length, 1);
      assert.equal(defaults[0].path, games);
    });

    it("reports whether butler.db was readable", async () => {
      const raw = await findItchLibraries(options);
      assert.equal(raw.databaseAvailable, true);
      assert.equal(raw.databasePath, path.join(fixture.itchPath, "db", "butler.db"));
    });

    it("falls back to preferences.json when the database is ignored", async () => {
      const withPrefs = createFixture();
      writePreferences(withPrefs, {
        installLocations: { legacy: { path: withPrefs.dir("Legacy") } },
        defaultInstallLocation: "legacy",
      });
      try {
        const paths = await findItchLibrariesPaths({
          itchPath: withPrefs.itchPath,
          ignoreDatabase: true,
        });
        assert.ok(paths.includes(withPrefs.dir("Legacy")));
      } finally {
        withPrefs.cleanup();
      }
    });

    it("always includes the derived appdata location", async () => {
      const bare = createFixture();
      try {
        const paths = await findItchLibrariesPaths({ itchPath: bare.itchPath });
        assert.deepEqual(paths, [path.join(bare.itchPath, "apps")]);
      } finally {
        bare.cleanup();
      }
    });

    it("accepts extra locations", async () => {
      const paths = await findItchLibrariesPaths({
        ...options,
        extraLibraries: [fixture.dir("Elsewhere")],
      });
      assert.ok(paths.includes(fixture.dir("Elsewhere")));
    });
  });

  describe("findItch", () => {
    it("groups installed games under their install location", async () => {
      const result = await findItch(options);
      const library = result.libraries.find((entry) => entry.path === games);
      assert.deepEqual(
        library.apps.map((app) => app.manifest.installFolderName).sort(),
        ["cosmic-collapse", "distributrains", "godot-pck-explorer"],
      );
    });

    it("ignores unrelated folders in a shared install location", async () => {
      const result = await findItch(options);
      const library = result.libraries.find((entry) => entry.path === other);
      assert.deepEqual(library.apps, []);
    });

    it("ignores itch's own downloads staging folder", async () => {
      const apps = await findItchApps(options);
      assert.ok(!apps.some((app) => app.manifest.installFolderName === "downloads"));
    });

    it("drops caves whose install folder is gone", async () => {
      const apps = await findItchApps(options);
      assert.ok(!apps.some((app) => app.gameId === 999001));
    });

    it("keeps them when checkExists is off", async () => {
      const apps = await findItchApps({ ...options, checkExists: false });
      const vanished = apps.find((app) => app.gameId === 999001);
      assert.equal(vanished.path, path.join(games, "vanished"));
    });

    it("synthesizes a library for a custom install folder", async () => {
      const result = await findItch(options);
      const library = result.libraries.find((entry) => entry.path === fixture.dir("Elsewhere"));
      assert.equal(library.apps.length, 1);
      assert.equal(library.apps[0].gameId, 999002);
      assert.equal(
        library.apps[0].manifest.customInstallFolder,
        fixture.dir("Elsewhere", "portable-game"),
      );
    });
  });

  describe("strategies", () => {
    it("merge combines the cave and the receipt", async () => {
      const apps = await findItchApps({ ...options, strategy: "merge" });
      const app = apps.find((entry) => entry.gameId === 4225297);
      assert.equal(app.manifest.source, "db+receipt");
      assert.equal(app.manifest.secondsRun, 120);
      assert.ok(app.receiptPath.endsWith(path.join(".itch", "receipt.json.gz")));
    });

    it("merge also reports games butler.db has no cave for", async () => {
      const apps = await findItchApps({ ...options, strategy: "merge" });
      const app = apps.find((entry) => entry.gameId === 2328674);
      assert.equal(app.manifest.source, "receipt");
      assert.equal(app.manifest.caveId, undefined);
      assert.equal(app.manifest.installLocationId, LOCATION_ID);
    });

    it("db reports only caves, and keeps the database-only fields", async () => {
      const apps = await findItchApps({ ...options, strategy: "db" });
      assert.ok(!apps.some((app) => app.gameId === 2328674));
      const app = apps.find((entry) => entry.gameId === 1323129);
      assert.equal(app.manifest.source, "db");
      assert.equal(app.manifest.pinned, true);
      assert.equal(app.manifest.version, "1.6.0");
      assert.equal(app.manifest.channelName, "native-console-linux-64");
    });

    it("receipts reports only on-disk records but still uses db locations", async () => {
      const apps = await findItchApps({ ...options, strategy: "receipts" });
      assert.ok(apps.every((app) => app.manifest.source === "receipt"));
      assert.ok(apps.some((app) => app.gameId === 2328674));
      // The custom install folder is a cave-only concept, so it drops out.
      assert.ok(!apps.some((app) => app.gameId === 999002));
    });

    it("survives an unreadable database", async () => {
      const broken = createFixture();
      writePreferences(broken, {
        installLocations: { legacy: { path: broken.dir("Legacy") } },
      });
      writeInstallFolder(broken.dir("Legacy", "some-game"), {
        receipt: makeReceipt({
          id: 4242,
          url: "https://someone.itch.io/some-game",
          title: "Some Game",
        }),
      });
      fs.writeFileSync(path.join(broken.itchPath, "db", "butler.db"), "not a database");
      try {
        const result = await findItch({ itchPath: broken.itchPath });
        assert.equal(result.databaseAvailable, false);
        assert.deepEqual(
          result.libraries.flatMap((library) => library.apps).map((app) => app.gameId),
          [4242],
        );
      } finally {
        broken.cleanup();
      }
    });

    // The `source` values each strategy is allowed to produce. Adding a
    // strategy without adding it here fails the next test, so a new one can't
    // ship untested.
    const EXPECTED_SOURCES = {
      merge: ["db", "db+receipt", "receipt"],
      db: ["db"],
      receipts: ["receipt"],
    };

    it("exercises every strategy ITCH_STRATEGIES advertises", async () => {
      assert.deepEqual(
        [...ITCH_STRATEGIES].sort(),
        Object.keys(EXPECTED_SOURCES).sort(),
        "a strategy was added or removed without updating EXPECTED_SOURCES",
      );

      for (const strategy of ITCH_STRATEGIES) {
        const apps = await findItchApps({ ...options, strategy });
        assert.ok(apps.length > 0, `${strategy} found nothing`);
        for (const app of apps) {
          assert.ok(
            EXPECTED_SOURCES[strategy].includes(app.manifest.source),
            `${strategy} produced unexpected source ${app.manifest.source}`,
          );
        }
      }
    });

    it("rejects a strategy that isn't one, rather than guessing", async () => {
      // Every strategy is defined by what it is not, so a typo would otherwise
      // satisfy all the negative checks and quietly behave like `merge`.
      for (const strategy of ["recipts", "DB", "", null, 0]) {
        await assert.rejects(
          () => findItchApps({ ...options, strategy }),
          (error) => {
            assert.ok(error instanceof TypeError, `${strategy} did not throw TypeError`);
            assert.match(error.message, /unknown itch strategy/);
            assert.match(error.message, /"merge", "db", "receipts"/);
            return true;
          },
        );
      }
    });

    it("rejects an invalid strategy even when ignoreDatabase would override it", async () => {
      await assert.rejects(
        () => findItchApps({ ...options, ignoreDatabase: true, strategy: "recipts" }),
        TypeError,
      );
    });

    it("cannot be widened, since the list is the guard and not a registry", async () => {
      // findItch dispatches on these values directly, so a pushed strategy
      // would pass validation and then quietly behave like `merge`.
      assert.ok(Object.isFrozen(ITCH_STRATEGIES));
      assert.throws(() => ITCH_STRATEGIES.push("cloud-only"), TypeError);
      assert.deepEqual([...ITCH_STRATEGIES], ["merge", "db", "receipts"]);
    });

    it("still accepts an omitted strategy", async () => {
      const apps = await findItchApps({ ...options, strategy: undefined });
      assert.ok(apps.length > 0);
    });
  });

  describe("lookups", () => {
    it("finds a game by id", async () => {
      assert.equal(await findItchAppById(4225297, options), path.join(games, "distributrains"));
    });

    it("throws AppNotFoundError for an unknown id", async () => {
      await assert.rejects(() => findItchAppById(1, options), AppNotFoundError);
    });

    it("matches title, slug and folder name exactly by default", async () => {
      const expected = path.join(games, "godot-pck-explorer");
      assert.equal(await findItchAppByName("Godot PCK Explorer", options), expected);
      assert.equal(await findItchAppByName("godot-pck-explorer", options), expected);
    });

    it("does not match loosely unless asked", async () => {
      await assert.rejects(
        () => findItchAppByName("godot pck explorer", options),
        AppNotFoundError,
      );
      await assert.rejects(() => findItchAppByName("GODOT-PCK-EXPLORER", options), AppNotFoundError);
    });

    it("ignores case, spacing and punctuation with exact: false", async () => {
      const expected = path.join(games, "godot-pck-explorer");
      const fuzzy = { ...options, exact: false };
      assert.equal(await findItchAppByName("godot pck explorer", fuzzy), expected);
      assert.equal(await findItchAppByName("GODOT_PCK_EXPLORER", fuzzy), expected);
      assert.equal(await findItchAppByName("GodotPckExplorer", fuzzy), expected);
    });

    it("throws AppNotFoundError for an unknown name", async () => {
      await assert.rejects(() => findItchAppByName("Half-Life 3", options), AppNotFoundError);
      await assert.rejects(
        () => findItchAppByName("Half-Life 3", { ...options, exact: false }),
        AppNotFoundError,
      );
    });

    it("returns every match by name", async () => {
      const matches = await findItchAppsByName("Distributrains", options);
      assert.deepEqual(matches.map((app) => app.path), [path.join(games, "distributrains")]);
      assert.deepEqual(await findItchAppsByName("Half-Life 3", options), []);
    });

    it("returns every install of a game id", async () => {
      const matches = await findItchAppsById(4225297, options);
      assert.deepEqual(matches.map((app) => app.path), [path.join(games, "distributrains")]);
      assert.deepEqual(await findItchAppsById(1, options), []);
    });

    it("answers hasItchApp for ids and names", async () => {
      assert.equal(await hasItchApp(4225297, options), true);
      assert.equal(await hasItchApp("Distributrains", options), true);
      assert.equal(await hasItchApp(1, options), false);
      assert.equal(await hasItchApp("Half-Life 3", options), false);
      assert.equal(await hasItchApp("distributrains!", options), false);
      assert.equal(await hasItchApp("distributrains!", { ...options, exact: false }), true);
    });
  });

  describe("collisions", () => {
    it("returns the first match, and throws with strict", async () => {
      // Two different games whose titles differ only in punctuation, so they
      // collide under a fuzzy search but not an exact one.
      const collide = createFixture();
      const location = collide.dir("Games");
      writeDatabase(collide, { installLocations: [{ id: "loc", path: location }] });
      writeInstallFolder(path.join(location, "re-boot"), {
        receipt: makeReceipt({ id: 11, url: "https://a.itch.io/re-boot", title: "Re-Boot" }),
      });
      writeInstallFolder(path.join(location, "reboot"), {
        receipt: makeReceipt({ id: 22, url: "https://b.itch.io/reboot", title: "Reboot" }),
      });
      const opts = { itchPath: collide.itchPath };

      try {
        assert.deepEqual(
          (await findItchAppsByName("reboot", { ...opts, exact: false })).map((app) => app.gameId),
          [11, 22],
        );
        // Exact matching separates them again.
        assert.equal(await findItchAppByName("Re-Boot", opts), path.join(location, "re-boot"));
        assert.equal(await findItchAppByName("Reboot", opts), path.join(location, "reboot"));

        // Without strict, the first match wins, deterministically.
        const first = await findItchAppByName("reboot", { ...opts, exact: false });
        assert.equal(first, path.join(location, "re-boot"));
        assert.equal(await findItchAppByName("reboot", { ...opts, exact: false }), first);

        await assert.rejects(
          () => findItchAppByName("reboot", { ...opts, exact: false, strict: true }),
          (error) => {
            assert.ok(error instanceof AmbiguousAppError);
            assert.equal(error.paths.length, 2);
            assert.match(error.message, /matched 2 installed games/);
            return true;
          },
        );
      } finally {
        collide.cleanup();
      }
    });

    it("reports the same game installed in two locations", async () => {
      const twice = createFixture();
      const a = twice.dir("A");
      const b = twice.dir("B");
      writeDatabase(twice, {
        installLocations: [
          { id: "a", path: a },
          { id: "b", path: b },
        ],
      });
      const receipt = makeReceipt({
        id: 4242,
        url: "https://someone.itch.io/twice",
        title: "Twice",
      });
      writeInstallFolder(path.join(a, "twice"), { receipt });
      writeInstallFolder(path.join(b, "twice"), { receipt });
      const opts = { itchPath: twice.itchPath };

      try {
        assert.deepEqual(
          (await findItchAppsById(4242, opts)).map((app) => app.path),
          [path.join(a, "twice"), path.join(b, "twice")],
        );
        assert.equal(await findItchAppById(4242, opts), path.join(a, "twice"));
        await assert.rejects(
          () => findItchAppById(4242, { ...opts, strict: true }),
          AmbiguousAppError,
        );
      } finally {
        twice.cleanup();
      }
    });
  });

  describe("manifests", () => {
    it("flattens the fields worth having at hand", async () => {
      const manifest = await findItchAppManifest(4225297, options);
      assert.equal(manifest.gameId, 4225297);
      assert.equal(manifest.caveId, "cave-distributrains");
      assert.equal(manifest.title, "Distributrains");
      assert.equal(manifest.slug, "distributrains");
      assert.equal(manifest.author, "oddwarg");
      assert.equal(manifest.classification, "game");
      assert.equal(manifest.installedSize, 35495975);
      assert.equal(manifest.installLocationId, LOCATION_ID);
      assert.deepEqual(manifest.platforms, { windows: "all", linux: "all" });
      assert.equal(manifest.upload.filename, "Distributrains.zip");
    });

    it("returns null for a game that isn't installed", async () => {
      assert.equal(await findItchAppManifest(1, options), null);
    });

    it("resolves launch candidates to absolute paths", async () => {
      const manifest = await findItchAppManifest(4225297, options);
      assert.deepEqual(getLaunchCandidatePaths(manifest), [
        path.join(games, "distributrains", "Distributrains", "Distributrains64"),
      ]);
    });

    it("has no candidates when butler never scanned the folder", async () => {
      const manifest = await findItchAppManifest(2328674, options);
      assert.deepEqual(manifest.candidates, []);
      assert.deepEqual(getLaunchCandidatePaths(manifest), []);
    });
  });

  describe("receipts", () => {
    it("reads gzipped receipts", async () => {
      const receipt = await readReceipt(path.join(games, "distributrains"));
      assert.equal(receipt.game.id, 4225297);
    });

    it("reads uncompressed receipts", async () => {
      const receipt = await readReceipt(path.join(games, "cosmic-collapse"));
      assert.equal(receipt.game.id, 2328674);
    });

    it("returns null for a folder without one", async () => {
      assert.equal(await readReceipt(path.join(other, "VintageStory")), null);
      assert.equal(await readReceipt(path.join(games, "does-not-exist")), null);
    });

    it("scans a location for receipts", async () => {
      const found = await findReceipts(games);
      assert.deepEqual(
        found.map((entry) => entry.installFolderName).sort(),
        ["cosmic-collapse", "distributrains", "godot-pck-explorer"],
      );
    });
  });

  describe("path helpers", () => {
    it("resolves install, downloads and staging folders", () => {
      assert.equal(getInstallFolderPath(games, "distributrains"), path.join(games, "distributrains"));
      assert.equal(getLibraryDownloadsFolder(games), path.join(games, "downloads"));
      assert.equal(getStagingFolder(games, "abc"), path.join(games, "downloads", "abc"));
    });

    it("resolves receipt paths", () => {
      const installPath = path.join(games, "distributrains");
      assert.equal(getReceiptPath(installPath), path.join(installPath, ".itch", "receipt.json.gz"));
      assert.equal(
        getLegacyReceiptPath(installPath),
        path.join(installPath, ".itch", "receipt.json"),
      );
    });
  });
});

describe("itch app variants", () => {
  it("finds the kitch canary build's user-data directory", async () => {
    const canary = createFixture({ appName: "kitch" });
    try {
      await withIsolatedHome({ ITCH_USER_DATA_DIR: canary.itchPath }, async () => {
        assert.equal(await findItchPath(), canary.itchPath);
      });
      assert.ok(canary.itchPath.endsWith(path.join("config", "kitch")));
      const paths = await findItchLibrariesPaths({ itchPath: canary.itchPath });
      assert.deepEqual(paths, [path.join(canary.itchPath, "apps")]);
    } finally {
      canary.cleanup();
    }
  });

  it("cannot have app names appended to it", async () => {
    assert.ok(Object.isFrozen(ITCH_APP_NAMES));
    assert.throws(() => ITCH_APP_NAMES.push("witch"), TypeError);
  });

  it("searches for kitch as well as itch", async () => {
    // Asserted on the final path segment rather than a full path, since the
    // directory around it differs per platform.
    await withIsolatedHome({}, async () => {
      const candidates = getItchPathCandidates();
      for (const appName of ["itch", "kitch"]) {
        assert.ok(
          candidates.some((candidate) => path.basename(candidate) === appName),
          `no candidate for ${appName} in ${candidates.join(", ")}`,
        );
      }
    });
  });
});

describe("butler database naming", () => {
  it("prefers butler.db", async () => {
    const fixture = createFixture();
    try {
      writeDatabase(fixture, { installLocations: [{ id: "a", path: fixture.dir("A") }] });
      writeDatabase(fixture, {
        installLocations: [{ id: "b", path: fixture.dir("B") }],
        dbName: "butler-example.com.db",
      });
      assert.equal(
        await resolveDatabasePath(fixture.itchPath),
        path.join(fixture.itchPath, "db", "butler.db"),
      );
      const paths = await findItchLibrariesPaths({ itchPath: fixture.itchPath });
      assert.ok(paths.includes(fixture.dir("A")));
      assert.ok(!paths.includes(fixture.dir("B")));
    } finally {
      fixture.cleanup();
    }
  });

  it("falls back to a butler-<host>.db from a custom-host build", async () => {
    const fixture = createFixture();
    try {
      writeDatabase(fixture, {
        installLocations: [{ id: "b", path: fixture.dir("B") }],
        dbName: "butler-example.com.db",
      });
      assert.equal(
        await resolveDatabasePath(fixture.itchPath),
        path.join(fixture.itchPath, "db", "butler-example.com.db"),
      );
      const result = await findItch({ itchPath: fixture.itchPath });
      assert.equal(result.databaseAvailable, true);
      assert.ok(result.libraries.some((library) => library.path === fixture.dir("B")));
    } finally {
      fixture.cleanup();
    }
  });
});

describe("legacy receipts", () => {
  const CAVE = {
    id: "3f2c1d4e-legacy",
    gameId: 55555,
    uploadId: 66666,
    buildId: 0,
    lastTouched: 0,
    secondsRun: 0,
    installedAt: 1500000000,
    pathScheme: 2,
    installLocation: "appdata",
    installFolder: "old-game",
  };

  function buildLegacyFixture() {
    const fixture = createFixture();
    const games = fixture.dir("Games", "itch");
    writeDatabase(fixture, { installLocations: [{ id: "loc", path: games }] });
    writeLegacyInstallFolder(path.join(games, "old-game"), CAVE, ["game.exe"]);
    return { fixture, games };
  }

  it("reads the pre-v23 receipt.json shape", async () => {
    const { fixture, games } = buildLegacyFixture();
    try {
      const receipt = await readReceipt(path.join(games, "old-game"));
      assert.equal(receipt.game.id, 55555);
      assert.equal(receipt.upload.id, 66666);
      assert.equal(receipt.build, undefined);
      assert.deepEqual(receipt.files, ["game.exe"]);
      assert.equal(receipt.legacy.caveId, "3f2c1d4e-legacy");
      assert.equal(receipt.legacy.installFolder, "old-game");
      assert.equal(receipt.legacy.pathScheme, 2);
    } finally {
      fixture.cleanup();
    }
  });

  it("reports the game, pointing at the uncompressed receipt", async () => {
    const { fixture, games } = buildLegacyFixture();
    try {
      const apps = await findItchApps({ itchPath: fixture.itchPath });
      assert.deepEqual(apps.map((app) => app.gameId), [55555]);
      assert.equal(apps[0].path, path.join(games, "old-game"));
      assert.equal(apps[0].receiptPath, getLegacyReceiptPath(path.join(games, "old-game")));
      assert.equal(apps[0].manifest.uploadId, 66666);
      assert.equal(apps[0].manifest.title, undefined);
    } finally {
      fixture.cleanup();
    }
  });
});

describe("scan rules", () => {
  it("requires a .itch directory, matching butler's own scan", async () => {
    const fixture = createFixture();
    const games = fixture.dir("Games", "itch");
    try {
      writeDatabase(fixture, { installLocations: [{ id: "loc", path: games }] });
      // A folder whose receipt sits at the top level rather than under .itch.
      fs.mkdirSync(path.join(games, "not-a-game"), { recursive: true });
      fs.writeFileSync(
        path.join(games, "not-a-game", "receipt.json"),
        JSON.stringify({ game: { id: 1 } }),
      );
      assert.deepEqual(await findReceipts(games), []);
      assert.deepEqual(await findItchApps({ itchPath: fixture.itchPath }), []);
    } finally {
      fixture.cleanup();
    }
  });

  it("skips a downloads folder even if it holds a receipt", async () => {
    const fixture = createFixture();
    const games = fixture.dir("Games", "itch");
    try {
      writeDatabase(fixture, { installLocations: [{ id: "loc", path: games }] });
      writeInstallFolder(path.join(games, "downloads"), {
        receipt: makeReceipt({ id: 777, url: "https://a.itch.io/b", title: "Staged" }),
      });
      assert.deepEqual(await findReceipts(games), []);
    } finally {
      fixture.cleanup();
    }
  });
});
