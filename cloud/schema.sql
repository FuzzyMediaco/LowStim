CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  salt TEXT NOT NULL,
  verifier TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  digest TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS creations (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  recipe TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, id)
);
CREATE INDEX IF NOT EXISTS creations_recent ON creations(account_id, saved_at DESC);
CREATE TABLE IF NOT EXISTS auth_attempts (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_expiry ON auth_attempts(expires);
