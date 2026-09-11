#!/bin/sh
# shellcheck shell=sh disable=SC3043  # `local` is not POSIX.1 but is universal in practice
#
## \brief Find the itch.io app, its install locations, and the games installed in them.
## \desc The only shell extension relied on is `local`, which is not in POSIX.1
## but is implemented by dash, ash, ksh, bash and zsh.
##
## Lists are tab-separated, one record per line. Parse them with awk -F'\t',
## not `read`: POSIX treats a tab as IFS whitespace, so `read` folds runs of
## tabs together and a game with no title would shift every later field left.
##
## \note Requires sqlite3, jq and gzip, because a shell cannot read SQLite or
## JSON on its own.
##
## \usage find-itch-games [OPTION]... COMMAND [ARGUMENT]...
##
## \option path
## Print the itch user-data directory. See itch_path.
## \option db-path
## Print the path of the butler database. See itch_database_path.
## \option libraries
## List install locations, tab-separated: id, path, is_default, exists, source.
## See itch_libraries.
## \option library-paths
## List just the install location paths. See itch_library_paths.
## \option apps
## List installed games, tab-separated: game_id, path, source, title,
## install_folder_name, version, channel. See itch_apps.
## \option app ID-OR-NAME
## Print where one game is installed. See itch_app_by_id and itch_app_by_name.
## \option manifest ID
## Print the merged cave/receipt record, as JSON. See itch_app_manifest.
## \option launch ID
## Print the launch candidates butler found. See itch_launch_candidates.
## \option receipt DIRECTORY
## Print an install folder's receipt, as JSON. See itch_receipt.
## \option receipts LIBRARY
## List install folders under LIBRARY that have one. See itch_receipts.
##
## \option -s, --strategy=STRATEGY
## Which of itch's records to read: merge (default), db, or receipts.
## \option -p, --itch-path=DIR
## Use DIR as the itch user-data directory instead of searching for it.
## \option -H, --home=DIR
## Search as though the home directory were DIR.
## \option -P, --platform=NAME
## Follow the conventions of NAME: linux, darwin, or win32.
## \option -e, --exact
## Match names exactly. This is the default.
## \option -f, --fuzzy
## Match names ignoring case, spacing and punctuation.
## \option -k, --keep-missing
## Keep games whose install folder no longer exists.
## \option -h, --help
## Display this help and exit.
## \option -V, --version
## Output version information and exit.
##
## Options may appear before or after the command. A '--' argument ends option
## processing, so an operand beginning with '-' can still be passed.
##
## \env ITCH_PATH
## Use this itch user-data directory instead of searching.
## \env ITCH_USER_DATA_DIR
## Checked before the platform defaults. The itch app does not read this.
## \env FIND_ITCH_HOME
## Search as though this were the home directory.
## \env FIND_ITCH_PLATFORM
## linux, darwin or win32.
## \env ITCH_EXACT
## Set to false to match names loosely.
## \env ITCH_CHECK_EXISTS
## Set to false to keep games whose install folder is gone.
##
## \exit 0
## Success.
## \exit 1
## itch or the requested game was not found.
## \exit 2
## A command-line usage error.
##
## \example find-itch-games apps
## \example-descr List every installed game.
## \example find-itch-games --strategy db app 4225297
## \example-descr Print where one game is installed, reading butler.db only.
## \example . ./find-itch-games.sh && itch_apps
## \example-descr Source the script and call the functions directly.
##
## \seealso The Node and Python implementations, which read the same records:
## <https://github.com/sparr/find-itch-games>

ITCH_APP_NAMES='itch kitch'
ITCH_STRATEGIES='merge db receipts'

# ---------------------------------------------------------------------------
# internals
# ---------------------------------------------------------------------------

_itch_die() {
    printf '%s\n' "find-itch-games: $*" >&2
    return 1
}

# Checks the external tools are present, naming the ones that are not.
_itch_require() {
    local missing tool
    missing=''
    for tool in "$@"; do
        command -v "$tool" >/dev/null 2>&1 || missing="$missing $tool"
    done
    [ -z "$missing" ] && return 0
    _itch_die "missing required tool(s):$missing"
}

# The operating system, spelled the way the other implementations spell it.
#
# FIND_ITCH_PLATFORM overrides it, which is how the per-platform path rules are
# tested without running on those systems.
_itch_platform() {
    if [ -n "${FIND_ITCH_PLATFORM:-}" ]; then
        printf '%s\n' "$FIND_ITCH_PLATFORM"
        return 0
    fi
    case "$(uname -s 2>/dev/null)" in
        Darwin) printf 'darwin\n' ;;
        CYGWIN*|MINGW*|MSYS*|Windows_NT) printf 'win32\n' ;;
        *) printf 'linux\n' ;;
    esac
}

