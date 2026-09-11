# find-itch-games (POSIX shell)

Find the itch.io app, its install locations, and the games installed in them.

See the [root README](../README.md) for how itch stores its data, where it
installs games, and the shared definitions all three implementations are built
against. This page covers the shell API.

## Install

With [bpkg](https://github.com/bpkg/bpkg), which this repository is marked up
for via [`bpkg.json`](../bpkg.json):

```bash
bpkg install sparr/find-itch-games            # into ./deps/bin
bpkg install -g sparr/find-itch-games         # into $PREFIX/bin
bpkg install -g sparr/find-itch-games@v0.1.1  # a specific release
```

bpkg checks out the git ref you name, so releases are `@v0.1.1` rather than
`@0.1.1` — the tags carry the `v`.

With `make`, which is also what bpkg's global install runs:

```bash
make -C shell install                 # into /usr/local/bin
make -C shell install PREFIX=~/.local # or wherever
make -C shell uninstall
```

Either way the command lands on `$PATH` as `find-itch-games`, without the
`.sh` — what you type is a command, and its implementation language is not
your concern.

Or simply copy [`find-itch-games.sh`](find-itch-games.sh) into your project and
source it. It is a single POSIX `sh` file, verified under both `dash` and
`bash`.

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

The command-line interface follows the
[GNU coding standards](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html):
long options with single-letter equivalents, options permitted anywhere among
the arguments, a `--` terminator, and the two standard options.

```console
$ find-itch-games path
/home/you/.config/itch

$ find-itch-games apps
4225297	/home/you/Games/distributrains	db+receipt	Distributrains	distributrains

$ find-itch-games --strategy db app 4225297
/home/you/Games/distributrains

$ find-itch-games launch 4225297
/home/you/Games/distributrains/Distributrains/Distributrains64
```

`--version` prints name, version, origin and legal status, with the version
number after the last space of the first line so it can be parsed:

```console
$ find-itch-games --version
find-itch-games 0.1.1
Copyright (C) 2026 Clarence "Sparr" Risher
License MIT: <https://opensource.org/license/mit>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
```

`--help` documents the invocation and ends with the bug address and home page:

```
Usage: find-itch-games [OPTION]... COMMAND [ARGUMENT]...
Find the itch.io app, its install locations, and the games installed in them.

Commands:
  path                     print the itch user-data directory
  db-path                  print the path of the butler database
  libraries                list install locations, tab-separated:
                             id, path, is_default, exists, source
  library-paths            list just the install location paths
  apps                     list installed games, tab-separated:
                             game_id, path, source, title,
                             install_folder_name, version, channel
  app ID-OR-NAME           print where one game is installed
  manifest ID              print the merged cave/receipt record, as JSON
  launch ID                print the launch candidates butler found
  receipt DIRECTORY        print an install folder's receipt, as JSON
  receipts LIBRARY         list install folders under LIBRARY that have one

Options:
  -s, --strategy=STRATEGY  which of itch's records to read: merge (default),
                             db, or receipts
  -p, --itch-path=DIR      use DIR as the itch user-data directory instead of
                             searching for it
  -H, --home=DIR           search as though the home directory were DIR
  -P, --platform=NAME      follow the conventions of NAME: linux, darwin,
                             or win32
  -e, --exact              match names exactly (default)
  -f, --fuzzy              match names ignoring case, spacing and punctuation
  -k, --keep-missing       keep games whose install folder no longer exists
  -h, --help               display this help and exit
  -V, --version            output version information and exit

Options may appear before or after the command. A '--' argument ends option
processing, so an operand beginning with '-' can still be passed.

Exit status:
  0  success
  1  itch or the requested game was not found
  2  a command-line usage error

Requires sqlite3, jq and gzip, because a shell cannot read SQLite or JSON on
its own.

Report bugs to: <https://github.com/sparr/find-itch-games/issues>
find-itch-games home page: <https://sparr.github.io/find-itch-games/>
```

Exit status is `0` on success, `1` when itch or the requested game was not
found, and `2` for a command-line usage error. Diagnostics are written to
stderr, prefixed with the program name.

### As a library

Source the file to use the functions directly:

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

## Options and environment

Every option has an environment variable equivalent, which is what the sourced
functions read. The options set these before dispatching, so the two are
interchangeable.

| Option | Variable | Default | Meaning |
| --- | --- | --- | --- |
| `-p`, `--itch-path=DIR` | `ITCH_PATH` | auto-detected | Use this itch user-data directory instead of searching. |
| — | `ITCH_USER_DATA_DIR` | — | Checked before the platform defaults. As in the other implementations, itch itself does not read this. |
| `-H`, `--home=DIR` | `FIND_ITCH_HOME` | `$HOME` | Search as though this were the home directory. |
| `-P`, `--platform=NAME` | `FIND_ITCH_PLATFORM` | from `uname -s` | `linux`, `darwin` or `win32`. |
| `-f`, `--fuzzy` | `ITCH_EXACT=false` | exact | Match names ignoring case, spacing and punctuation. |
| `-k`, `--keep-missing` | `ITCH_CHECK_EXISTS=false` | drop them | Keep games whose install folder is gone. |
| `-s`, `--strategy=NAME` | — | `merge` | Which of itch's records to read. |

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
make -C shell check           # or ./tests/run-tests.sh
make -C shell lint            # shellcheck
dash tests/run-tests.sh       # the suite also passes under dash
```

bpkg exposes the same two as package commands, runnable from a checkout with
`bpkg run test` and `bpkg run lint`.

The tests build the installation described by
[`shared/fixtures.json`](../shared/fixtures.json) from the schema in
[`shared/butler-schema.sql`](../shared/butler-schema.sql), and check the
vocabulary in [`shared/definitions.json`](../shared/definitions.json) — the
same three files the Node and Python suites use. There is no test framework, so
there is nothing to install beyond the tools the library already needs.

## Documentation

All of it comes from one set of `## \tag` comments in
[`find-itch-games.sh`](find-itch-games.sh), rendered by
[shellman](https://github.com/pawamoy/shellman):

```bash
./build-docs.sh
```

That writes three things, all committed, so shellman is only needed by someone
changing the documentation:

| Output | What it is |
| --- | --- |
| [`docs/shell/api/index.html`](https://sparr.github.io/find-itch-games/shell/api/) | The reference GitHub Pages serves. Each command links to the function that implements it. |
| [`docs/shell/api/index.md`](../docs/shell/api/index.md) | The same reference as markdown, which GitHub renders in-repo. |
| [`docs/shell/find-itch-games.1`](../docs/shell/find-itch-games.1) | A groff man page: `man ./docs/shell/find-itch-games.1`. |
| `itch_usage()` in the script | The `--help` text, written back into the source, so the program itself has no runtime dependency on shellman. |

Four of the templates in [`templates/`](templates) are copies of shellman's,
carrying its ISC notice in a comment header that does not reach the generated
output: `helptext`, `linked.md`, `linked_function.md` and `wikipage_toc.md`.
The rest are ours: `html` exists because
shellman ships no HTML template and Pages will not render markdown; `helptext`
drops
shellman's function reference, which belongs in the docs rather than in a
terminal and would otherwise make `--help` 403 lines instead of 96; `linked.md`
adds the command-to-function cross-links, which shellman does not do natively.

A test regenerates the help text and compares it to the committed heredoc, so
the two cannot drift. It skips itself where shellman is not installed.
