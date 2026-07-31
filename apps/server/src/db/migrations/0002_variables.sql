-- Named, mutable values interaction scripts can read/write (see
-- InteractionVariable in @streamdesk/shared-types). Also exposed read-only
-- as the data source "variable.<id>" so any widget can bind a label to one
-- without needing a script at all (see bootstrap/register-variable-data-sources.ts).

CREATE TABLE IF NOT EXISTS variables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  initial_value TEXT NOT NULL, -- JSON scalar
  current_value TEXT NOT NULL, -- JSON scalar
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
