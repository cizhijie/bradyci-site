-- One-time D1 schema for Owner login brute-force protection.
-- Apply explicitly; worker runtime does not create tables.
CREATE TABLE IF NOT EXISTS owner_login_attempts (
  login_key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_owner_login_attempts_updated_at
  ON owner_login_attempts(updated_at);