# The home directory to resolve candidates against.
#
# Unlike the Node and Python packages, which need an explicit lookup argument
# because their runtimes cache the home directory, a shell subprocess can
# simply be given a different HOME. FIND_ITCH_HOME exists for callers that want
# to override it without disturbing the rest of the environment.
_itch_home() {
    printf '%s\n' "${FIND_ITCH_HOME:-$HOME}"
}

_itch_print_if_set() {
    [ -n "$1" ] && printf '%s\n' "$1"
    return 0
}

# ---------------------------------------------------------------------------
# locating itch
# ---------------------------------------------------------------------------

## \function itch_path_candidates
## \function-brief Directories itch may keep its user data in, most specific first.
## \function-description Mirrors Electron's app.getPath("userData") for each app
## variant. ITCH_USER_DATA_DIR and ITCH_APP_DIR are this library's own escape
## hatch; the itch app itself does not read them.
## \function-stdout One candidate directory per line, deduplicated.
## \function-return 0 Always.
## \function-seealso itch_path
itch_path_candidates() {
    local home platform app old_ifs
    # Defensive: a caller that has narrowed IFS would otherwise stop
    # $ITCH_APP_NAMES splitting, yielding one candidate named "itch kitch".
    old_ifs=$IFS
    IFS=' 	
'
    home=$(_itch_home)
    platform=$(_itch_platform)

    _itch_print_if_set "${ITCH_USER_DATA_DIR:-}"
    _itch_print_if_set "${ITCH_APP_DIR:-}"

    for app in $ITCH_APP_NAMES; do
        case "$platform" in
            win32)
                # Electron's appData on Windows is %APPDATA% (Roaming).
                [ -n "${APPDATA:-}" ] && printf '%s/%s\n' "$APPDATA" "$app"
                printf '%s/AppData/Roaming/%s\n' "$home" "$app"
                [ -n "${LOCALAPPDATA:-}" ] && printf '%s/%s\n' "$LOCALAPPDATA" "$app"
                ;;
            darwin)
                printf '%s/Library/Application Support/%s\n' "$home" "$app"
                ;;
            *)
                [ -n "${XDG_CONFIG_HOME:-}" ] && printf '%s/%s\n' "$XDG_CONFIG_HOME" "$app"
                printf '%s/.config/%s\n' "$home" "$app"
                # Flatpak redirects XDG_CONFIG_HOME inside the sandbox only.
                printf '%s/.var/app/io.%s.%s/config/%s\n' "$home" "$app" "$app" "$app"
                ;;
        esac
    done | awk '!seen[$0]++'
    IFS=$old_ifs
    return 0
}

# A candidate counts as an itch installation if it holds any of these.
_itch_looks_like_itch_path() {
    [ -d "$1" ] || return 1
    [ -f "$1/db/butler.db" ] || [ -f "$1/preferences.json" ] || [ -d "$1/apps" ]
}

## \function itch_path
## \function-brief Print the itch user-data directory.
## \function-stdout The first candidate that looks like an itch installation.
## \function-return 0 If itch was found.
## \function-return 1 If no candidate holds db/butler.db, preferences.json or apps/.
## \function-seealso itch_path_candidates
itch_path() {
    local candidate
    if [ -n "${ITCH_PATH:-}" ]; then
        _itch_looks_like_itch_path "$ITCH_PATH" || return 1
        printf '%s\n' "$ITCH_PATH"
        return 0
    fi

    # Fed by a here-doc rather than a pipe: a pipeline would run the loop in a
    # subshell, where `return` cannot exit this function. `IFS= read -r` keeps
    # paths containing spaces intact -- macOS's "Application Support" is one --
    # without disturbing IFS for anything else.
    while IFS= read -r candidate; do
        [ -n "$candidate" ] || continue
        if _itch_looks_like_itch_path "$candidate"; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done <<EOF
$(itch_path_candidates)
EOF
    return 1
}

## \function itch_database_path [itch_path]
## \function-brief Print the path of the butler database.
## \function-description Allows for the butler-<host>.db name that builds
## configured against a non-standard itch.io host use, falling back to the
## default name when there is none on disk.
## \function-argument itch_path The itch user-data directory. Defaults to itch_path.
## \function-stdout The database path.
## \function-return 0 If an itch directory was found.
## \function-return 1 If it was not.
itch_database_path() {
    local itch db alternate
    itch=${1:-$(itch_path)} || return 1
    [ -n "$itch" ] || return 1
    db="$itch/db/butler.db"
    if [ -f "$db" ]; then
        printf '%s\n' "$db"
        return 0
    fi
    for alternate in "$itch"/db/butler*.db; do
        if [ -f "$alternate" ]; then
            printf '%s\n' "$alternate"
            return 0
        fi
    done
    printf '%s\n' "$db"
}

# ---------------------------------------------------------------------------
# the database
# ---------------------------------------------------------------------------

