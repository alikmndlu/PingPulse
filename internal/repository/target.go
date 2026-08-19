package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"pingpulse/internal/domain"

	"github.com/google/uuid"
)

type TargetRepository struct {
	db *sql.DB
}

func NewTargetRepository(db *sql.DB) *TargetRepository {
	return &TargetRepository{db: db}
}

func (r *TargetRepository) List(ctx context.Context) ([]domain.Target, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+targetColumns+` FROM targets t LEFT JOIN target_groups g ON g.id = t.group_id ORDER BY t.name COLLATE NOCASE ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.Target, 0)
	for rows.Next() {
		t, err := scanTarget(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

func (r *TargetRepository) Get(ctx context.Context, id string) (domain.Target, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+targetColumns+` FROM targets t LEFT JOIN target_groups g ON g.id = t.group_id WHERE t.id = ?`, id)
	t, err := scanTarget(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Target{}, domain.ErrNotFound
	}
	return t, err
}

func (r *TargetRepository) GetByHost(ctx context.Context, host string) (domain.Target, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+targetColumns+` FROM targets t LEFT JOIN target_groups g ON g.id = t.group_id WHERE lower(t.host) = lower(?)`, host)
	t, err := scanTarget(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Target{}, domain.ErrNotFound
	}
	return t, err
}

func (r *TargetRepository) Create(ctx context.Context, t domain.Target) (domain.Target, error) {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	if t.LastStatus == "" {
		t.LastStatus = domain.StatusUnknown
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO targets (
			id, name, host, enabled, interval_seconds, timeout_seconds, retry_count, retry_delay_seconds,
			created_at, updated_at, last_status, last_latency_ms, last_checked_at, last_success_at, last_failure_at,
			consecutive_failures, consecutive_successes, group_id, muted_until
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, t.Name, t.Host, boolToInt(t.Enabled), t.Interval, t.Timeout, t.RetryCount, t.RetryDelay,
		t.CreatedAt.Format(time.RFC3339Nano), t.UpdatedAt.Format(time.RFC3339Nano), t.LastStatus,
		nullInt(t.LastLatency), nullTime(t.LastCheckedAt), nullTime(t.LastSuccessAt), nullTime(t.LastFailureAt),
		t.ConsecutiveFailures, t.ConsecutiveSuccesses, nullEmpty(t.GroupID), nullEmpty(t.MutedUntil),
	)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return domain.Target{}, domain.ErrDuplicateTarget
		}
		return domain.Target{}, err
	}
	return r.Get(ctx, t.ID)
}

func (r *TargetRepository) Update(ctx context.Context, t domain.Target) (domain.Target, error) {
	t.UpdatedAt = time.Now().UTC()
	res, err := r.db.ExecContext(ctx, `
		UPDATE targets SET
			name = ?, host = ?, enabled = ?, interval_seconds = ?, timeout_seconds = ?, retry_count = ?, retry_delay_seconds = ?,
			updated_at = ?, last_status = ?, last_latency_ms = ?, last_checked_at = ?, last_success_at = ?, last_failure_at = ?,
			consecutive_failures = ?, consecutive_successes = ?, group_id = ?, muted_until = ?
		WHERE id = ?`,
		t.Name, t.Host, boolToInt(t.Enabled), t.Interval, t.Timeout, t.RetryCount, t.RetryDelay,
		t.UpdatedAt.Format(time.RFC3339Nano), t.LastStatus, nullInt(t.LastLatency),
		nullTime(t.LastCheckedAt), nullTime(t.LastSuccessAt), nullTime(t.LastFailureAt),
		t.ConsecutiveFailures, t.ConsecutiveSuccesses, nullEmpty(t.GroupID), nullEmpty(t.MutedUntil), t.ID,
	)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return domain.Target{}, domain.ErrDuplicateTarget
		}
		return domain.Target{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.Target{}, domain.ErrNotFound
	}
	return r.Get(ctx, t.ID)
}

func (r *TargetRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM targets WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *TargetRepository) Stats(ctx context.Context) (domain.DashboardStats, error) {
	var stats domain.DashboardStats
	err := r.db.QueryRowContext(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(CASE WHEN enabled = 1 AND last_status = 'online' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN enabled = 1 AND last_status = 'offline' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN enabled = 1 AND last_status = 'unknown' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN enabled = 0 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN enabled = 1 AND (last_status = 'offline' OR consecutive_failures > 0) THEN 1 ELSE 0 END), 0)
		FROM targets`).Scan(
		&stats.TotalTargets, &stats.Online, &stats.Offline, &stats.Unknown, &stats.Disabled, &stats.ErrorCount,
	)
	if err != nil {
		return stats, err
	}
	var last sql.NullString
	if err := r.db.QueryRowContext(ctx, `SELECT MAX(last_checked_at) FROM targets`).Scan(&last); err != nil {
		return stats, err
	}
	if last.Valid {
		t, err := time.Parse(time.RFC3339Nano, last.String)
		if err == nil {
			stats.LastCheck = &t
		}
	}
	return stats, nil
}

