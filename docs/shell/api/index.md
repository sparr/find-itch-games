## find-itch-games.sh
Find the itch.io app, its install locations, and the games installed in them.

- [Usage](#usage)
- [Description](#description)
- [Options](#options)
- [Environment Variables](#environment-variables)
- [Exit Status](#exit-status)
- [Functions](#functions)
- [Examples](#examples)
- [Notes](#notes)
- [See Also](#see-also)

## Usage
- `find-itch-games [OPTION]... COMMAND [ARGUMENT]...
`

## Description
The only shell extension relied on is `local`, which is not in POSIX.1
but is implemented by dash, ash, ksh, bash and zsh.

Lists are tab-separated, one record per line. Parse them with awk -F&#39;\t&#39;,
not `read`: POSIX treats a tab as IFS whitespace, so `read` folds runs of
tabs together and a game with no title would shift every later field left.


## Options
- *`path`*:
  Print the itch user-data directory. See [itch_path](#itch_path).
- *`db-path`*:
  Print the path of the butler database. See [itch_database_path](#itch_database_path).
- *`libraries`*:
  List install locations, tab-separated: id, path, is_default, exists, source.
  See [itch_libraries](#itch_libraries).
- *`library-paths`*:
  List just the install location paths. See [itch_library_paths](#itch_library_paths).
- *`apps`*:
  List installed games, tab-separated: game_id, path, source, title,
  install_folder_name, version, channel. See [itch_apps](#itch_apps).
- *`app ID-OR-NAME`*:
  Print where one game is installed. See [itch_app_by_id](#itch_app_by_id) and [itch_app_by_name](#itch_app_by_name).
- *`manifest ID`*:
  Print the merged cave/receipt record, as JSON. See [itch_app_manifest](#itch_app_manifest).
- *`launch ID`*:
  Print the launch candidates butler found. See [itch_launch_candidates](#itch_launch_candidates).
- *`receipt DIRECTORY`*:
  Print an install folder&#39;s receipt, as JSON. See [itch_receipt](#itch_receipt).
- *`receipts LIBRARY`*:
  List install folders under LIBRARY that have one. See [itch_receipts](#itch_receipts).

- **`-s`**, **`--strategy`** *`=STRATEGY`*:
  Which of itch&#39;s records to read: merge (default), db, or receipts.
- **`-p`**, **`--itch-path`** *`=DIR`*:
  Use DIR as the itch user-data directory instead of searching for it.
- **`-H`**, **`--home`** *`=DIR`*:
  Search as though the home directory were DIR.
- **`-P`**, **`--platform`** *`=NAME`*:
  Follow the conventions of NAME: linux, darwin, or win32.
- **`-e`**, **`--exact`**:
  Match names exactly. This is the default.
- **`-f`**, **`--fuzzy`**:
  Match names ignoring case, spacing and punctuation.
- **`-k`**, **`--keep-missing`**:
  Keep games whose install folder no longer exists.
- **`-h`**, **`--help`**:
  Display this help and exit.
- **`-V`**, **`--version`**:
  Output version information and exit.

  Options may appear before or after the command. A &#39;--&#39; argument ends option
  processing, so an operand beginning with &#39;-&#39; can still be passed.


## Environment Variables
- *`ITCH_PATH`*:
  Use this itch user-data directory instead of searching.
- *`ITCH_USER_DATA_DIR`*:
  Checked before the platform defaults. The itch app does not read this.
- *`FIND_ITCH_HOME`*:
  Search as though this were the home directory.
- *`FIND_ITCH_PLATFORM`*:
  linux, darwin or win32.
- *`ITCH_EXACT`*:
  Set to false to match names loosely.
- *`ITCH_CHECK_EXISTS`*:
  Set to false to keep games whose install folder is gone.


## Exit Status
- **`0`**:
  Success.
- **`1`**:
  itch or the requested game was not found.
- **`2`**:
  A command-line usage error.


## Functions
### `itch_path_candidates`
Directories itch may keep its user data in, most specific first.

Mirrors Electron's app.getPath("userData") for each app
variant. ITCH_USER_DATA_DIR and ITCH_APP_DIR are this library's own escape
hatch; the itch app itself does not read them.

#### Return codes
- **`0`**: Always.

#### See also
- itch_path

#### Standard output
- One candidate directory per line, deduplicated.

---
### `itch_path`
Print the itch user-data directory.

#### Return codes
- **`0`**: If itch was found.
- **`1`**: If no candidate holds db/butler.db, preferences.json or apps/.

#### See also
- itch_path_candidates

#### Standard output
- The first candidate that looks like an itch installation.

---
### `itch_database_path [itch_path]`
Print the path of the butler database.

Allows for the butler-<host>.db name that builds
configured against a non-standard itch.io host use, falling back to the
default name when there is none on disk.

#### Arguments
- **`itch_path`**: The itch user-data directory. Defaults to itch_path.

#### Return codes
- **`0`**: If an itch directory was found.
- **`1`**: If it was not.

#### Standard output
- The database path.

---
### `itch_db_locations [database]`
Print the install locations recorded in butler.db.

#### Arguments
- **`database`**: The database path. Defaults to itch_database_path.

#### Return codes
- **`0`**: If the database was read.
- **`1`**: If no database was found.

#### Standard output
- Tab-separated: id, path.

---
### `itch_receipt <directory>`
Print an install folder's receipt as JSON.

Falls back to the pre-v23 uncompressed receipt.json,
whose schema recorded a cave's ids rather than the game; that shape is
normalized to the modern one with the ids kept under .legacy.

#### Arguments
- **`directory`**: An install folder.

#### Return codes
- **`0`**: If the folder has a readable receipt.
- **`1`**: If it does not.

#### Standard output
- The receipt, as compact JSON.

---
### `itch_receipts <library>`
List install folders under a location that carry a receipt.

Follows butler's own scan rules: skip the downloads
staging folder, require a .itch directory, then read the receipt.

#### Arguments
- **`library`**: An install location.

#### Return codes
- **`0`**: Always, including when the location does not exist.

#### Standard output
- One install folder path per line.

---
### `itch_libraries [itch_path]`
List itch's install locations.

butler.db is authoritative when readable;
preferences.json covers itch versions that predate it, and the built-in
appdata location is derived from the itch directory because itch never
stores it as a path.

#### Arguments
- **`itch_path`**: The itch user-data directory. Defaults to itch_path.

#### Return codes
- **`0`**: If an itch directory was found.
- **`1`**: If it was not.

#### Standard output
- Tab-separated: id, path, is_default, exists, source.

---
### `itch_library_paths [itch_path]`
List just the install location paths.

#### Arguments
- **`itch_path`**: The itch user-data directory. Defaults to itch_path.

#### Return codes
- **`0`**: If an itch directory was found.
- **`1`**: If it was not.

#### See also
- itch_libraries

#### Standard output
- One path per line.

---
### `itch_apps [strategy] [itch_path]`
List every installed game.

The strategy chooses which of itch's records to read.
merge reads butler.db and confirms each game against the receipt in its
install folder, then adds any receipt the database has no row for. db reads
butler.db only, and is the only source of play times, launch candidates and
custom install folders. receipts scans the install locations instead of
reading caves.

#### Arguments
- **`strategy`**: merge (default), db or receipts.
- **`itch_path`**: The itch user-data directory. Defaults to itch_path.

#### Return codes
- **`0`**: If the games were listed.
- **`1`**: If itch was not found, or the strategy is not one of the three.

#### Standard output
- Tab-separated: game_id, path, source, title, install_folder_name, version, channel.

---
### `itch_apps_paths_only <strategy> <itch_path>`
List the paths the database half of a strategy would report.

Used to avoid reporting a game twice when receipts are
scanned afterwards.

#### Arguments
- **`strategy`**: merge, db or receipts.
- **`itch_path`**: The itch user-data directory.

#### Return codes
- **`0`**: Always.

#### Standard output
- One install path per line.

---
### `itch_app_by_id <game_id> [strategy]`
Print where a game is installed, by itch.io game id.

#### Arguments
- **`game_id`**: An itch.io game id.
- **`strategy`**: Defaults to merge.

#### Return codes
- **`0`**: If the game is installed.
- **`1`**: If no id was given, or the game is not installed.

#### See also
- itch_apps_by_id

#### Standard output
- The install path of the first match.

---
### `itch_apps_by_id <game_id> [strategy]`
List every install of a game.

Usually zero or one, but itch will happily install the
same game into more than one location.

#### Arguments
- **`game_id`**: An itch.io game id.
- **`strategy`**: Defaults to merge.

#### Return codes
- **`0`**: Always.

#### Standard output
- One install path per line.

---
### `itch_app_by_name <name> [strategy]`
Print where a game is installed, by name.

Matches the title, url slug or install folder name.
Set ITCH_EXACT=false to ignore case, spacing and punctuation.

#### Arguments
- **`name`**: A title, url slug or install folder name.
- **`strategy`**: Defaults to merge.

#### Return codes
- **`0`**: If a game matched.
- **`1`**: If no name was given, or nothing matched.

#### See also
- itch_apps_by_name

#### Standard output
- The install path of the first match.

---
### `itch_apps_by_name <name> [strategy]`
List every installed game matching a name.

Parsed with awk rather than read, because IFS treats a
tab as whitespace: consecutive tabs would collapse into one, so a game with
no title would shift every later field left.

#### Arguments
- **`name`**: A title, url slug or install folder name.
- **`strategy`**: Defaults to merge.

#### Return codes
- **`0`**: Always.

#### Standard output
- One install path per line.

---
### `itch_has_app <game_id_or_name>`
Report whether a game is installed.

#### Arguments
- **`game_id_or_name`**: An itch.io game id, or a title, url slug or folder name.

#### Return codes
- **`0`**: If the game is installed.
- **`1`**: If it is not.

---
### `itch_app_manifest <game_id>`
Print the merged cave/receipt record for a game.

The itch answer to Steam's appmanifest_*.acf.

#### Arguments
- **`game_id`**: An itch.io game id.

#### Return codes
- **`0`**: If the game is installed.
- **`1`**: If it is not.

#### Standard output
- A JSON object with the game, its paths, the cave row, the receipt and butler's launch candidates.

---
### `itch_launch_candidates <game_id>`
Print the launch candidates butler found for a game.

#### Arguments
- **`game_id`**: An itch.io game id.

#### Return codes
- **`0`**: If the game is installed.
- **`1`**: If it is not.

#### See also
- itch_app_manifest

#### Standard output
- One absolute path per line, best first.

---
### `itch_version`
Print name, version, origin and legal status.

The first line is meant to be machine-parsable: the
version number proper starts after the last space.

#### Return codes
- **`0`**: Always.

#### Standard output
- Five lines, per the GNU coding standards.

---
### `itch_usage`
Print brief documentation for how to invoke the program.

#### Return codes
- **`0`**: Always.

#### Standard output
- A usage line, the commands, the options, the exit statuses, and the bug address and home page.

---
### `itch_main [option]... <command> [argument]...`
Parse options and dispatch a command.

Options are permitted anywhere among the arguments,
which is the GNU extension to the POSIX guidelines: each argument is either
consumed as an option or pushed to the back of the positional parameters, so
after one pass only the operands remain, in their original order.

#### Arguments
- **`option`**: Any option listed above.
- **`command`**: One of the commands listed above.

#### Return codes
- **`0`**: On success.
- **`1`**: If itch or the requested game was not found.
- **`2`**: On a command-line usage error.

#### Standard output
- Whatever the dispatched command prints.


## Examples
- **find-itch-games apps
List every installed game.**
- **find-itch-games --strategy db app 4225297
Print where one game is installed, reading butler.db only.**
- **. ./find-itch-games.sh &amp;&amp; itch_apps
Source the script and call the functions directly.
**

## Notes
Requires sqlite3, jq and gzip, because a shell cannot read SQLite or
JSON on its own.


## See Also
The Node and Python implementations, which read the same records:
&lt;https://github.com/sparr/find-itch-games&gt;

---
*Wiki page generated with [shellman](https://github.com/pawamoy/shellman).*