# Runs a query against butler.db, read-only, emitting JSON.
#
# mode=ro rather than immutable=1: the latter ignores the write-ahead log and
# would silently miss any game installed since the last checkpoint.
_itch_query() {
    local db
    db=$1
    shift
    [ -f "$db" ] || return 1
    sqlite3 -json "file:$db?mode=ro" "$1" 2>/dev/null
}

## \function itch_db_locations [database]
## \function-brief Print the install locations recorded in butler.db.
## \function-argument database The database path. Defaults to itch_database_path.
## \function-stdout Tab-separated: id, path.
## \function-return 0 If the database was read.
## \function-return 1 If no database was found.
itch_db_locations() {
    local db json
    db=${1:-$(itch_database_path)} || return 1
    # Captured rather than piped: a pipeline's exit status is the last
    # command's, so `| jq` would report success even for a missing or
    # unreadable database.
    json=$(_itch_query "$db" 'SELECT id, path FROM install_locations') || return 1
    [ -n "$json" ] || return 0
    printf '%s' "$json" | jq -r '.[]? | [.id, .path] | @tsv'
}

# Every installed game the database knows about, as one JSON object per line.
#
# The query mirrors the one in the Node and Python packages; the canonical copy
# lives in ../shared/caves-query.sql, which the test suites check this against.
_itch_db_caves() {
    local db
    db=$1
    _itch_query "$db" '
        SELECT
          caves.id                    AS cave_id,
          caves.game_id               AS game_id,
          caves.upload_id             AS upload_id,
          caves.build_id              AS build_id,
          caves.install_location_id   AS install_location_id,
          caves.install_folder_name   AS install_folder_name,
          caves.custom_install_folder AS custom_install_folder,
          caves.installed_at          AS installed_at,
          caves.last_touched_at       AS last_touched_at,
          caves.local_last_run_at     AS local_last_run_at,
          caves.seconds_run           AS seconds_run,
          caves.installed_size        AS installed_size,
          caves.pinned                AS pinned,
          caves.verdict               AS verdict,
          games.url                   AS game_url,
          games.title                 AS game_title,
          games.classification        AS game_classification,
          uploads.channel_name        AS upload_channel_name,
          builds.user_version         AS build_user_version
        FROM caves
        LEFT JOIN games   ON games.id   = caves.game_id
        LEFT JOIN uploads ON uploads.id = caves.upload_id
        LEFT JOIN builds  ON builds.id  = caves.build_id
    ' | jq -c '.[]?'
}

# ---------------------------------------------------------------------------
# receipts
# ---------------------------------------------------------------------------

ITCH_RECEIPT_DIR='.itch'

