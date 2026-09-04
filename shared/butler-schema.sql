-- The subset of butler's schema this library reads.
--
-- butler has no checked-in DDL: hades generates the schema at runtime by
-- reflecting over the Go structs in database/models/all_models.go, so there is
-- no upstream file to copy. These statements were taken verbatim from a real
-- butler.db with `sqlite3 .schema`, then trimmed to the tables in use.
--
-- Both test suites build their fixture databases from this file, so neither
-- can drift from the other.

CREATE TABLE install_locations (id TEXT NOT NULL, path TEXT, PRIMARY KEY (id));
CREATE TABLE games (id INTEGER NOT NULL, url TEXT, title TEXT, short_text TEXT, type TEXT,
  classification TEXT, cover_url TEXT, still_cover_url TEXT, created_at DATETIME,
  published_at DATETIME, min_price INTEGER, can_be_bought BOOLEAN, has_demo BOOLEAN,
  in_press_system BOOLEAN, windows TEXT, linux TEXT, osx TEXT, user_id INTEGER, PRIMARY KEY (id));
CREATE TABLE users (id INTEGER NOT NULL, username TEXT, display_name TEXT, url TEXT,
  cover_url TEXT, still_cover_url TEXT, PRIMARY KEY (id));
CREATE TABLE uploads (id INTEGER NOT NULL, storage TEXT, host TEXT, filename TEXT,
  display_name TEXT, size INTEGER, channel_name TEXT, build_id INTEGER, type TEXT,
  preorder BOOLEAN, demo BOOLEAN, windows TEXT, linux TEXT, osx TEXT, created_at DATETIME,
  updated_at DATETIME, PRIMARY KEY (id));
CREATE TABLE builds (id INTEGER NOT NULL, parent_build_id INTEGER, state TEXT, upload_id INTEGER,
  game_id INTEGER, user_id INTEGER, version INTEGER, user_version TEXT, created_at DATETIME,
  updated_at DATETIME, PRIMARY KEY (id));
CREATE TABLE caves (id TEXT NOT NULL, game_id INTEGER, external_game_id INTEGER, upload_id INTEGER,
  build_id INTEGER, morphing BOOLEAN, pinned BOOLEAN, installed_at DATETIME,
  last_touched_at DATETIME, seconds_run INTEGER, local_seconds_run INTEGER,
  local_last_run_at DATETIME, snoozed_at DATETIME, verdict TEXT, settings TEXT,
  installed_size INTEGER, install_location_id TEXT, install_folder_name TEXT,
  custom_install_folder TEXT, PRIMARY KEY (id));
