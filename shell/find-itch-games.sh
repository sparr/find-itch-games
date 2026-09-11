#!/bin/sh
# shellcheck shell=sh disable=SC3043  # `local` is not POSIX.1 but is universal in practice
#
# find-itch-games -- find the itch.io app, its install locations, and the games
# installed in them.
#
# Source this file to use the itch_* functions, or run it directly as a CLI:
#
#     . ./find-itch-games.sh   &&  itch_apps
#     ./find-itch-games.sh apps
#
# POSIX sh. The only shell extension relied on is `local`, which is not in
# POSIX.1 but is implemented by dash, ash, ksh, bash and zsh.
#
# External tools, because a shell cannot read SQLite or JSON on its own:
#
#     sqlite3   reads butler.db
#     jq        parses receipts, verdicts and the database's JSON output
#     gzip      decompresses receipts
#
# Every function prints to stdout and returns non-zero on failure. Lists are
# tab-separated with one record per line, so they survive titles containing
# spaces; nothing emitted here contains a literal tab or newline, because the
# values come out of jq with those escaped.

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

# Directories itch may keep its user data in, most specific first.
#
# Mirrors Electron's app.getPath("userData") for each app variant.
# ITCH_USER_DATA_DIR and ITCH_APP_DIR are this library's own escape hatch; the
# itch app itself does not read them.
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

# Prints the itch user-data directory, or fails if there is none.
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

# Prints butler.db's path, allowing for the butler-<host>.db name that builds
# configured against a non-standard itch.io host use.
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

# Install locations, tab-separated: id, path
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

# Prints an install folder's receipt as JSON, or fails if it has none.
#
# Falls back to the pre-v23 uncompressed receipt.json, whose schema recorded a
# cave's ids rather than the game; that shape is normalized to the modern one
# with the ids kept under .legacy.
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

# Install folders under a location that carry a receipt, one path per line.
#
# Follows butler's own scan rules: skip the downloads staging folder, require a
# .itch directory, then read the receipt.
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

# Install locations, tab-separated: id, path, is_default, exists, source
#
# butler.db is authoritative when readable; preferences.json covers itch
# versions that predate it, and the built-in appdata location is derived from
# the itch directory because itch never stores it as a path.
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

# Just the install location paths, one per line.
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

# Every installed game, tab-separated:
#   game_id, path, source, title, install_folder_name, version, channel
#
# Usage: itch_apps [strategy] [itch_path]
#   merge     (default) butler.db confirmed against on-disk receipts, plus any
#             receipt the database has no row for
#   db        butler.db only; the only source of play times, launch candidates
#             and custom install folders
#   receipts  scan the install locations instead of reading caves
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

# The paths the database half of a strategy would report. Used to avoid
# reporting a game twice when receipts are scanned afterwards.
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

# Prints where a game is installed, by itch.io game id.
itch_app_by_id() {
    local id match
    id=$1
    [ -n "$id" ] || { _itch_die 'itch_app_by_id: a game id is required'; return 1; }
    match=$(itch_apps "${2:-merge}" | awk -F'\t' -v id="$id" '$1 == id { print $2 }')
    [ -n "$match" ] || return 1
    printf '%s\n' "$match" | head -n 1
}

# Every install of a game, one path per line. Usually zero or one, but itch
# will happily install the same game into more than one location.
itch_apps_by_id() {
    itch_apps "${2:-merge}" | awk -F'\t' -v id="$1" '$1 == id { print $2 }'
}

# Prints where a game is installed, by title, url slug or install folder name.
#
# Exact by default. Set ITCH_EXACT=false for a match that ignores case, spacing
# and punctuation.
itch_app_by_name() {
    local name match
    name=$1
    [ -n "$name" ] || { _itch_die 'itch_app_by_name: a name is required'; return 1; }
    match=$(itch_apps_by_name "$name" "${2:-merge}")
    [ -n "$match" ] || return 1
    printf '%s\n' "$match" | head -n 1
}

# Every installed game matching a name, one path per line.
#
# Parsed with awk rather than `read`, because IFS treats a tab as whitespace:
# consecutive tabs would collapse into one, so a game with no title would shift
# every later field left.
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

# Exits zero if a game is installed, by id or by name.
itch_has_app() {
    local query
    query=$1
    case "$query" in
        ''|*[!0-9]*) [ -n "$(itch_apps_by_name "$query")" ] ;;
        *)           [ -n "$(itch_apps_by_id "$query")" ] ;;
    esac
}

# The merged cave/receipt record for a game, as JSON.
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

# Absolute paths of the launch candidates butler found, best first.
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
ITCH_BUG_ADDRESS='https://github.com/sparr/find-itch-games/issues'
ITCH_HOME_PAGE='https://sparr.github.io/find-itch-games/'

# Exit statuses. 2 for a usage error keeps it distinguishable from a lookup
# that simply found nothing, which is an ordinary failure.
ITCH_EX_OK=0
ITCH_EX_FAILURE=1
ITCH_EX_USAGE=2

# Name, version, origin and legal status on stdout, then exit successfully.
#
# The first line is meant to be machine-parsable: the version number proper
# starts after the last space.
itch_version() {
    cat <<VERSION
$ITCH_PROGRAM_NAME $ITCH_VERSION
Copyright (C) 2026 Clarence "Sparr" Risher
License MIT: <https://opensource.org/license/mit>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
VERSION
}

# Brief documentation for how to invoke the program, on stdout.
itch_usage() {
    cat <<USAGE
Usage: $ITCH_PROGRAM_NAME [OPTION]... COMMAND [ARGUMENT]...
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
  $ITCH_EX_OK  success
  $ITCH_EX_FAILURE  itch or the requested game was not found
  $ITCH_EX_USAGE  a command-line usage error

Requires sqlite3, jq and gzip, because a shell cannot read SQLite or JSON on
its own.

Report bugs to: <$ITCH_BUG_ADDRESS>
$ITCH_PROGRAM_NAME home page: <$ITCH_HOME_PAGE>
USAGE
}

# Reports a usage error the way GNU programs do: a diagnostic naming the
# program, on stderr, and a pointer to --help.
itch_usage_error() {
    printf '%s: %s\n' "$ITCH_PROGRAM_NAME" "$1" >&2
    printf "Try '%s --help' for more information.\n" "$ITCH_PROGRAM_NAME" >&2
    return "$ITCH_EX_USAGE"
}

# Parses options and dispatches a command.
#
# Options are permitted anywhere among the arguments, which is the GNU
# extension to the POSIX guidelines: each argument is either consumed as an
# option or pushed to the back of the positional parameters, so after one pass
# only the operands remain, in their original order.
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
