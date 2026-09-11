#!/bin/sh
#
# Test suite for the shell implementation.
#
# Builds the installation described by ../../shared/fixtures.json, the same one
# the Node and Python suites build, and checks the results ../../shared holds
# for it. POSIX sh; no test framework, so there is nothing to install beyond
# the library's own sqlite3/jq/gzip.
#
# shellcheck shell=sh disable=SC3043

set -u

HERE=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
SHARED="$HERE/../../shared"
LIB="$HERE/../find-itch-games.sh"

# shellcheck source=../find-itch-games.sh disable=SC1091  # path is computed at runtime
. "$LIB"

PASS=0
FAIL=0

ok() {
    PASS=$((PASS + 1))
    printf '  ok   %s\n' "$1"
}

not_ok() {
    FAIL=$((FAIL + 1))
    printf '  FAIL %s\n' "$1"
    [ $# -gt 1 ] && printf '       expected: %s\n' "$2"
    [ $# -gt 2 ] && printf '       actual:   %s\n' "$3"
    return 0
}

assert_equal() {
    if [ "$2" = "$3" ]; then ok "$1"; else not_ok "$1" "$2" "$3"; fi
}

assert_ok() {
    local label
    label=$1
    shift
    if "$@" >/dev/null 2>&1; then ok "$label"; else not_ok "$label" 'exit 0' "exit $?"; fi
}

assert_fails() {
    local label
    label=$1
    shift
    if "$@" >/dev/null 2>&1; then not_ok "$label" 'non-zero exit' 'exit 0'; else ok "$label"; fi
}

# ---------------------------------------------------------------------------
# the shared fixture, built on disk
# ---------------------------------------------------------------------------

ROOT=$(mktemp -d "${TMPDIR:-/tmp}/find-itch-shell.XXXXXX")
trap 'rm -rf "$ROOT"' EXIT HUP INT TERM
ITCH="$ROOT/config/itch"

expand() {
    printf '%s' "$1" | sed -e "s#{root}#$ROOT#g" -e "s#{itch}#$ITCH#g"
}

fixture() { jq -r "$1" "$SHARED/fixtures.json"; }
definition() { jq -r "$1" "$SHARED/definitions.json"; }

TAB=$(printf '\t')
# ASCII unit separator. Used instead of a tab because IFS folds runs of
# whitespace together, which would drop every empty field.
US=$(printf '\037')

# Quotes a value for SQL, doubling embedded apostrophes. Empty becomes NULL.
#
# The SQL is assembled here rather than in jq so that neither language's
# quoting has to survive the other's.
sql_quote() {
    if [ -z "$1" ]; then
        printf 'NULL'
    else
        printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"
    fi
}

write_receipt() {
    local dir json gzip_it
    dir=$1
    json=$2
    gzip_it=$3
    mkdir -p "$dir/.itch"
    if [ "$gzip_it" = 'true' ]; then
        printf '%s' "$json" | gzip -c > "$dir/.itch/receipt.json.gz"
    else
        printf '%s' "$json" > "$dir/.itch/receipt.json"
    fi
}

build_fixture() {
    local db id path
    local cave_id game_id url title classification upload_id channel build_id
    local user_version pinned installed_at seconds_run verdict installed_size
    local location_id folder_name custom on_disk files folder receipt f

    mkdir -p "$ITCH/db" "$ITCH/apps"
    jq -n --arg d "$(fixture '.defaultInstallLocation')" \
        '{installLocations: {}, defaultInstallLocation: $d}' > "$ITCH/preferences.json"

    db="$ITCH/db/butler.db"
    sqlite3 "$db" < "$SHARED/butler-schema.sql"

    fixture '.installLocations[] | [.id, .path] | @tsv' |
    while IFS="$TAB" read -r id path; do
        sqlite3 "$db" "INSERT INTO install_locations (id, path) VALUES ($(sql_quote "$id"), $(sql_quote "$(expand "$path")"));"
    done

    fixture '.caves[] | [
        .id, (.gameId|tostring), (.game.url // ""), (.game.title // ""),
        (.game.classification // "game"),
        ((.upload.id // 0)|tostring), (.upload.channelName // ""),
        ((.build.id // 0)|tostring), (.build.userVersion // ""),
        (if .pinned then "1" else "0" end),
        (.installedAt // "2026-01-01T00:00:00Z"), ((.secondsRun // 0)|tostring),
        (if .verdict then (.verdict|tojson) else "" end),
        ((.installedSize // 0)|tostring),
        (.installLocationId // ""), (.installFolderName // ""),
        (.customInstallFolder // ""),
        (if .onDisk then "yes" else "no" end),
        (if (.onDisk|type) == "object" then ((.onDisk.files // []) | join(":")) else "" end)
    ] | join("\u001f")' |
    while IFS="$US" read -r cave_id game_id url title classification upload_id \
        channel build_id user_version pinned installed_at seconds_run verdict \
        installed_size location_id folder_name custom on_disk files; do

        sqlite3 "$db" "INSERT OR REPLACE INTO games (id, url, title, classification)
            VALUES ($game_id, $(sql_quote "$url"), $(sql_quote "$title"), $(sql_quote "$classification"));"
        [ "$upload_id" != '0' ] && sqlite3 "$db" \
            "INSERT OR REPLACE INTO uploads (id, channel_name) VALUES ($upload_id, $(sql_quote "$channel"));"
        [ "$build_id" != '0' ] && sqlite3 "$db" \
            "INSERT OR REPLACE INTO builds (id, user_version) VALUES ($build_id, $(sql_quote "$user_version"));"

        custom=$(expand "$custom")
        sqlite3 "$db" "INSERT INTO caves (id, game_id, upload_id, build_id, pinned,
            installed_at, seconds_run, verdict, installed_size, install_location_id,
            install_folder_name, custom_install_folder) VALUES (
            $(sql_quote "$cave_id"), $game_id, $upload_id, $build_id, $pinned,
            $(sql_quote "$installed_at"), $seconds_run,
            $(sql_quote "$(expand "$verdict")"), $installed_size,
            $(sql_quote "$location_id"), $(sql_quote "$folder_name"),
            $(if [ -n "$custom" ]; then sql_quote "$custom"; else printf "''"; fi));"

        [ "$on_disk" = 'yes' ] || continue
        if [ -n "$custom" ]; then
            folder=$custom
        else
            path=$(fixture ".installLocations[] | select(.id == \"$location_id\") | .path")
            folder="$(expand "$path")/$folder_name"
        fi
        receipt=$(jq -nc --argjson id "$game_id" --arg url "$url" --arg title "$title" \
            --arg cls "$classification" \
            '{game: {id: $id, url: $url, title: $title, classification: $cls}, files: [], installerName: "archive"}')
        write_receipt "$folder" "$receipt" true

        # The fixture lists installed files colon-separated; create them so the
        # launch-candidate paths point at something real.
        IFS=':'
        for f in $files; do
            [ -n "$f" ] || continue
            mkdir -p "$folder/$(dirname "$f")"
            : > "$folder/$f"
        done
        IFS="$US"
    done

    # Receipt-only folders: on disk, but with no cave in the database.
    fixture '.receiptOnlyFolders[] | [.path, (.gzip // true | tostring), (.game | tojson)] | @tsv' |
    while IFS="$TAB" read -r path gzip_it receipt; do
        write_receipt "$(expand "$path")" \
            "$(printf '%s' "$receipt" | jq -c '{game: ., files: [], installerName: "archive"}')" \
            "$gzip_it"
    done

    # Noise that must never be reported.
    fixture '.noiseFolders.paths[]' | while IFS= read -r path; do
        mkdir -p "$(expand "$path")"
    done
}

build_fixture
ITCH_PATH="$ITCH"
export ITCH_PATH

printf 'shell implementation\n'

# ---------------------------------------------------------------------------
# the shared vocabulary
# ---------------------------------------------------------------------------

assert_equal 'strategies match shared/definitions.json' \
    "$(definition '.strategies.values | join(" ")')" "$ITCH_STRATEGIES"
assert_equal 'app names match shared/definitions.json' \
    "$(definition '.appNames.values | join(" ")')" "$ITCH_APP_NAMES"
assert_equal 'receipt directory matches shared/definitions.json' \
    "$(definition '.receipt.directory')" "$ITCH_RECEIPT_DIR"

# ---------------------------------------------------------------------------
# the shared fixture's expected results
# ---------------------------------------------------------------------------

for strategy in $ITCH_STRATEGIES; do
    assert_equal "strategy '$strategy' reports the expected game ids" \
        "$(fixture ".expected.gameIdsByStrategy.$strategy | join(\" \")" | tr ' ' '\n' | sort -n | tr '\n' ' ')" \
        "$(itch_apps "$strategy" | cut -f1 | sort -n | tr '\n' ' ')"
done

assert_equal 'install locations match the shared expectation' \
    "$(fixture '.expected.installLocationPaths[]' | while IFS= read -r p; do expand "$p"; printf '\n'; done | sort | tr '\n' ' ')" \
    "$(itch_library_paths | sort | tr '\n' ' ')"

assert_equal 'the default install location is marked' \
    "$(fixture '.defaultInstallLocation')" \
    "$(itch_libraries | awk -F'\t' '$3 == "true" { print $1 }')"

assert_equal 'caves whose folder is gone are dropped' '' \
    "$(itch_apps merge | cut -f1 | grep -x "$(fixture '.expected.droppedWhenCheckExists[0]')" || true)"

assert_equal 'they are kept when ITCH_CHECK_EXISTS=false' \
    "$(fixture '.expected.droppedWhenCheckExists[0]')" \
    "$(ITCH_CHECK_EXISTS=false itch_apps merge | cut -f1 | grep -x "$(fixture '.expected.droppedWhenCheckExists[0]')" || true)"

assert_equal 'the staging folder is never reported' '' \
    "$(itch_apps merge | cut -f5 | grep -x "$(definition '.stagingFolderName.value')" || true)"

assert_equal 'unrelated folders in a shared location are ignored' '' \
    "$(itch_apps merge | cut -f2 | grep 'VintageStory' || true)"

# ---------------------------------------------------------------------------
# lookups
# ---------------------------------------------------------------------------

assert_equal 'finds a game by id' \
    "$ROOT/Games/itch/distributrains" "$(itch_app_by_id 4225297)"
assert_equal 'finds a game by exact title' \
    "$ROOT/Games/itch/distributrains" "$(itch_app_by_name 'Distributrains')"
assert_equal 'finds a game by install folder name' \
    "$ROOT/Games/itch/distributrains" "$(itch_app_by_name 'distributrains')"
assert_fails 'does not match loosely by default' itch_app_by_name 'godot pck explorer'
assert_equal 'matches loosely with ITCH_EXACT=false' \
    "$ROOT/Games/itch/godot-pck-explorer" \
    "$(ITCH_EXACT=false itch_app_by_name 'godot pck explorer')"
assert_fails 'unknown id fails' itch_app_by_id 1
assert_fails 'unknown name fails' itch_app_by_name 'Half-Life 3'
assert_ok 'itch_has_app finds an installed id' itch_has_app 4225297
assert_fails 'itch_has_app rejects an absent id' itch_has_app 1

# ---------------------------------------------------------------------------
# strategies, receipts, errors
# ---------------------------------------------------------------------------

assert_fails 'an unknown strategy is rejected rather than guessed' itch_apps recipts

assert_equal 'reads a gzipped receipt' '4225297' \
    "$(itch_receipt "$ROOT/Games/itch/distributrains" | jq -r '.game.id')"
assert_equal 'reads an uncompressed receipt' '2328674' \
    "$(itch_receipt "$ROOT/Games/itch/cosmic-collapse" | jq -r '.game.id')"
assert_fails 'a folder without a receipt fails' itch_receipt "$ROOT/Games/VintageStory"

assert_equal 'a custom install folder is reported' \
    "$ROOT/Elsewhere/portable-game" \
    "$(itch_apps merge | awk -F'\t' '$1 == 999002 { print $2 }')"

assert_equal 'launch candidates resolve to absolute paths' \
    "$ROOT/Games/itch/distributrains/Distributrains/Distributrains64" \
    "$(itch_launch_candidates 4225297)"

assert_equal 'the manifest carries the merged record' 'Distributrains' \
    "$(itch_app_manifest 4225297 | jq -r '.title')"

# ---------------------------------------------------------------------------
# path searching
# ---------------------------------------------------------------------------

EMPTY=$(mktemp -d "${TMPDIR:-/tmp}/find-itch-empty.XXXXXX")
assert_equal 'searches only under the given home' '' \
    "$(unset ITCH_PATH; FIND_ITCH_HOME="$EMPTY" XDG_CONFIG_HOME='' itch_path_candidates | grep -v "^$EMPTY/" || true)"
assert_fails 'finds nothing when itch is absent' \
    sh -c "unset ITCH_PATH; FIND_ITCH_HOME='$EMPTY' XDG_CONFIG_HOME='' . '$LIB' && itch_path"

for platform in $(definition '.pathCandidates | keys[] | select(startswith("$") or . == "source" | not)'); do
    # shellcheck disable=SC2016  # the ${VAR} forms are literal text in the templates
    expected=$(jq -r --arg p "$platform" '.pathCandidates[$p][]' "$SHARED/definitions.json" | sed \
        -e 's#{home}#/home/u#g' -e 's#\${APPDATA}#/appdata#g' \
        -e 's#\${LOCALAPPDATA}#/localappdata#g' -e 's#\${XDG_CONFIG_HOME}#/xdg#g')
    actual=$(unset ITCH_PATH; FIND_ITCH_HOME=/home/u FIND_ITCH_PLATFORM="$platform" \
        APPDATA=/appdata LOCALAPPDATA=/localappdata XDG_CONFIG_HOME=/xdg itch_path_candidates)
    missing=''
    for app in $ITCH_APP_NAMES; do
        while IFS= read -r template; do
            [ -n "$template" ] || continue
            want=$(printf '%s' "$template" | sed "s#{app}#$app#g")
            printf '%s\n' "$actual" | grep -qxF "$want" || missing="$missing|$want"
        done <<TEMPLATES
$expected
TEMPLATES
    done
    assert_equal "$platform path candidates match shared/definitions.json" '' "$missing"
done
rmdir "$EMPTY" 2>/dev/null || true

# ---------------------------------------------------------------------------
# the command-line interface, against the GNU coding standards
# ---------------------------------------------------------------------------

CLI="$HERE/../find-itch-games.sh"

assert_equal '--version names the program and version, parsable after the last space' \
    "$ITCH_VERSION" "$("$CLI" --version | head -n 1 | awk '{print $NF}')"
assert_equal '--version first line uses the canonical program name' \
    "$ITCH_PROGRAM_NAME" "$("$CLI" --version | head -n 1 | awk '{print $1}')"
assert_equal '--version states the licence and the absence of warranty' 'yes' \
    "$("$CLI" --version | grep -q '^License ' && "$CLI" --version | grep -q 'NO WARRANTY' && echo yes)"
assert_equal '--version carries a copyright notice' 'yes' \
    "$("$CLI" --version | grep -q '^Copyright ' && echo yes)"

assert_equal '--help opens with a usage line' 'yes' \
    "$("$CLI" --help | head -n 1 | grep -q "^Usage: $ITCH_PROGRAM_NAME " && echo yes)"
assert_equal '--help ends with the bug address and home page' 'yes' \
    "$("$CLI" --help | tail -n 2 | grep -q '^Report bugs to: <' && \
       "$CLI" --help | tail -n 1 | grep -q "^$ITCH_PROGRAM_NAME home page: <" && echo yes)"

assert_equal '--help exits successfully' '0' \
    "$("$CLI" --help >/dev/null 2>&1; echo $?)"
assert_equal '--version exits successfully' '0' \
    "$("$CLI" --version >/dev/null 2>&1; echo $?)"

# "Other options and arguments should be ignored once this is seen, and the
# program should not perform its normal function."
assert_equal '--help overrides a later command' 'yes' \
    "$("$CLI" --help apps | head -n 1 | grep -q '^Usage:' && echo yes)"
assert_equal '--version overrides a later command' 'yes' \
    "$("$CLI" --version apps | head -n 1 | grep -q "^$ITCH_PROGRAM_NAME " && echo yes)"

assert_equal 'a usage error exits 2' '2' \
    "$("$CLI" --no-such-option >/dev/null 2>&1; echo $?)"
assert_equal 'an unknown command exits 2' '2' \
    "$("$CLI" no-such-command >/dev/null 2>&1; echo $?)"
assert_equal 'a missing option argument exits 2' '2' \
    "$("$CLI" --strategy >/dev/null 2>&1; echo $?)"
assert_equal 'a failed lookup exits 1' '1' \
    "$("$CLI" app 999999999 >/dev/null 2>&1; echo $?)"

assert_equal 'diagnostics name the program and go to stderr' \
    "$ITCH_PROGRAM_NAME: unrecognized option '--no-such-option'" \
    "$("$CLI" --no-such-option 2>&1 >/dev/null | head -n 1)"
assert_equal 'diagnostics point at --help' \
    "Try '$ITCH_PROGRAM_NAME --help' for more information." \
    "$("$CLI" --no-such-option 2>&1 >/dev/null | tail -n 1)"

# The GNU extension to the POSIX guidelines: options anywhere among arguments.
assert_equal 'an option may follow the command' 'db' \
    "$("$CLI" apps --strategy db | cut -f3 | sort -u)"
assert_equal 'an option may precede the command' 'db' \
    "$("$CLI" --strategy db apps | cut -f3 | sort -u)"
assert_equal 'long options accept =VALUE' 'receipt' \
    "$("$CLI" apps --strategy=receipts | cut -f3 | sort -u)"
assert_equal 'short options accept a separate argument' 'db' \
    "$("$CLI" -s db apps | cut -f3 | sort -u)"
assert_equal 'short options may be bundled' \
    "$ROOT/Games/itch/godot-pck-explorer" \
    "$("$CLI" -fk app 'godot pck explorer')"
assert_equal 'a -- argument ends option processing' '1' \
    "$("$CLI" app -- --version >/dev/null 2>&1; echo $?)"

# ---------------------------------------------------------------------------
# failures must not be masked by a pipeline
# ---------------------------------------------------------------------------
#
# A pipeline's exit status is the last command's, so a function ending in
# `| cut` or `| jq` reports that command's success even when the work before it
# failed. A caller writing `itch_library_paths || handle_error` would never see
# the failure.

NOWHERE=$(mktemp -d "${TMPDIR:-/tmp}/find-itch-nowhere.XXXXXX")

assert_equal 'itch_library_paths reports that itch was not found' '1' \
    "$( (unset ITCH_PATH; FIND_ITCH_HOME="$NOWHERE" XDG_CONFIG_HOME='' itch_library_paths) >/dev/null 2>&1; echo $?)"

assert_equal 'itch_libraries reports that itch was not found' '1' \
    "$( (unset ITCH_PATH; FIND_ITCH_HOME="$NOWHERE" XDG_CONFIG_HOME='' itch_libraries) >/dev/null 2>&1; echo $?)"

assert_equal 'itch_db_locations reports a missing database' '1' \
    "$(itch_db_locations /nonexistent/butler.db >/dev/null 2>&1; echo $?)"

assert_equal 'itch_library_paths still lists the locations it finds' \
    "$(itch_libraries | cut -f2 | sort | tr '\n' ' ')" \
    "$(itch_library_paths | sort | tr '\n' ' ')"

rmdir "$NOWHERE" 2>/dev/null || true

printf '\n%s passed, %s failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
