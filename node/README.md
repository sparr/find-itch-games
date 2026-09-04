# find-itch-games (JavaScript / TypeScript)

Find the itch.io app, its install locations, and the games installed in them.

- npm: [`find-itch-games`](https://www.npmjs.com/package/find-itch-games)
- JSR: [`@sparr/find-itch-games`](https://jsr.io/@sparr/find-itch-games)
- GitHub Packages: `@sparr/find-itch-games`
- API reference: <https://sparr.github.io/find-itch-games/node/api/>

See the [root README](../README.md) for how itch stores its data, where it
installs games, and the shared definitions both language implementations are
built against. This page covers the JavaScript API.

Zero runtime dependencies — it reads itch's own `butler.db` through the
built-in `node:sqlite`.

## Install

```bash
npm i find-itch-games
```

Requires one of:

| Runtime | Minimum | Why |
| --- | --- | --- |
| Node | 22.5 | `node:sqlite` added |
| Deno | 2.2.0 | `node:sqlite`, including read-only databases |
| Bun | 1.4.0 | `node:sqlite` added |

The floor is set entirely by `node:sqlite`, which this library reads
`butler.db` through. Ships ESM and CommonJS; Deno can also consume the
TypeScript source from JSR:

```ts
import { findItch } from "jsr:@sparr/find-itch-games";
```


## Usage

```ts
import {
  findItch,
  findItchPath,
  findItchApps,
  findItchAppById,
  findItchAppByName,
  findItchAppManifest,
  findItchLibraries,
  findItchLibrariesPaths,
  getLaunchCandidatePaths,
  hasItchApp,
} from "find-itch-games";

await findItchPath();
// => '/home/you/.config/itch'

await findItchLibrariesPaths();
// => ['/home/you/.config/itch/apps',   // the built-in `appdata` location
//     '/home/you/Games']               // one the user added

await findItchAppById(4225297);
// => '/home/you/Games/distributrains'

await findItchAppByName("Distributrains");
// => '/home/you/Games/distributrains'
// the game's title, its url slug ("distributrains") and its install folder
// name all work

await hasItchApp(4225297);
// => true
```

### Looking games up by name

By default a name has to match the title, url slug or install folder name
exactly — the same spirit as `findSteamAppByName`, which matches a Steam
install directory exactly. Pass `exact: false` for a forgiving search that
ignores case, spacing and punctuation:

```ts
await findItchAppByName("Cosmic Collapse, a suika-like");   // exact title
await findItchAppByName("cosmic-collapse");                 // exact slug
await findItchAppByName("cosmic collapse", { exact: false }); // fuzzy
```

Two things can make a lookup ambiguous: a fuzzy search matching similarly named
games, and the same game legitimately being installed in two locations. Use the
plural forms to see every match, or `strict` to fail rather than guess:

```ts
const matches = await findItchAppsByName("reboot", { exact: false });
// => [{ gameId: 11, path: '.../re-boot', manifest: {...} },
//     { gameId: 22, path: '.../reboot',  manifest: {...} }]

await findItchAppsById(4225297);
// => every install of that game, usually one

await findItchAppByName("reboot", { exact: false });
// => picks the first match, deterministically

await findItchAppByName("reboot", { exact: false, strict: true });
// => throws AmbiguousAppError, with `.paths` listing both
```

`hasItchApp` takes the same options, so `hasItchApp(name, { exact: false })`
answers the fuzzy question.

### `findItch()`

The whole picture in one call:

```ts
const itch = await findItch();
// => {
//      itchPath: '/home/you/.config/itch',
//      databasePath: '/home/you/.config/itch/db/butler.db',
//      databaseAvailable: true,
//      strategy: 'merge',
//      libraries: [{
//        id: 'appdata',                        // the built-in location
//        path: '/home/you/.config/itch/apps',
//        isDefault: false,
//        exists: true,
//        source: 'db',
//        apps: []
//      }, {
//        id: '87c69020-7130-495e-a91e-fa146c0125df',  // user-added
//        path: '/home/you/Games',
//        isDefault: true,
//        exists: true,
//        source: 'db',
//        apps: [{
//          gameId: 4225297,
//          path: '/home/you/Games/distributrains',
//          receiptPath: '/home/you/Games/distributrains/.itch/receipt.json.gz',
//          manifest: { ... }
//        }]
//      }]
//    }
```

### `findItchAppManifest(gameId)`

The itch answer to Steam's `appmanifest_*.acf`: the cave row and the receipt,
merged and flattened.

```ts
const manifest = await findItchAppManifest(1323129);
// => {
//      gameId: 1323129,
//      caveId: '429e6fbe-527d-4964-9010-2e55a8dba9e2',
//      title: 'Godot PCK Explorer',
//      url: 'https://dmitriysalnikov.itch.io/godot-pck-explorer',
//      slug: 'godot-pck-explorer',
//      author: 'dmitriysalnikov',
//      classification: 'tool',
//      path: '/home/you/Games/godot-pck-explorer',
//      installFolderName: 'godot-pck-explorer',
//      installLocationId: '87c69020-7130-495e-a91e-fa146c0125df',
//      receiptPath: '.../.itch/receipt.json.gz',
//      uploadId: 11178280,
//      buildId: 1385998,
//      version: '1.6.0',
//      channelName: 'native-console-linux-64',
//      installedAt: '2026-08-29T03:10:36Z',
//      lastPlayedAt: ...,
//      secondsRun: 0,
//      installedSize: 15783510,
//      platforms: { windows: 'all', linux: 'all', osx: 'all' },
//      candidates: [{ path: 'GodotPCKExplorer.Console', flavor: 'linux', arch: 'amd64' }],
//      game: { ... }, upload: { ... }, build: { ... },
//      source: 'db+receipt'
//    }

getLaunchCandidatePaths(manifest);
// => ['/home/you/Games/godot-pck-explorer/GodotPCKExplorer.Console']
```

`candidates` is butler's own scan of the folder, so it is how you find the
binary to run without guessing. Each entry's `flavor` is one of `linux`,
`windows`, `macos`, `app-macos`, `script`, `jar`, `html`, and so on. It is empty
for games butler has not configured yet.


## Options

Every function takes the same options object.

| Option | Default | Meaning |
| --- | --- | --- |
| `itchPath` | auto-detected | Use this itch user-data directory instead of searching. |
| `strategy` | `"merge"` | Which of itch's records to read — see below. |
| `checkExists` | `true` | Drop games whose install folder no longer exists. |
| `extraLibraries` | `[]` | Additional install locations to scan. |
| `ignoreDatabase` | `false` | Never open `butler.db`, not even for install locations. |

The lookup functions take two more:

| Option | Default | Meaning |
| --- | --- | --- |
| `exact` | `true` | Name lookups only. `false` ignores case, spacing and punctuation. |
| `strict` | `false` | Throw `AmbiguousAppError` instead of returning the first of several matches. |

### Strategies

- **`merge`** — read `butler.db`, confirm each game against the receipt in its
  install folder, then add any receipt with no matching row. Most complete.
- **`db`** — read `butler.db` only. Fastest, and the only source of play times,
  launch candidates, pinning and custom install folders.
- **`receipts`** — ignore the `caves` table and scan the install locations for
  receipts. Useful when the database is stale. Install locations still come from
  the database, since nothing on disk records them.

`manifest.source` tells you which record each result came from: `"db"`,
`"receipt"` or `"db+receipt"`.

The valid values are exported as `ITCH_STRATEGIES`, so you can offer the choice
without hard-coding the list:

```ts
import { ITCH_STRATEGIES } from "find-itch-games";
// => ['merge', 'db', 'receipts']
```

Anything else throws a `TypeError`. Each strategy is defined by what it is
*not*, so an unrecognised value would otherwise satisfy every check and quietly
behave like `merge` — which TypeScript would catch, but a JavaScript caller
would not.

The array is frozen. It is the guard, not a registry: `findItch` dispatches on
these values directly, so appending to it would disable the check without
implementing anything, and the new value would fall through to `merge`.
Strategies pick between itch's two fixed records — butler.db and the on-disk
receipts — so there is nothing for a third-party strategy to be.


## Errors

- `ItchNotFoundError` — no itch user-data directory found.
- `AppNotFoundError` — thrown by `findItchAppById` / `findItchAppByName`.
- `AmbiguousAppError` — more than one installed game matched; only thrown when
  `strict` is set. Its `paths` lists every match.
- `ItchDatabaseError` — `butler.db` exists but cannot be read.
- `TypeError` — `strategy` was not one of `ITCH_STRATEGIES`.


## Publishing

The package targets three registries. They disagree about names, so it goes out
under two:

| Registry | Name | Manifest | What is published |
| --- | --- | --- | --- |
| [npm](https://www.npmjs.com/) | `find-itch-games` | `package.json` | Built `lib/` plus `src/` |
| [JSR](https://jsr.io/) | `@sparr/find-itch-games` | [`jsr.json`](jsr.json) | TypeScript source; JSR generates its own types |
| [GitHub Packages](https://github.com/features/packages) | `@sparr/find-itch-games` | `package.json`, rewritten at publish time | Same tarball as npm |

GitHub Packages only accepts names scoped to the owning account, so the
unscoped npm name cannot be used there.
[`scripts/publish-github.mjs`](scripts/publish-github.mjs) rewrites `name` and
`publishConfig`, publishes, and restores `package.json` in a `finally` — so a
failed publish cannot leave the scoped name behind.

```bash
npm run version:check    # package.json and jsr.json agree (also runs pre-publish)
npm run version:sync     # copy package.json's version into jsr.json

npm run publish:npm
npm run publish:jsr
npm run publish:github
```

`prepublishOnly` runs the version check, a clean rebuild and the full test suite,
so none of these can publish a stale or broken `lib/`.

Each registry needs its own credential:

- **npm** — `npm login`, or `NPM_TOKEN` in the environment.
- **JSR** — `npx jsr publish` opens a browser to authorise. The `@sparr` scope
  must exist first.
- **GitHub Packages** — a token with the `write:packages` scope, set as
  `//npm.pkg.github.com/:_authToken=…` in your user npm config. Note that the
  `gh` CLI's default token does **not** include `write:packages`; run
  `gh auth refresh -s write:packages`, or use a personal access token. Never
  commit that token — it belongs in your user config, not the repository.

Bumping a release means `npm version <level>` followed by `npm run version:sync`,
which copies the new version into `jsr.json` and into the Python package's
`__version__`. `npm run version:check` fails if any of the three disagree, and
runs before every publish. The two languages are versioned in lockstep — see
the [root README](../README.md).

Note that [`jsr.json`](jsr.json) accepts only `name`, `version`, `license`,
`exports` and `publish`. A package's description, its runtime compatibility and
its linked GitHub repository are **not** configured there — they are settings on
jsr.io, edited through the web interface, and putting them in the file has no
effect.


## Searching as another user

Every entry point accepts a `lookup`, and `findItchPath` /
`getItchPathCandidates` take one directly. It overrides the ambient home
directory, environment and platform that the search is based on:

```ts
import { getItchPathCandidates, findItchPath } from "find-itch-games";

// Where would itch be for a Windows user, from a mounted disk?
getItchPathCandidates({
  home: "/mnt/disk/Users/someone",
  env: { APPDATA: "/mnt/disk/Users/someone/AppData/Roaming" },
  platform: "win32",
});

await findItchPath({ home: "/mnt/disk/Users/someone" });
await findItch({ lookup: { home: "/mnt/disk/Users/someone" } });
```

Each field defaults to `os.homedir()`, `process.env` and `process.platform`, so
omitting them searches for the running user. `itchPath` takes precedence when
both are given, since it names the directory outright.


## Development

```bash
npm install
npm run build
npm test
npm run docs      # HTML API reference in docs/api
npm run docs:md   # the same as markdown, in docs/api-md
```

`npm install` also points `core.hooksPath` at [`.githooks`](../.githooks), whose
[pre-commit hook](../.githooks/pre-commit) rebuilds the API reference and stages it
whenever `src`, a tsconfig or a typedoc config is committed — so the checked-in
docs cannot fall behind the code. Skip it for one commit with
`git commit --no-verify`.

The hook builds from the *index*, not the working tree: it extracts the staged
content with `git checkout-index` into a scratch directory and runs TypeDoc
there. A partial staging therefore produces docs describing the commit being
made rather than whatever else is lying around, and an interrupted hook cannot
disturb the working tree the way `git stash` can.

[`test/fixtures.mjs`](test/fixtures.mjs) builds a synthetic itch installation —
a real SQLite `butler.db` with itch's schema, plus gzipped receipts on disk —
so the tests never touch a real itch install.

There are four TypeScript configs. [`tsconfig.json`](tsconfig.json) builds the
ESM output and [`tsconfig.cjs.json`](tsconfig.cjs.json) extends it for
CommonJS; both cover [`src`](src) only. The
[`test/tsconfig.json`](test/tsconfig.json) and
[`scripts/tsconfig.json`](scripts/tsconfig.json) files emit nothing and exist
so an editor's language server has a project to attach those files to —
without them it infers one, which loads neither `@types/node` nor the module
settings, and reports errors that the build never sees.

### Doc comments

Comments follow [TSDoc](https://tsdoc.org), rendered by
[TypeDoc](https://typedoc.org). TSDoc rather than JSDoc because the signature
already carries the types, so tags never repeat them: it is
`@param name - description`, not `@param {string} name`. `tsc` copies these
comments into `lib/esm/*.d.ts`, so they become hover tooltips for consumers.

Conventions:

- Every file opens with a `@module` comment; [`src/index.ts`](src/index.ts) uses
  `@packageDocumentation` instead, and becomes the front page of the generated
  docs.
- Block tags go in the order `@param`, `@returns`, `@throws`, `@defaultValue`,
  separated from the description by a blank line.
- Use `@defaultValue`, not JSDoc's `@default`.
- Reference other symbols with `{@link Name}` so they render as links —
  including in `@throws`, which takes `@throws {@link SomeError} when ...`
  rather than JSDoc's `@throws {SomeError}`.

[`typedoc.json`](typedoc.json) turns on TypeDoc's `notDocumented`,
`notExported` and
`invalidLink` validation, so a missing or broken doc comment shows up as a
build warning. `requiredToBeDocumented` deliberately omits `Property`: the
fields on `IItchGame`, `IItchUpload` and friends mirror itch.io's API one for
one, and demanding a comment on each would add noise rather than information.
Functions, classes, interfaces and type aliases must all be documented, and
the docs currently build with zero warnings.