func (r *TargetRepository) Metrics(ctx context.Context, targetID string) (domain.TargetMetrics, error) {
	var m domain.TargetMetrics
	var avg, min, max sql.NullFloat64
	err := r.db.QueryRowContext(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END), 0),
			AVG(CASE WHEN success = 1 THEN latency_ms END),
			MIN(CASE WHEN success = 1 THEN latency_ms END),
			MAX(CASE WHEN success = 1 THEN latency_ms END)
		FROM ping_results WHERE target_id = ?`, targetID).Scan(
		&m.TotalChecks, &m.Successful, &m.Failed, &avg, &min, &max,
	)
	if err != nil {
		return m, err
	}
	if m.TotalChecks > 0 {
		m.UptimePercent = (float64(m.Successful) / float64(m.TotalChecks)) * 100
	}
	if avg.Valid {
		v := int64(avg.Float64)
		m.AverageLatency = &v
	}
	if min.Valid {
		v := int64(min.Float64)
		m.MinLatency = &v
	}
	if max.Valid {
		v := int64(max.Float64)
		m.MaxLatency = &v
	}
	return m, nil
}

const targetColumns = `t.id, t.name, t.host, t.enabled, t.interval_seconds, t.timeout_seconds, t.retry_count, t.retry_delay_seconds,
	t.created_at, t.updated_at, t.last_status, t.last_latency_ms, t.last_checked_at, t.last_success_at, t.last_failure_at,
	t.consecutive_failures, t.consecutive_successes, IFNULL(t.group_id,''), IFNULL(t.muted_until,''), IFNULL(g.name,''), IFNULL(g.color,'')`

type scanner interface {
	Scan(dest ...any) error
}

func scanTarget(s scanner) (domain.Target, error) {
	var t domain.Target
	var enabled int
	var created, updated string
	var lastStatus string
	var latency sql.NullInt64
	var checked, successAt, failAt sql.NullString
	err := s.Scan(
		&t.ID, &t.Name, &t.Host, &enabled, &t.Interval, &t.Timeout, &t.RetryCount, &t.RetryDelay,
		&created, &updated, &lastStatus, &latency, &checked, &successAt, &failAt,
		&t.ConsecutiveFailures, &t.ConsecutiveSuccesses, &t.GroupID, &t.MutedUntil, &t.GroupName, &t.GroupColor,
	)
	if err != nil {
		return t, err
	}
	t.Enabled = enabled == 1
	t.LastStatus = domain.TargetStatus(lastStatus)
	t.CreatedAt, _ = time.Parse(time.RFC3339Nano, created)
	t.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updated)
	if latency.Valid {
		v := latency.Int64
		t.LastLatency = &v
	}
	t.LastCheckedAt = parseNullTime(checked)
	t.LastSuccessAt = parseNullTime(successAt)
	t.LastFailureAt = parseNullTime(failAt)
	return t, nil
}

func parseNullTime(v sql.NullString) *time.Time {
	if !v.Valid || v.String == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339Nano, v.String)
	if err != nil {
		t, err = time.Parse(time.RFC3339, v.String)
		if err != nil {
			return nil
		}
	}
	return &t
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func nullInt(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}

func nullTime(v *time.Time) any {
	if v == nil {
		return nil
	}
	return v.UTC().Format(time.RFC3339Nano)
}

func nullString(v *string) any {
	if v == nil {
		return nil
	}
	return *v
}

func nullEmpty(v string) any {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return v
}

func parseJSONMap(raw sql.NullString) map[string]string {
	out := map[string]string{}
	if !raw.Valid || strings.TrimSpace(raw.String) == "" {
		return out
	}
	_ = json.Unmarshal([]byte(raw.String), &out)
	return out
}

func marshalJSONMap(m map[string]string) string {
	if m == nil {
		m = map[string]string{}
	}
	b, err := json.Marshal(m)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func wrap(err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%w", err)
}
