CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY,
    visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip TEXT NOT NULL,
    city TEXT,
    context TEXT CHECK (context IS NULL OR json_valid(context))
);

CREATE INDEX IF NOT EXISTS visits_by_time ON visits (visited_at);

-- A null expiry identifies an administrator password verifier. All other keys are short-lived sessions.
CREATE TABLE IF NOT EXISTS cms_access (
    key_hash TEXT PRIMARY KEY NOT NULL,
    expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS cms_auth_attempts (
    bucket TEXT PRIMARY KEY NOT NULL,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
