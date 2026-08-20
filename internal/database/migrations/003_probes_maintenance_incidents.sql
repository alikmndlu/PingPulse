-- Probe types, maintenance windows, and incidents
ALTER TABLE targets ADD COLUMN probe_type TEXT NOT NULL DEFAULT 'icmp';
ALTER TABLE targets ADD COLUMN http_url TEXT NOT NULL DEFAULT '';
ALTER TABLE targets ADD COLUMN http_method TEXT NOT NULL DEFAULT 'GET';
ALTER TABLE targets ADD COLUMN expect_status INTEGER NOT NULL DEFAULT 200;
ALTER TABLE targets ADD COLUMN tcp_port INTEGER NOT NULL DEFAULT 0;

PRAGMA foreign_keys = OFF;

CREATE TABLE targets_v3 (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
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
    consecutive_successes INTEGER NOT NULL DEFAULT 0,
    group_id TEXT REFERENCES target_groups(id) ON DELETE SET NULL,
    muted_until TEXT,
    probe_type TEXT NOT NULL DEFAULT 'icmp',
    http_url TEXT NOT NULL DEFAULT '',
    http_method TEXT NOT NULL DEFAULT 'GET',
    expect_status INTEGER NOT NULL DEFAULT 200,
    tcp_port INTEGER NOT NULL DEFAULT 0
);

INSERT INTO targets_v3 (
    id, name, host, enabled, interval_seconds, timeout_seconds, retry_count, retry_delay_seconds,
    created_at, updated_at, last_status, last_latency_ms, last_checked_at, last_success_at, last_failure_at,
    consecutive_failures, consecutive_successes, group_id, muted_until,
    probe_type, http_url, http_method, expect_status, tcp_port
)
SELECT
    id, name, host, enabled, interval_seconds, timeout_seconds, retry_count, retry_delay_seconds,
    created_at, updated_at, last_status, last_latency_ms, last_checked_at, last_success_at, last_failure_at,
    consecutive_failures, consecutive_successes, group_id, muted_until,
    probe_type, http_url, http_method, expect_status, tcp_port
FROM targets;

DROP TABLE targets;
ALTER TABLE targets_v3 RENAME TO targets;

CREATE UNIQUE INDEX IF NOT EXISTS idx_targets_probe_identity
    ON targets(probe_type, lower(host), tcp_port, http_url);
CREATE INDEX IF NOT EXISTS idx_targets_group ON targets(group_id);

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS maintenance_windows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_id TEXT REFERENCES targets(id) ON DELETE CASCADE,
    group_id TEXT REFERENCES target_groups(id) ON DELETE CASCADE,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    reason TEXT,
    suppress_checks INTEGER NOT NULL DEFAULT 1,
    suppress_notifications INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_range ON maintenance_windows(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_target ON maintenance_windows(target_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_group ON maintenance_windows(group_id);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
    probe_type TEXT NOT NULL DEFAULT 'icmp',
    status TEXT NOT NULL DEFAULT 'open',
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_target ON incidents(target_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_started ON incidents(started_at DESC);
