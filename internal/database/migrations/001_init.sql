-- PingPulse schema v1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    interval_seconds INTEGER NOT NULL DEFAULT 120,
    timeout_seconds INTEGER NOT NULL DEFAULT 5,
    retry_count INTEGER NOT NULL DEFAULT 3,
    retry_delay_seconds INTEGER NOT NULL DEFAULT 2,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_status TEXT NOT NULL DEFAULT 'unknown',
    last_latency_ms INTEGER,
    last_checked_at TEXT,
    last_success_at TEXT,
    last_failure_at TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    consecutive_successes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ping_results (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    success INTEGER NOT NULL,
    latency_ms INTEGER,
    error TEXT,
    duration_ms INTEGER NOT NULL,
    FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ping_results_target_time ON ping_results(target_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ping_results_timestamp ON ping_results(timestamp DESC);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    target_id TEXT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_configs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 0,
    api_url TEXT,
    api_key TEXT,
    sender TEXT,
    recipient TEXT,
    http_method TEXT DEFAULT 'POST',
    custom_headers TEXT,
    body_template TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_cooldowns (
    target_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    last_sent_at TEXT NOT NULL,
    PRIMARY KEY (target_id, kind)
);
