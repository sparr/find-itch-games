# Installation for the POSIX shell implementation.
#
# Variable names follow the GNU standards, so DESTDIR and PREFIX behave as
# packagers expect. `?=` rather than `=` so that a PREFIX arriving in the
# environment wins -- which is how bpkg's global install passes it.

PREFIX ?= /usr/local
DESTDIR ?=
bindir ?= $(PREFIX)/bin

SCRIPT  = find-itch-games.sh
PROGRAM = find-itch-games

all:
	@echo 'Nothing to build; this is a shell script.'
	@echo "Run 'make install' to install $(PROGRAM) into \$$(bindir)."

# Installed without the .sh extension: what is on $PATH is a command, and the
# implementation language is not the user's concern.
install:
	mkdir -p "$(DESTDIR)$(bindir)"
	cp "$(SCRIPT)" "$(DESTDIR)$(bindir)/$(PROGRAM)"
	chmod 755 "$(DESTDIR)$(bindir)/$(PROGRAM)"

uninstall:
	rm -f "$(DESTDIR)$(bindir)/$(PROGRAM)"

check test:
	./tests/run-tests.sh

lint:
	shellcheck -x --shell=sh "$(SCRIPT)" tests/run-tests.sh

.PHONY: all install uninstall check test lint