## \function itch_receipt <directory>
## \function-brief Print an install folder's receipt as JSON.
## \function-description Falls back to the pre-v23 uncompressed receipt.json,
## whose schema recorded a cave's ids rather than the game; that shape is
## normalized to the modern one with the ids kept under .legacy.
## \function-argument directory An install folder.
## \function-stdout The receipt, as compact JSON.
## \function-return 0 If the folder has a readable receipt.
## \function-return 1 If it does not.
itch_receipt() {
    local dir modern legacy json
    dir=$1
    modern="$dir/$ITCH_RECEIPT_DIR/receipt.json.gz"
    legacy="$dir/$ITCH_RECEIPT_DIR/receipt.json"

    if [ -f "$modern" ]; then
        # butler always gzips, but a hand-edited receipt may not be, so fall
        # back to reading it as-is.
        json=$(gzip -dc "$modern" 2>/dev/null || cat "$modern" 2>/dev/null)
        if printf '%s' "$json" | jq -e '.game.id | numbers' >/dev/null 2>&1; then
            printf '%s\n' "$json" | jq -c .
            return 0
        fi
    fi

    [ -f "$legacy" ] || return 1
    json=$(cat "$legacy" 2>/dev/null) || return 1

    # Some builds wrote the modern shape uncompressed to this path.
    if printf '%s' "$json" | jq -e '.game.id | numbers' >/dev/null 2>&1; then
        printf '%s\n' "$json" | jq -c .
        return 0
    fi

    printf '%s' "$json" | jq -ce '
        select(.cave.gameId | numbers) |
        {
          game: { id: .cave.gameId },
          upload: (if .cave.uploadId then { id: .cave.uploadId } else null end),
          build: (if (.cave.buildId // 0) != 0 then { id: .cave.buildId } else null end),
          files: (.files // []),
          legacy: .cave
        }' 2>/dev/null || return 1
}

## \function itch_receipts <library>
## \function-brief List install folders under a location that carry a receipt.
## \function-description Follows butler's own scan rules: skip the downloads
## staging folder, require a .itch directory, then read the receipt.
## \function-argument library An install location.
## \function-stdout One install folder path per line.
## \function-return 0 Always, including when the location does not exist.
itch_receipts() {
    local library entry name
    library=$1
    [ -d "$library" ] || return 0
    for entry in "$library"/*; do
        [ -d "$entry" ] || continue
        name=${entry##*/}
        [ "$name" = 'downloads' ] && continue
        [ -d "$entry/$ITCH_RECEIPT_DIR" ] || continue
        itch_receipt "$entry" >/dev/null 2>&1 && printf '%s\n' "$entry"
    done
    return 0
}

# ---------------------------------------------------------------------------
# install locations
# ---------------------------------------------------------------------------

## \function itch_libraries [itch_path]
## \function-brief List itch's install locations.
## \function-description butler.db is authoritative when readable;
## preferences.json covers itch versions that predate it, and the built-in
## appdata location is derived from the itch directory because itch never
## stores it as a path.
## \function-argument itch_path The itch user-data directory. Defaults to itch_path.
## \function-stdout Tab-separated: id, path, is_default, exists, source.
## \function-return 0 If an itch directory was found.
## \function-return 1 If it was not.
itch_libraries() {
    local itch db prefs default seen id path source
    itch=${1:-$(itch_path)} || return 1
    [ -n "$itch" ] || return 1
    db=$(itch_database_path "$itch")
    prefs="$itch/preferences.json"

    default=''
    [ -f "$prefs" ] && default=$(jq -r '.defaultInstallLocation // empty' "$prefs" 2>/dev/null)

    seen=''
    {
        itch_db_locations "$db" 2>/dev/null | sed 's/$/\tdb/'
        [ -f "$prefs" ] && jq -r '
            (.installLocations // {}) | to_entries[]
            | [.key, (if (.value | type) == "string" then .value else .value.path end), "preferences"]
            | @tsv' "$prefs" 2>/dev/null
        printf 'appdata\t%s/apps\tappdata\n' "$itch"
    } | while IFS="$(printf '\t')" read -r id path source; do
        [ -n "$id" ] && [ -n "$path" ] || continue
        # First source wins; they arrive most-authoritative first.
        case ":$seen:" in
            *":$path:"*) continue ;;
        esac
        seen="$seen:$path"
        printf '%s\t%s\t%s\t%s\t%s\n' \
            "$id" "$path" \
            "$([ "$id" = "$default" ] && echo true || echo false)" \
            "$([ -d "$path" ] && echo true || echo false)" \
            "$source"
    done
}

## \function itch_library_paths [itch_path]
## \function-brief List just the install location paths.
## \function-argument itch_path The itch user-data directory. Defaults to itch_path.
## \function-stdout One path per line.
## \function-return 0 If an itch directory was found.
## \function-return 1 If it was not.
## \function-seealso itch_libraries
# shellcheck disable=SC2120  # the optional itch path is forwarded to itch_libraries
itch_library_paths() {
    local rows
    # Captured rather than piped, for the same reason: `| cut` would mask a
    # failure to find itch behind cut's success.
    rows=$(itch_libraries "$@") || return 1
    [ -n "$rows" ] || return 0
    printf '%s\n' "$rows" | cut -f2
}

# ---------------------------------------------------------------------------
# installed games
# ---------------------------------------------------------------------------

_itch_validate_strategy() {
    case " $ITCH_STRATEGIES " in
        *" $1 "*) return 0 ;;
    esac
    # Every strategy is defined by what it is not, so an unrecognised value
    # would otherwise satisfy each check and quietly behave like merge.
    _itch_die "unknown strategy '$1'; expected one of: $ITCH_STRATEGIES"
}

# Resolves where a cave's files are, from one cave JSON object on stdin.
#
# custom_install_folder wins, then the install location plus folder name, and
# finally the base path butler recorded when it last scanned the folder -- the
# only hint left if the install location has been removed.
_itch_cave_path() {
    local cave locations custom location_id folder library base
    cave=$1
    locations=$2

    custom=$(printf '%s' "$cave" | jq -r '.custom_install_folder // "" | select(. != "")')
    if [ -n "$custom" ]; then
        printf '%s\n' "$custom"
        return 0
    fi

    location_id=$(printf '%s' "$cave" | jq -r '.install_location_id // ""')
    folder=$(printf '%s' "$cave" | jq -r '.install_folder_name // ""')
    if [ -n "$location_id" ] && [ -n "$folder" ]; then
        library=$(printf '%s' "$locations" | awk -F'\t' -v id="$location_id" '$1 == id { print $2; exit }')
        if [ -n "$library" ]; then
            printf '%s/%s\n' "$library" "$folder"
            return 0
        fi
    fi

    base=$(printf '%s' "$cave" | jq -r '(.verdict // "" | if . == "" then {} else fromjson end).basePath // ""')
    [ -n "$base" ] || return 1
    printf '%s\n' "$base"
}

## \function itch_apps [strategy] [itch_path]
## \function-brief List every installed game.
## \function-description The strategy chooses which of itch's records to read.
## merge reads butler.db and confirms each game against the receipt in its
## install folder, then adds any receipt the database has no row for. db reads
## butler.db only, and is the only source of play times, launch candidates and
## custom install folders. receipts scans the install locations instead of
## reading caves.
## \function-argument strategy merge (default), db or receipts.
## \function-argument itch_path The itch user-data directory. Defaults to itch_path.
## \function-stdout Tab-separated: game_id, path, source, title, install_folder_name, version, channel.
## \function-return 0 If the games were listed.
## \function-return 1 If itch was not found, or the strategy is not one of the three.
itch_apps() {
    local strategy itch locations check_exists cave game_id path title
    local folder version channel source seen library receipt
    strategy=${1:-merge}
    _itch_validate_strategy "$strategy" || return 1
    itch=${2:-$(itch_path)} || return 1
    [ -n "$itch" ] || return 1
    check_exists=${ITCH_CHECK_EXISTS:-true}

    locations=$(itch_libraries "$itch")
    seen=''

    if [ "$strategy" != 'receipts' ]; then
        _itch_db_caves "$(itch_database_path "$itch")" 2>/dev/null |
        while IFS= read -r cave; do
            [ -n "$cave" ] || continue
            path=$(_itch_cave_path "$cave" "$locations") || continue
            [ "$check_exists" = 'true' ] && [ ! -d "$path" ] && continue

            game_id=$(printf '%s' "$cave" | jq -r '.game_id')
            title=$(printf '%s' "$cave" | jq -r '.game_title // ""')
            folder=$(printf '%s' "$cave" | jq -r '.install_folder_name // ""')
            version=$(printf '%s' "$cave" | jq -r '.build_user_version // ""')
            channel=$(printf '%s' "$cave" | jq -r '.upload_channel_name // ""')
            source='db'
            if [ "$strategy" != 'db' ] && itch_receipt "$path" >/dev/null 2>&1; then
                source='db+receipt'
            fi
            [ -n "$folder" ] || folder=${path##*/}
            printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
                "$game_id" "$path" "$source" "$title" "$folder" "$version" "$channel"
        done
    fi

    [ "$strategy" = 'db' ] && return 0

    # Receipts the database has no cave for: reinstalled after a reset, or a
    # folder copied in from another machine.
    seen=$(itch_apps_paths_only "$strategy" "$itch")
    printf '%s' "$locations" | cut -f2 | while IFS= read -r library; do
        [ -d "$library" ] || continue
        itch_receipts "$library" | while IFS= read -r path; do
            case "
$seen
" in
                *"
$path
"*) continue ;;
            esac
            receipt=$(itch_receipt "$path") || continue
            printf '%s\t%s\treceipt\t%s\t%s\t\t%s\n' \
                "$(printf '%s' "$receipt" | jq -r '.game.id')" \
                "$path" \
                "$(printf '%s' "$receipt" | jq -r '.game.title // ""')" \
                "${path##*/}" \
                "$(printf '%s' "$receipt" | jq -r '.upload.channelName // ""')"
        done
    done
    return 0
}

## \function itch_apps_paths_only <strategy> <itch_path>
## \function-brief List the paths the database half of a strategy would report.
## \function-description Used to avoid reporting a game twice when receipts are
## scanned afterwards.
## \function-argument strategy merge, db or receipts.
## \function-argument itch_path The itch user-data directory.
## \function-stdout One install path per line.
## \function-return 0 Always.
itch_apps_paths_only() {
    local strategy itch locations cave path
    strategy=$1
    itch=$2
    [ "$strategy" = 'receipts' ] && return 0
    locations=$(itch_libraries "$itch")
    _itch_db_caves "$(itch_database_path "$itch")" 2>/dev/null |
    while IFS= read -r cave; do
        [ -n "$cave" ] || continue
        path=$(_itch_cave_path "$cave" "$locations") || continue
        [ "${ITCH_CHECK_EXISTS:-true}" = 'true' ] && [ ! -d "$path" ] && continue
        printf '%s\n' "$path"
    done
}

# ---------------------------------------------------------------------------
# lookups
# ---------------------------------------------------------------------------

# Normalizes a name for the fuzzy comparison: lowercase, alphanumerics only.
_itch_normalize() {
    printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]'
}

## \function itch_app_by_id <game_id> [strategy]
## \function-brief Print where a game is installed, by itch.io game id.
## \function-argument game_id An itch.io game id.
## \function-argument strategy Defaults to merge.
## \function-stdout The install path of the first match.
## \function-return 0 If the game is installed.
## \function-return 1 If no id was given, or the game is not installed.
## \function-seealso itch_apps_by_id
itch_app_by_id() {
    local id match
    id=$1
    [ -n "$id" ] || { _itch_die 'itch_app_by_id: a game id is required'; return 1; }
    match=$(itch_apps "${2:-merge}" | awk -F'\t' -v id="$id" '$1 == id { print $2 }')
    [ -n "$match" ] || return 1
    printf '%s\n' "$match" | head -n 1
}

## \function itch_apps_by_id <game_id> [strategy]
## \function-brief List every install of a game.
## \function-description Usually zero or one, but itch will happily install the
## same game into more than one location.
## \function-argument game_id An itch.io game id.
## \function-argument strategy Defaults to merge.
## \function-stdout One install path per line.
## \function-return 0 Always.
itch_apps_by_id() {
    itch_apps "${2:-merge}" | awk -F'\t' -v id="$1" '$1 == id { print $2 }'
}

## \function itch_app_by_name <name> [strategy]
## \function-brief Print where a game is installed, by name.
## \function-description Matches the title, url slug or install folder name.
## Set ITCH_EXACT=false to ignore case, spacing and punctuation.
## \function-argument name A title, url slug or install folder name.
## \function-argument strategy Defaults to merge.
## \function-stdout The install path of the first match.
## \function-return 0 If a game matched.
## \function-return 1 If no name was given, or nothing matched.
## \function-seealso itch_apps_by_name
itch_app_by_name() {
    local name match
    name=$1
    [ -n "$name" ] || { _itch_die 'itch_app_by_name: a name is required'; return 1; }
    match=$(itch_apps_by_name "$name" "${2:-merge}")
    [ -n "$match" ] || return 1
    printf '%s\n' "$match" | head -n 1
}

## \function itch_apps_by_name <name> [strategy]
## \function-brief List every installed game matching a name.
## \function-description Parsed with awk rather than read, because IFS treats a
## tab as whitespace: consecutive tabs would collapse into one, so a game with
## no title would shift every later field left.
## \function-argument name A title, url slug or install folder name.
## \function-argument strategy Defaults to merge.
## \function-stdout One install path per line.
## \function-return 0 Always.
itch_apps_by_name() {
    local name strategy exact
    name=$1
    strategy=${2:-merge}
    exact=${ITCH_EXACT:-true}

    itch_apps "$strategy" | awk -F'\t' -v want="$name" -v exact="$exact" '
        function norm(s) { s = tolower(s); gsub(/[^a-z0-9]/, "", s); return s }
        {
            n = split($2, segments, "/")
            slug = segments[n]
            wanted = (exact == "false") ? norm(want) : want
            for (i = 1; i <= 3; i++) {
                candidate = (i == 1 ? $4 : (i == 2 ? slug : $5))
                if (candidate == "") continue
                if (((exact == "false") ? norm(candidate) : candidate) == wanted) {
                    print $2
                    next
                }
            }
        }'
}

## \function itch_has_app <game_id_or_name>
## \function-brief Report whether a game is installed.
## \function-argument game_id_or_name An itch.io game id, or a title, url slug or folder name.
## \function-return 0 If the game is installed.
## \function-return 1 If it is not.
itch_has_app() {
    local query
    query=$1
    case "$query" in
        ''|*[!0-9]*) [ -n "$(itch_apps_by_name "$query")" ] ;;
        *)           [ -n "$(itch_apps_by_id "$query")" ] ;;
    esac
}

