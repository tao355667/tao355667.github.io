CREATE TABLE IF NOT EXISTS cms_auth_attempts (
    bucket TEXT PRIMARY KEY NOT NULL,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
