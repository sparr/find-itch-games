# find-itch-games

Find the itch.io app, its install locations, and the games installed in them.

An itch.io counterpart to [`@ciberus/find-steam-app`](https://github.com/ciberusps/find-steam-app),
available for two languages. Both read the same records itch keeps, and are
tested against the same fixtures.

| Language | Package | Install | Docs |
| --- | --- | --- | --- |
| JavaScript / TypeScript | `find-itch-games` (npm), `@sparr/find-itch-games` (JSR) | `npm i find-itch-games` | [node/README.md](node/README.md) · [API](https://sparr.github.io/find-itch-games/node/api/) |
| Python | `find-itch-games` (PyPI) | `pip install find-itch-games` | [python/README.md](python/README.md) · [API](https://sparr.github.io/find-itch-games/python/api/) |

Neither has runtime dependencies. This page describes what itch does and how
the libraries find things; the per-language READMEs cover their APIs.

The two packages share a name, a definition set and a version: they are
released in lockstep, so `find-itch-games 0.1.1` means the same behaviour in
either language. A release that only changes one of them simply is not
republished for the other, so version numbers may skip.

Data structures and lookup rules follow the upstream sources: the
[itch client](https://github.com/itchio/itch), [butler](https://github.com/itchio/butler)
and its [`dash`](https://github.com/itchio/dash), [`hush`](https://github.com/itchio/hush) and
[`go-itchio`](https://github.com/itchio/go-itchio) packages.

## Repository layout

```
shared/     language-neutral definitions both implementations are built and tested against
node/       the JavaScript/TypeScript package
python/     the Python package
docs/       generated API reference, published by GitHub Pages
```

[`shared/`](shared) is what keeps the two implementations honest:

- [`butler-schema.sql`](shared/butler-schema.sql) — the subset of butler's
  schema this library reads. butler has no checked-in DDL, since hades
  generates it at runtime from Go structs, so this was taken from a real
  `butler.db`. Both test suites build their fixture databases from it.
- [`definitions.json`](shared/definitions.json) — the vocabulary every
  implementation must agree on: strategy names, app variants, receipt paths,
  flavors, classifications, per-platform path templates. Each value cites the
  upstream source it came from. Both suites assert their own constants against
  it, so an implementation cannot quietly disagree.
- [`fixtures.json`](shared/fixtures.json) — the canonical test installation,
  and the results a correct implementation must produce for it. Both suites
  build it and check the same expectations.

The Python suite additionally runs a parity test that compares its output
against the JavaScript build on a real itch installation, skipping itself when
itch is absent.

## How it works

itch keeps two independent records of what you have installed, and this library
reads both.

- **`butler.db`** — a SQLite database in the itch user-data directory
  (`~/.config/itch/db/butler.db` on Linux). Its `install_locations` table is the
  only place the install locations are written down, and its `caves` table is
  itch's record of each installed game: which upload and build, when it was
  installed, how long you have played it, and the launchable executables butler
  found when it last scanned the folder.
- **Receipts** — itch writes a gzipped `.itch/receipt.json.gz` into every folder
  it installs a game into, describing the game, the upload and the extracted
  files. This is the on-disk source of truth. It survives a database reset, and
  it is what distinguishes an itch game folder from any other directory — which
  matters, because an install location is often a directory you keep other
  things in too.

Scanning an install location follows the same rules as butler's own
`install.locations.scan`: skip a folder named `downloads`, require a `.itch`
directory, then read `receipt.json.gz`, falling back to the pre-v23
uncompressed `receipt.json`. Resolving a game's folder follows butler's
`Cave.GetInstallFolder`: a `customInstallFolder` if set, otherwise the install
location's path joined with the install folder name.

Nothing is hard-coded: install locations come from the database (or, on older
itch versions, from `preferences.json`), and the itch directory itself is found
the way Electron resolves `app.getPath("userData")` on each platform.


## Where itch installs games

There is no standard games directory to look in. itch creates exactly one
install location out of the box — `appdata`, which is `apps/` inside its own
user-data directory:

| Platform | The `appdata` location |
| --- | --- |
| Linux | `~/.config/itch/apps` |
| macOS | `~/Library/Application Support/itch/apps` |
| Windows | `%APPDATA%\itch\apps` |

`appdata` is also the initial `defaultInstallLocation`. Every other location is
one the user added, stored under a random uuid with a path they chose — it
could be `~/Games`, `D:\itch`, an external drive, anything. That is why
this library reads the locations out of itch's own records rather than guessing,
and why several examples below show two locations: the built-in one and a
user-added one.


## Locating itch

itch builds two variants that install side by side and get separate Electron
`userData` directories: **itch** (stable) and **kitch** (canary, which is also
what a development build runs as). Both are searched, stable first.

`findItchPath()` checks, for each of `itch` and `kitch`:

- Windows: `%APPDATA%\<name>`, `%LOCALAPPDATA%\<name>`
- macOS: `~/Library/Application Support/<name>`
- Linux: `$XDG_CONFIG_HOME/<name>`, `~/.config/<name>`,
  `~/.var/app/io.<name>.<name>/config/<name>` (Flatpak)

`$ITCH_USER_DATA_DIR` and `$ITCH_APP_DIR` are checked first on every platform.
These are this library's own escape hatch for unusual installs — the itch app
does not read them. Prefer the `itchPath` option in code.

A candidate counts as an itch installation if it holds `db/butler.db`,
`preferences.json`, or an `apps/` directory.

The database is normally `db/butler.db`, but a build configured against a
non-standard itch.io host names it `db/butler-<host>.db`; `resolveDatabasePath()`
prefers the default name and falls back to whatever `butler*.db` is there.


## Edge cases handled

- An install location shared with non-itch directories — only folders carrying a
  receipt are reported, so `~/Games` holding both itch games and a Steam library
  works.
- itch's `downloads` staging folder inside an install location.
- Caves left behind after a game's folder is deleted outside the app
  (`checkExists`).
- Games installed outside every install location via `custom_install_folder`;
  these are grouped under a synthesized library entry.
- Games installed on disk that the database has no cave for, after a database
  reset or a folder copied in from another machine.
- The `appdata` install location — itch's only built-in one — which it derives
  from its own directory and never stores as a path.
- An install location the database has since forgotten — the cave's recorded
  `verdict.basePath` is used as a last resort.
- Reading the database while the itch app has it open in WAL mode; if the file
  itself cannot be opened, a private copy of the database and its journal is
  read instead.
- An unreadable or corrupt `butler.db` degrades to `preferences.json` plus a
  receipt scan rather than failing.
- The pre-v23 uncompressed `.itch/receipt.json`, whose schema recorded a cave's
  ids rather than the game — normalized into the same shape, with the raw ids
  kept under `receipt.legacy`.
- The `kitch` canary build, installed alongside stable itch.
- A `db/butler-<host>.db` from a build pointed at a non-standard itch.io host.


## Reading itch's data safely

The database is only ever opened read-only, and nothing in this library writes
to the itch directory or to any install folder.


## AI disclosure

This library was written by Claude Opus 5, Anthropic's model, in a
[Claude Code](https://claude.com/claude-code) session directed by the author.

Facts about itch's behaviour were checked against the upstream sources rather
than inferred from the local install: the [itch client](https://github.com/itchio/itch),
[butler](https://github.com/itchio/butler), and butler's
[`dash`](https://github.com/itchio/dash), [`hush`](https://github.com/itchio/hush) and
[`go-itchio`](https://github.com/itchio/go-itchio) packages. Where this README
describes what itch does — install folder resolution, the scan rules, the
receipt formats, the `appdata` default — it is describing code read in those
repositories.

Two limits are worth knowing:

- Everything has been run on Linux, against one real itch installation. The
  Windows, macOS and Flatpak path rules have their own tests — the lookup seam
  lets them be checked without running on those systems — but no code here has
  actually executed on Windows or macOS.
- The schema in [`shared/butler-schema.sql`](shared/butler-schema.sql) came
  from that same installation. butler generates its schema at runtime and ships
  no reference database, so it can drift from future butler releases without
  either test suite noticing.