## \function itch_app_manifest <game_id>
## \function-brief Print the merged cave/receipt record for a game.
## \function-description The itch answer to Steam's appmanifest_*.acf.
## \function-argument game_id An itch.io game id.
## \function-stdout A JSON object with the game, its paths, the cave row, the receipt and butler's launch candidates.
## \function-return 0 If the game is installed.
## \function-return 1 If it is not.
itch_app_manifest() {
    local id row path receipt cave
    id=$1
    row=$(itch_apps merge | awk -F'\t' -v id="$id" '$1 == id { print; exit }')
    [ -n "$row" ] || return 1
    path=$(printf '%s' "$row" | cut -f2)
    cave=$(_itch_db_caves "$(itch_database_path)" 2>/dev/null |
        jq -c --argjson id "$id" 'select(.game_id == $id)' | head -n 1)
    receipt=$(itch_receipt "$path" 2>/dev/null || printf 'null')

    printf '%s' "$row" | jq -Rc --argjson receipt "${receipt:-null}" \
        --argjson cave "${cave:-null}" '
        split("\t") as $f | {
          gameId: ($f[0] | tonumber),
          path: $f[1],
          source: $f[2],
          title: (if $f[3] == "" then null else $f[3] end),
          installFolderName: $f[4],
          version: (if $f[5] == "" then null else $f[5] end),
          channelName: (if $f[6] == "" then null else $f[6] end),
          candidates: (($cave.verdict // "" | if . == "" then {} else fromjson end).candidates // []),
          cave: $cave,
          receipt: $receipt
        }'
}

## \function itch_launch_candidates <game_id>
## \function-brief Print the launch candidates butler found for a game.
## \function-argument game_id An itch.io game id.
## \function-stdout One absolute path per line, best first.
## \function-return 0 If the game is installed.
## \function-return 1 If it is not.
## \function-seealso itch_app_manifest
itch_launch_candidates() {
    local id manifest
    id=$1
    manifest=$(itch_app_manifest "$id") || return 1
    printf '%s' "$manifest" | jq -r '.path as $p | .candidates[]? | "\($p)/\(.path)"'
}

# ---------------------------------------------------------------------------
# command line
# ---------------------------------------------------------------------------

# The canonical program name, as a constant. The GNU standards ask for this
# rather than deriving it from $0, which is a file name and may be anything.
ITCH_PROGRAM_NAME='find-itch-games'
ITCH_VERSION='0.1.1'

# Exit statuses. 2 for a usage error keeps it distinguishable from a lookup
# that simply found nothing, which is an ordinary failure.
#
ITCH_EX_OK=0
# shellcheck disable=SC2034  # names the contract; failures propagate naturally
ITCH_EX_FAILURE=1
ITCH_EX_USAGE=2

## \function itch_version
## \function-brief Print name, version, origin and legal status.
## \function-description The first line is meant to be machine-parsable: the
## version number proper starts after the last space.
## \function-stdout Five lines, per the GNU coding standards.
## \function-return 0 Always.
itch_version() {
    cat <<VERSION
$ITCH_PROGRAM_NAME $ITCH_VERSION
Copyright (C) 2026 Clarence "Sparr" Risher
License MIT: <https://opensource.org/license/mit>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
VERSION
}

## \function itch_usage
## \function-brief Print brief documentation for how to invoke the program.
## \function-stdout A usage line, the commands, the options, the exit statuses, and the bug address and home page.
## \function-return 0 Always.
itch_usage() {
    cat <<'USAGE'
Usage: find-itch-games [OPTION]... COMMAND [ARGUMENT]...


Find the itch.io app, its install locations, and the games installed in them.

Options:
  path                  Print the itch user-data directory. See itch_path.
  db-path               Print the path of the butler database. See
                        itch_database_path.
  libraries             List install locations, tab-separated: id, path,
                        is_default, exists, source. See
                        itch_libraries.
  library-paths         List just the install location paths. See
                        itch_library_paths.
  apps                  List installed games, tab-separated: game_id, path,
                        source, title,
                        install_folder_name, version,
                        channel. See itch_apps.
  app ID-OR-NAME        Print where one game is installed. See itch_app_by_id
                        and itch_app_by_name.
  manifest ID           Print the merged cave/receipt record, as JSON. See
                        itch_app_manifest.
  launch ID             Print the launch candidates butler found. See
                        itch_launch_candidates.
  receipt DIRECTORY     Print an install folder's receipt, as JSON. See
                        itch_receipt.
  receipts LIBRARY      List install folders under LIBRARY that have one. See
                        itch_receipts.

  -s, --strategy =STRATEGY 
                        Which of itch's records to read: merge (default), db,
                        or receipts.
  -p, --itch-path =DIR  Use DIR as the itch user-data directory instead of
                        searching for it.
  -H, --home =DIR       Search as though the home directory were DIR.
  -P, --platform =NAME  Follow the conventions of NAME: linux, darwin, or
                        win32.
  -e, --exact           Match names exactly. This is the default.
  -f, --fuzzy           Match names ignoring case, spacing and punctuation.
  -k, --keep-missing    Keep games whose install folder no longer exists.
  -h, --help            Display this help and exit.
  -V, --version         Output version information and exit.

                        Options may appear before or after the command. A '--'
                        argument ends option processing, so an operand
                        beginning with '-' can still be passed.


Environment Variables:
  ITCH_PATH
    Use this itch user-data directory instead of searching.
  ITCH_USER_DATA_DIR
    Checked before the platform defaults. The itch app does not read this.
  FIND_ITCH_HOME
    Search as though this were the home directory.
  FIND_ITCH_PLATFORM
    linux, darwin or win32.
  ITCH_EXACT
    Set to false to match names loosely.
  ITCH_CHECK_EXISTS
    Set to false to keep games whose install folder is gone.


Exit Status:
  0
    Success.
  1
    itch or the requested game was not found.
  2
    A command-line usage error.


Examples:
  find-itch-games apps
    List every installed game.

  find-itch-games --strategy db app 4225297
    Print where one game is installed, reading butler.db only.

  . ./find-itch-games.sh && itch_apps
    Source the script and call the functions directly.


Requires sqlite3, jq and gzip, because a shell cannot read SQLite or JSON on
its own.


Report bugs to: <https://github.com/sparr/find-itch-games/issues>
find-itch-games home page: <https://sparr.github.io/find-itch-games/>
USAGE
}

# Reports a usage error the way GNU programs do: a diagnostic naming the
# program, on stderr, and a pointer to --help.
itch_usage_error() {
    printf '%s: %s\n' "$ITCH_PROGRAM_NAME" "$1" >&2
    printf "Try '%s --help' for more information.\n" "$ITCH_PROGRAM_NAME" >&2
    return "$ITCH_EX_USAGE"
}

## \function itch_main [option]... <command> [argument]...
## \function-brief Parse options and dispatch a command.
## \function-description Options are permitted anywhere among the arguments,
## which is the GNU extension to the POSIX guidelines: each argument is either
## consumed as an option or pushed to the back of the positional parameters, so
## after one pass only the operands remain, in their original order.
## \function-argument option Any option listed above.
## \function-argument command One of the commands listed above.
## \function-stdout Whatever the dispatched command prints.
## \function-return 0 On success.
## \function-return 1 If itch or the requested game was not found.
## \function-return 2 On a command-line usage error.
itch_main() {
    local argc arg value command strategy
    strategy='merge'

    argc=$#
    while [ "$argc" -gt 0 ]; do
        arg=$1
        shift
        argc=$((argc - 1))

        case "$arg" in
            --)
                # Everything after this is an operand, even if it looks like
                # an option.
                while [ "$argc" -gt 0 ]; do
                    set -- "$@" "$1"
                    shift
                    argc=$((argc - 1))
                done
                ;;
            --*=*)
                value=${arg#*=}
                case "${arg%%=*}" in
                    --strategy)  strategy=$value ;;
                    --itch-path) ITCH_PATH=$value; export ITCH_PATH ;;
                    --home)      FIND_ITCH_HOME=$value; export FIND_ITCH_HOME ;;
                    --platform)  FIND_ITCH_PLATFORM=$value; export FIND_ITCH_PLATFORM ;;
                    *) itch_usage_error "unrecognized option '${arg%%=*}'"; return $? ;;
                esac
                ;;
            --strategy|--itch-path|--home|--platform|-s|-p|-H|-P)
                if [ "$argc" -eq 0 ]; then
                    itch_usage_error "option '$arg' requires an argument"
                    return $?
                fi
                value=$1
                shift
                argc=$((argc - 1))
                case "$arg" in
                    --strategy|-s)  strategy=$value ;;
                    --itch-path|-p) ITCH_PATH=$value; export ITCH_PATH ;;
                    --home|-H)      FIND_ITCH_HOME=$value; export FIND_ITCH_HOME ;;
                    --platform|-P)  FIND_ITCH_PLATFORM=$value; export FIND_ITCH_PLATFORM ;;
                esac
                ;;
            --exact|-e)        ITCH_EXACT=true; export ITCH_EXACT ;;
            --fuzzy|-f)        ITCH_EXACT=false; export ITCH_EXACT ;;
            --keep-missing|-k) ITCH_CHECK_EXISTS=false; export ITCH_CHECK_EXISTS ;;
            # --help and --version win over everything else, and the program
            # does not perform its normal function once either is seen.
            --help|-h)         itch_usage; return "$ITCH_EX_OK" ;;
            --version|-V)      itch_version; return "$ITCH_EX_OK" ;;
            -[!-]?*)
                # A bundle such as -fk. Split it and re-queue the pieces.
                value=${arg#-}
                while [ -n "$value" ]; do
                    set -- "-$(printf '%s' "$value" | cut -c1)" "$@"
                    value=$(printf '%s' "$value" | cut -c2-)
                    argc=$((argc + 1))
                done
                ;;
            -|--*|-*)
                itch_usage_error "unrecognized option '$arg'"
                return $?
                ;;
            *)
                set -- "$@" "$arg"
                ;;
        esac
    done

    command=${1:-}
    [ $# -gt 0 ] && shift

    case "$command" in
        '')             itch_usage_error 'missing command'; return $? ;;
        path)           itch_path ;;
        db-path)        itch_database_path ;;
        libraries)      itch_libraries ;;
        library-paths)  itch_library_paths ;;
        apps)           itch_apps "$strategy" ;;
        app)
            if [ $# -eq 0 ]; then
                itch_usage_error "the 'app' command requires a game id or name"
                return $?
            fi
            case "$1" in
                ''|*[!0-9]*) itch_app_by_name "$1" "$strategy" ;;
                *)           itch_app_by_id "$1" "$strategy" ;;
            esac
            ;;
        manifest|launch|receipt|receipts)
            if [ $# -eq 0 ]; then
                itch_usage_error "the '$command' command requires an argument"
                return $?
            fi
            case "$command" in
                manifest) itch_app_manifest "$1" ;;
                launch)   itch_launch_candidates "$1" ;;
                receipt)  itch_receipt "$1" ;;
                receipts) itch_receipts "$1" ;;
            esac
            ;;
        help)           itch_usage ;;
        version)        itch_version ;;
        *)              itch_usage_error "unrecognized command '$command'"; return $? ;;
    esac
}

# Only run the CLI when executed, not when sourced. $0 ends in this script's
# name in the executed case; a sourced file leaves $0 as the calling shell.
case "${0##*/}" in
    find-itch-games.sh|find-itch-games)
        _itch_require sqlite3 jq gzip || exit 1
        itch_main "$@"
        exit $?
        ;;
esac
