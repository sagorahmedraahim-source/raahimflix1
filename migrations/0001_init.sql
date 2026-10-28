PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_norm TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_config (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
