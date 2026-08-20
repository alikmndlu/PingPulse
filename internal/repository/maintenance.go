package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"pingpulse/internal/domain"

	"github.com/google/uuid"
)

type MaintenanceRepository struct {
	db *sql.DB
}

func NewMaintenanceRepository(db *sql.DB) *MaintenanceRepository {
	return &MaintenanceRepository{db: db}
}

func (r *MaintenanceRepository) List(ctx context.Context) ([]domain.MaintenanceWindow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT m.id, m.name, IFNULL(m.target_id,''), IFNULL(m.group_id,''), m.starts_at, m.ends_at, IFNULL(m.reason,''),
			m.suppress_checks, m.suppress_notifications, m.enabled, m.created_at, m.updated_at,
			IFNULL(t.name,''), IFNULL(g.name,'')
		FROM maintenance_windows m
		LEFT JOIN targets t ON t.id = m.target_id
		LEFT JOIN target_groups g ON g.id = m.group_id
		ORDER BY m.starts_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	now := time.Now().UTC()
	items := make([]domain.MaintenanceWindow, 0)
	for rows.Next() {
		w, err := scanMaintenance(rows)
		if err != nil {
			return nil, err
		}
		w.Active = w.Enabled && !now.Before(w.StartsAt) && now.Before(w.EndsAt)
		items = append(items, w)
	}
	return items, rows.Err()
}

func (r *MaintenanceRepository) Get(ctx context.Context, id string) (domain.MaintenanceWindow, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT m.id, m.name, IFNULL(m.target_id,''), IFNULL(m.group_id,''), m.starts_at, m.ends_at, IFNULL(m.reason,''),
			m.suppress_checks, m.suppress_notifications, m.enabled, m.created_at, m.updated_at,
			IFNULL(t.name,''), IFNULL(g.name,'')
		FROM maintenance_windows m
		LEFT JOIN targets t ON t.id = m.target_id
		LEFT JOIN target_groups g ON g.id = m.group_id
		WHERE m.id = ?`, id)
	w, err := scanMaintenance(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.MaintenanceWindow{}, domain.ErrNotFound
	}
	if err != nil {
		return w, err
	}
	now := time.Now().UTC()
	w.Active = w.Enabled && !now.Before(w.StartsAt) && now.Before(w.EndsAt)
	return w, nil
}

func (r *MaintenanceRepository) Create(ctx context.Context, w domain.MaintenanceWindow) (domain.MaintenanceWindow, error) {
	if w.ID == "" {
		w.ID = uuid.NewString()
	}
	now := time.Now().UTC()
	w.CreatedAt = now
	w.UpdatedAt = now
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO maintenance_windows (
			id, name, target_id, group_id, starts_at, ends_at, reason,
			suppress_checks, suppress_notifications, enabled, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		w.ID, w.Name, nullEmpty(w.TargetID), nullEmpty(w.GroupID),
		w.StartsAt.UTC().Format(time.RFC3339Nano), w.EndsAt.UTC().Format(time.RFC3339Nano), w.Reason,
		boolToInt(w.SuppressChecks), boolToInt(w.SuppressNotifications), boolToInt(w.Enabled),
		w.CreatedAt.Format(time.RFC3339Nano), w.UpdatedAt.Format(time.RFC3339Nano),
	)
	if err != nil {
		return domain.MaintenanceWindow{}, err
	}
	return r.Get(ctx, w.ID)
}

func (r *MaintenanceRepository) Update(ctx context.Context, w domain.MaintenanceWindow) (domain.MaintenanceWindow, error) {
	w.UpdatedAt = time.Now().UTC()
	res, err := r.db.ExecContext(ctx, `
		UPDATE maintenance_windows SET
			name = ?, target_id = ?, group_id = ?, starts_at = ?, ends_at = ?, reason = ?,
			suppress_checks = ?, suppress_notifications = ?, enabled = ?, updated_at = ?
		WHERE id = ?`,
		w.Name, nullEmpty(w.TargetID), nullEmpty(w.GroupID),
		w.StartsAt.UTC().Format(time.RFC3339Nano), w.EndsAt.UTC().Format(time.RFC3339Nano), w.Reason,
		boolToInt(w.SuppressChecks), boolToInt(w.SuppressNotifications), boolToInt(w.Enabled),
		w.UpdatedAt.Format(time.RFC3339Nano), w.ID,
	)
	if err != nil {
		return domain.MaintenanceWindow{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.MaintenanceWindow{}, domain.ErrNotFound
	}
	return r.Get(ctx, w.ID)
}

func (r *MaintenanceRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM maintenance_windows WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *MaintenanceRepository) EffectFor(ctx context.Context, target domain.Target, at time.Time) (domain.MaintenanceEffect, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT m.id, m.name, IFNULL(m.target_id,''), IFNULL(m.group_id,''), m.starts_at, m.ends_at, IFNULL(m.reason,''),
			m.suppress_checks, m.suppress_notifications, m.enabled, m.created_at, m.updated_at, '', ''
		FROM maintenance_windows m
		WHERE m.enabled = 1 AND m.starts_at <= ? AND m.ends_at > ?
		ORDER BY m.starts_at DESC`, at.UTC().Format(time.RFC3339Nano), at.UTC().Format(time.RFC3339Nano))
	if err != nil {
		return domain.MaintenanceEffect{}, err
	}
	defer rows.Close()
	effect := domain.MaintenanceEffect{}
	for rows.Next() {
		w, err := scanMaintenance(rows)
		if err != nil {
			return domain.MaintenanceEffect{}, err
		}
		if !w.Covers(target, at) {
			continue
		}
		effect.Active = true
		if w.SuppressChecks {
			effect.SuppressChecks = true
		}
		if w.SuppressNotifications {
			effect.SuppressNotifications = true
		}
		cp := w
		effect.Window = &cp
		if effect.SuppressChecks && effect.SuppressNotifications {
			break
		}
	}
	return effect, rows.Err()
}

