# find-itch-games (Python)

Find the itch.io app, its install locations, and the games installed in them.

- PyPI: [`find-itch-games`](https://pypi.org/project/find-itch-games/)
- API reference: <https://sparr.github.io/find-itch-games/python/api/>

See the [root README](https://github.com/sparr/find-itch-games/blob/main/README.md) for how itch stores its data, where it
installs games, and the shared definitions both language implementations are
built against. This page covers the Python API.

## Install

```bash
pip install find-itch-games
```

Requires Python 3.10 or newer. No runtime dependencies — `sqlite3`, `gzip` and
`json` are all in the standard library. Unlike the JavaScript package, whose
floor is set by `node:sqlite`, there is no version constraint beyond Python
itself.

## Usage

```python
import find_itch_games as fig

fig.find_itch_path()
# => PosixPath('/home/you/.config/itch')

fig.find_itch_libraries_paths()
# => [PosixPath('/home/you/.config/itch/apps'),   # the built-in `appdata` location
#     PosixPath('/home/you/Games')]               # one the user added

fig.find_itch_app_by_id(4225297)
# => PosixPath('/home/you/Games/distributrains')

fig.find_itch_app_by_name("Distributrains")
# => PosixPath('/home/you/Games/distributrains')
# the game's title, its url slug ("distributrains") and its install folder
# name all work

fig.has_itch_app(4225297)
# => True
```

Everything returns `pathlib.Path`, and the API is synchronous — unlike the
JavaScript package, which is `async` because Node's filesystem API is.

### Looking games up by name

By default a name must match the title, url slug or install folder name
exactly. Pass `exact=False` for a search that ignores case, spacing and
punctuation:

```python
fig.find_itch_app_by_name("Cosmic Collapse, a suika-like")    # exact title
fig.find_itch_app_by_name("cosmic-collapse")                  # exact slug
fig.find_itch_app_by_name("cosmic collapse", exact=False)     # fuzzy
```

A fuzzy search can match similarly named games, and the same game can be
installed in two locations. Use the plural forms to see every match, or
`strict=True` to fail rather than guess:

```python
fig.find_itch_apps_by_name("reboot", exact=False)   # -> list[App]
fig.find_itch_apps_by_id(4225297)                   # every install of that game

fig.find_itch_app_by_name("reboot", exact=False)                 # first match
fig.find_itch_app_by_name("reboot", exact=False, strict=True)    # raises AmbiguousAppError
```

### `find_itch()`

The whole picture in one call:

```python
itch = fig.find_itch()
# Libraries(
#   itch_path=PosixPath('/home/you/.config/itch'),
#   database_path=PosixPath('/home/you/.config/itch/db/butler.db'),
#   database_available=True,
#   strategy='merge',
#   libraries=[
#     Library(id='appdata', path=..., is_default=False, exists=True, source='db', apps=[]),
#     Library(id='87c69020-…', path=PosixPath('/home/you/Games'), is_default=True,
#             exists=True, source='db',
#             apps=[App(game_id=4225297, path=..., manifest=AppManifest(...))]),
#   ])
```

### `find_itch_app_manifest(game_id)`

The itch answer to Steam's `appmanifest_*.acf`: the cave row and the receipt,
merged and flattened into an `AppManifest` dataclass.

```python
manifest = fig.find_itch_app_manifest(1323129)
manifest.title          # 'Godot PCK Explorer'
manifest.slug           # 'godot-pck-explorer'
manifest.author         # 'dmitriysalnikov'
manifest.version        # '1.6.0'
manifest.channel_name   # 'native-console-linux-64'
manifest.installed_size # 15783510
manifest.source         # 'db+receipt'

fig.get_launch_candidate_paths(manifest)
# => [PosixPath('/home/you/Games/godot-pck-explorer/GodotPCKExplorer.Console')]
```

`candidates` is butler's own scan of the folder, so it is how you find the
binary to run without guessing. It is empty for games butler has not
configured yet.

## Options

Every entry point takes the same keyword arguments.

| Option | Default | Meaning |
| --- | --- | --- |
| `itch_path` | auto-detected | Use this itch user-data directory instead of searching. |
| `strategy` | `"merge"` | Which of itch's records to read — see below. |
| `check_exists` | `True` | Drop games whose install folder no longer exists. |
| `extra_libraries` | `None` | Additional install locations to scan. |
| `ignore_database` | `False` | Never open `butler.db`, not even for install locations. |
| `lookup` | `None` | A `PathLookup` — search as another user, environment or OS. |

The lookup functions take two more: `exact` (name lookups only) and `strict`.

### Strategies

- **`merge`** — read `butler.db`, confirm each game against the receipt in its
  install folder, then add any receipt with no matching row. Most complete.
- **`db`** — read `butler.db` only. Fastest, and the only source of play times,
  launch candidates and custom install folders.
- **`receipts`** — ignore the `caves` table and scan the install locations.
  Useful when the database is stale. Install locations still come from the
  database, since nothing on disk records them.

`manifest.source` tells you which record each result came from: `"db"`,
`"receipt"` or `"db+receipt"`. The valid strategies are exported as
`ITCH_STRATEGIES`; anything else raises `ValueError` rather than being silently
treated as `merge`.

## Searching as another user

`PathLookup` overrides the home directory, environment and platform the search
is based on — for scanning several user profiles, or a mounted disk:

```python
from find_itch_games import PathLookup, get_itch_path_candidates

get_itch_path_candidates(PathLookup(
    home="/mnt/disk/Users/someone",
    env={"APPDATA": "/mnt/disk/Users/someone/AppData/Roaming"},
    platform="win32",
))

fig.find_itch(lookup=PathLookup(home="/mnt/disk/Users/someone"))
```

Each field defaults to `Path.home()`, `os.environ` and `sys.platform`.

## Errors

- `ItchNotFoundError` — no itch user-data directory found.
- `AppNotFoundError` — raised by `find_itch_app_by_id` / `find_itch_app_by_name`.
- `AmbiguousAppError` — several games matched and `strict=True`; `.paths` lists them.
- `ItchDatabaseError` — `butler.db` exists but cannot be read.
- `ValueError` — `strategy` was not one of `ITCH_STRATEGIES`.

## Development

```bash
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/python -m pytest
```

The tests build the shared installation described by
[`shared/fixtures.json`](https://github.com/sparr/find-itch-games/blob/main/shared/fixtures.json), using the schema in
[`shared/butler-schema.sql`](https://github.com/sparr/find-itch-games/blob/main/shared/butler-schema.sql), and assert against
the vocabulary in [`shared/definitions.json`](https://github.com/sparr/find-itch-games/blob/main/shared/definitions.json) — the
same three files the JavaScript suite uses.

`tests/test_parity.py` additionally runs both implementations against the real
itch installation on the machine and compares their output. It skips itself
when itch is not installed, or when the JavaScript package has not been built.

The API reference is generated by [pdoc](https://pdoc.dev):

```bash
./build-docs.py          # writes ../docs/python/api
```

The pre-commit hook runs this automatically whenever `python/src` is committed,
so the published reference cannot fall behind the code.

Building and publishing use [hatchling](https://hatch.pypa.io/):

```bash
python -m build            # sdist + wheel into dist/
pipx run twine check dist/*
```

The version is single-sourced from `__version__` in
[`src/find_itch_games/__init__.py`](https://github.com/sparr/find-itch-games/blob/main/python/src/find_itch_games/__init__.py), and is
kept in lockstep with the JavaScript package by `npm run version:sync` in
[`node/`](https://github.com/sparr/find-itch-games/tree/main/node). Because Python was added after the first JavaScript
release, PyPI has no `0.1.0`.
