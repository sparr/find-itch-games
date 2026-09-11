#!/bin/sh
#
# Generates the shell implementation's documentation with shellman.
#
# One set of `## \tag` comments in find-itch-games.sh produces all three:
#
#   docs/shell/api/index.html    the reference GitHub Pages serves, with each
#                                command linked to the function implementing it
#   docs/shell/api/index.md      the same reference as markdown, which GitHub
#                                renders when browsing the repository
#   docs/shell/find-itch-games.1 a groff man page
#   the itch_usage() heredoc     the --help text, written back into the script
#
# The help text is generated *into* the script so the program has no runtime
# dependency on shellman, and the results are committed so nobody needs shellman
# unless they are changing the documentation.
#
# shellcheck shell=sh

set -e

HERE=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
SCRIPT="$HERE/find-itch-games.sh"
TEMPLATES="$HERE/templates"
CONTEXT="$TEMPLATES/context.json"
DOCS="${1:-$HERE/../docs/shell}"

SHELLMAN=${SHELLMAN:-$(command -v shellman 2>/dev/null || true)}
if [ -z "$SHELLMAN" ]; then
    echo 'build-docs: shellman not found. Install it with:' >&2
    echo '  pipx install shellman   # or: pip install shellman' >&2
    exit 1
fi

# Note the file argument comes last and --context is never used: its nargs is
# greedy and would swallow the filename, silently producing an empty document.
render() {
    "$SHELLMAN" -t "$1" --context-file "$CONTEXT" "$SCRIPT"
}

mkdir -p "$DOCS/api"

echo 'build-docs: reference'
# HTML for Pages, which serves .md as text/markdown -- browsers download that
# rather than rendering it. Markdown too, for browsing on GitHub.
render "path:$TEMPLATES/html" > "$DOCS/api/index.html"
render "path:$TEMPLATES/linked.md" > "$DOCS/api/index.md"

echo 'build-docs: man page'
render manpage > "$DOCS/find-itch-games.1"

echo 'build-docs: help text, into the script'
help_text=$(render "path:$TEMPLATES/helptext")

# Replace the body of itch_usage()'s heredoc in place. awk rather than sed
# because the replacement is multi-line and contains characters sed would treat
# as delimiters.
tmp=$(mktemp "${TMPDIR:-/tmp}/find-itch-help.XXXXXX")
trap 'rm -f "$tmp"' EXIT HUP INT TERM
printf '%s\n' "$help_text" > "$tmp"

awk -v helpfile="$tmp" '
    # A single quote, built rather than escaped: awk has no portable escape for
    # one inside a single-quoted program.
    BEGIN { q = sprintf("%c", 39) }

    # The delimiter must be quoted. The help text contains backticks, which an
    # unquoted heredoc would run as command substitutions.
    /^    cat <<.?USAGE.?$/ {
        print "    cat <<" q "USAGE" q
        while ((getline line < helpfile) > 0) print line
        skip = 1
        next
    }
    skip && /^USAGE$/ { skip = 0; print; next }
    !skip { print }
' "$SCRIPT" > "$SCRIPT.new"

mv "$SCRIPT.new" "$SCRIPT"
chmod +x "$SCRIPT"

echo "build-docs: wrote $DOCS/api/index.{html,md}, $DOCS/find-itch-games.1, and itch_usage()"