func (r *MaintenanceRepository) ActiveCount(ctx context.Context) (int, error) {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	var n int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM maintenance_windows
		WHERE enabled = 1 AND starts_at <= ? AND ends_at > ?`, now, now).Scan(&n)
	return n, err
}

func scanMaintenance(s scanner) (domain.MaintenanceWindow, error) {
	var w domain.MaintenanceWindow
	var starts, ends, created, updated string
	var suppressChecks, suppressNotif, enabled int
	err := s.Scan(
		&w.ID, &w.Name, &w.TargetID, &w.GroupID, &starts, &ends, &w.Reason,
		&suppressChecks, &suppressNotif, &enabled, &created, &updated,
		&w.TargetName, &w.GroupName,
	)
	if err != nil {
		return w, err
	}
	w.SuppressChecks = suppressChecks == 1
	w.SuppressNotifications = suppressNotif == 1
	w.Enabled = enabled == 1
	if t := parseNullTime(sql.NullString{String: starts, Valid: true}); t != nil {
		w.StartsAt = *t
	}
	if t := parseNullTime(sql.NullString{String: ends, Valid: true}); t != nil {
		w.EndsAt = *t
	}
	if t := parseNullTime(sql.NullString{String: created, Valid: true}); t != nil {
		w.CreatedAt = *t
	}
	if t := parseNullTime(sql.NullString{String: updated, Valid: true}); t != nil {
		w.UpdatedAt = *t
	}
	return w, nil
}

func ParseTimeInput(raw string) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, domain.NewValidationError("time", "time is required")
	}
	formats := []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05", "2006-01-02 15:04:05", "2006-01-02T15:04"}
	for _, f := range formats {
		if t, err := time.ParseInLocation(f, raw, time.Local); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Time{}, domain.NewValidationError("time", "invalid datetime")
}
