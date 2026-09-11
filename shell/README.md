# find-itch-games (POSIX shell)

Find the itch.io app, its install locations, and the games installed in them.

See the [root README](../README.md) for how itch stores its data, where it
installs games, and the shared definitions all three implementations are built
against. This page covers the shell API.

## Install

There is nothing to install — copy [`find-itch-games.sh`](find-itch-games.sh)
into your project, or keep it on `$PATH`. It is a single POSIX `sh` file,
verified under both `dash` and `bash`.

Unlike the Node and Python packages, which have no runtime dependencies, a
shell cannot read SQLite or JSON on its own, so three external tools are
required:

| Tool | Used for |
| --- | --- |
| `sqlite3` | reading `butler.db` |
| `jq` | parsing receipts, verdicts, and the database's JSON output |
| `gzip` | decompressing receipts |

The only shell extension relied on is `local`, which is absent from POSIX.1 but
implemented by dash, ash, ksh, bash and zsh.

## Usage

As a command:

```console
$ find-itch-games path
/home/you/.config/itch

$ find-itch-games apps
4225297	/home/you/Games/distributrains	db+receipt	Distributrains	distributrains		
1323129	/home/you/Games/godot-pck-explorer	db+receipt	Godot PCK Explorer	godot-pck-explorer	1.6.0	native-console-linux-64

$ find-itch-games app 4225297
/home/you/Games/distributrains

$ find-itch-games launch 4225297
/home/you/Games/distributrains/Distributrains/Distributrains64
```

Or sourced as a library:

```sh
. ./find-itch-games.sh

itch_path                     # the itch user-data directory
itch_database_path            # the butler database
itch_libraries                # id, path, default, exists, source
itch_library_paths            # just the paths
itch_apps [strategy]          # installed games, tab-separated
itch_apps_by_id <id>          # every install of a game, one path per line
itch_apps_by_name <name>      # every match, one path per line
itch_app_by_id <id>           # the first match
itch_app_by_name <name>       # the first match
itch_app_manifest <id>        # the merged cave/receipt record, as JSON
itch_launch_candidates <id>   # absolute paths butler found
itch_receipt <dir>            # an install folder's receipt, as JSON
itch_receipts <library>       # install folders under a location that have one
itch_has_app <id|name>        # exit status only
```

Every function prints to stdout and returns non-zero on failure. Lists are
tab-separated, one record per line.

### `itch_apps` output

```
game_id  path  source  title  install_folder_name  version  channel
```

Parse it with `awk -F'\t'`, **not** `read`: POSIX treats a tab as `IFS`
whitespace, so `read` folds runs of tabs together and a game with no title
would shift every later field left. The library parses its own output this way
for the same reason.

## Options

Configuration is by environment variable, which is the natural seam in a shell:

| Variable | Default | Meaning |
| --- | --- | --- |
| `ITCH_PATH` | auto-detected | Use this itch user-data directory instead of searching. |
| `ITCH_USER_DATA_DIR` | — | Checked before the platform defaults. As in the other implementations, itch itself does not read this. |
| `FIND_ITCH_HOME` | `$HOME` | Search as though this were the home directory. |
| `FIND_ITCH_PLATFORM` | from `uname -s` | `linux`, `darwin` or `win32`. |
| `ITCH_EXACT` | `true` | `false` matches names ignoring case, spacing and punctuation. |
| `ITCH_CHECK_EXISTS` | `true` | `false` keeps games whose install folder is gone. |

`FIND_ITCH_HOME` and `FIND_ITCH_PLATFORM` are this implementation's version of
the Node and Python packages' lookup seam. They exist mostly so the
per-platform path rules can be tested without running on those systems —
ordinary callers can simply run the script with a different `HOME`, which the
other two runtimes cannot do because they cache the home directory at startup.

### Strategies

`itch_apps` takes `merge` (default), `db` or `receipts`, with the same meanings
as in the other implementations. An unrecognised value is rejected rather than
being quietly treated as `merge`.

## Development

```bash
./tests/run-tests.sh          # also passes under: dash tests/run-tests.sh
shellcheck -x --shell=sh find-itch-games.sh tests/run-tests.sh
```

The tests build the installation described by
[`shared/fixtures.json`](../shared/fixtures.json) from the schema in
[`shared/butler-schema.sql`](../shared/butler-schema.sql), and check the
vocabulary in [`shared/definitions.json`](../shared/definitions.json) — the
same three files the Node and Python suites use. There is no test framework, so
there is nothing to install beyond the tools the library already needs.

There is no generated API reference for this implementation; `find-itch-games
help` and the comments in the script are the documentation.
