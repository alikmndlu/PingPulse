-- Groups and per-target mute
CREATE TABLE IF NOT EXISTS target_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    color TEXT NOT NULL DEFAULT '#22d3ee',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

ALTER TABLE targets ADD COLUMN group_id TEXT REFERENCES target_groups(id) ON DELETE SET NULL;
ALTER TABLE targets ADD COLUMN muted_until TEXT;

CREATE INDEX IF NOT EXISTS idx_targets_group ON targets(group_id);
