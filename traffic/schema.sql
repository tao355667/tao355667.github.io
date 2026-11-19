CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY,
    visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip TEXT NOT NULL,
    city TEXT
);

CREATE INDEX IF NOT EXISTS visits_by_time ON visits (visited_at);
