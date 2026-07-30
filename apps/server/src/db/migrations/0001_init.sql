-- StreamDesk V1 initial schema.
-- All JSON-shaped columns store validated JSON and are the source of truth;
-- the TypeScript types in @streamdesk/shared-types describe their shape.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  content TEXT NOT NULL, -- full DeckPage JSON, including widgets[]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interfaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  viewport TEXT NOT NULL,
  supported_features TEXT NOT NULL,
  token_hash TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  architecture TEXT NOT NULL,
  version TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  token_hash TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  uptime_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  manifest TEXT NOT NULL,
  directory TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'enabled',
  last_error TEXT,
  installed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_settings (
  plugin_id TEXT PRIMARY KEY,
  settings TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_storage (
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (plugin_id, key)
);

CREATE TABLE IF NOT EXISTS action_executions (
  execution_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  status TEXT NOT NULL,
  input TEXT,
  output TEXT,
  error TEXT,
  requested_by TEXT NOT NULL,
  target TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS event_log (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  source_plugin_id TEXT NOT NULL,
  source_connect_id TEXT,
  payload TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_source_values (
  data_source_id TEXT PRIMARY KEY,
  source_connect_id TEXT,
  value TEXT,
  updated_at TEXT NOT NULL,
  quality TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pairing_tokens (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL, -- 'interface' | 'connect'
  label TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_executions_action_id ON action_executions(action_id);
CREATE INDEX IF NOT EXISTS idx_event_log_event_type ON event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_timestamp ON event_log(timestamp);
