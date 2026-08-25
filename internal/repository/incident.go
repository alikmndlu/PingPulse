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

type IncidentRepository struct {
	db *sql.DB
}

func NewIncidentRepository(db *sql.DB) *IncidentRepository {
	return &IncidentRepository{db: db}
}

func (r *IncidentRepository) Open(ctx context.Context, target domain.Target, summary string, failures int) (domain.Incident, error) {
	if existing, err := r.GetOpen(ctx, target.ID); err == nil {
		existing.FailureCount = failures
		existing.Summary = summary
		existing.UpdatedAt = time.Now().UTC()
		return r.update(ctx, existing)
	}
	now := time.Now().UTC()
	inc := domain.Incident{
		ID:           uuid.NewString(),
		TargetID:     target.ID,
		TargetName:   target.Name,
		Host:         target.Host,
		ProbeType:    domain.NormalizeProbeType(string(target.ProbeType)),
		Status:       domain.IncidentOpen,
		StartedAt:    now,
		FailureCount: failures,
		Summary:      summary,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO incidents (
			id, target_id, probe_type, status, started_at, ended_at, duration_seconds, failure_count, summary, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?)`,
		inc.ID, inc.TargetID, inc.ProbeType, inc.Status, inc.StartedAt.Format(time.RFC3339Nano),
		inc.FailureCount, inc.Summary, inc.CreatedAt.Format(time.RFC3339Nano), inc.UpdatedAt.Format(time.RFC3339Nano),
	)
	return inc, err
}

func (r *IncidentRepository) Resolve(ctx context.Context, targetID string, summary string) (domain.Incident, error) {
	inc, err := r.GetOpen(ctx, targetID)
	if err != nil {
		return domain.Incident{}, err
	}
	now := time.Now().UTC()
	inc.Status = domain.IncidentResolved
	inc.EndedAt = &now
	inc.DurationSeconds = int64(now.Sub(inc.StartedAt).Seconds())
	if summary != "" {
		inc.Summary = summary
	}
	inc.UpdatedAt = now
	return r.update(ctx, inc)
}

func (r *IncidentRepository) TouchOpen(ctx context.Context, targetID string, failures int) error {
	inc, err := r.GetOpen(ctx, targetID)
	if err != nil {
		return err
	}
	inc.FailureCount = failures
	inc.UpdatedAt = time.Now().UTC()
	_, err = r.update(ctx, inc)
	return err
}

func (r *IncidentRepository) GetOpen(ctx context.Context, targetID string) (domain.Incident, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT i.id, i.target_id, IFNULL(t.name,''), IFNULL(t.host,''), i.probe_type, i.status, i.started_at, i.ended_at,
			i.duration_seconds, i.failure_count, i.summary, i.created_at, i.updated_at
		FROM incidents i LEFT JOIN targets t ON t.id = i.target_id
		WHERE i.target_id = ? AND i.status = 'open'
		ORDER BY i.started_at DESC LIMIT 1`, targetID)
	inc, err := scanIncident(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Incident{}, domain.ErrNotFound
	}
	return inc, err
}

func (r *IncidentRepository) Get(ctx context.Context, id string) (domain.Incident, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT i.id, i.target_id, IFNULL(t.name,''), IFNULL(t.host,''), i.probe_type, i.status, i.started_at, i.ended_at,
			i.duration_seconds, i.failure_count, i.summary, i.created_at, i.updated_at
		FROM incidents i LEFT JOIN targets t ON t.id = i.target_id WHERE i.id = ?`, id)
	inc, err := scanIncident(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Incident{}, domain.ErrNotFound
	}
	return inc, err
}

func (r *IncidentRepository) List(ctx context.Context, f domain.IncidentFilter) (domain.IncidentPage, error) {
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 100
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	where, args := incidentWhere(f)
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM incidents i LEFT JOIN targets t ON t.id = i.target_id `+where, args...).Scan(&total); err != nil {
		return domain.IncidentPage{}, err
	}
	query := `
		SELECT i.id, i.target_id, IFNULL(t.name,''), IFNULL(t.host,''), i.probe_type, i.status, i.started_at, i.ended_at,
			i.duration_seconds, i.failure_count, i.summary, i.created_at, i.updated_at
		FROM incidents i LEFT JOIN targets t ON t.id = i.target_id ` + where + ` ORDER BY i.started_at DESC LIMIT ? OFFSET ?`
	args = append(args, f.Limit, f.Offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.IncidentPage{}, err
	}
	defer rows.Close()
	items := make([]domain.Incident, 0)
	for rows.Next() {
		inc, err := scanIncident(rows)
		if err != nil {
			return domain.IncidentPage{}, err
		}
		items = append(items, inc)
	}
	return domain.IncidentPage{Items: items, Total: total, Limit: f.Limit, Offset: f.Offset}, rows.Err()
}

func (r *IncidentRepository) OpenCount(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM incidents WHERE status = 'open'`).Scan(&n)
	return n, err
}

func (r *IncidentRepository) Report(ctx context.Context, from, to time.Time) (domain.IncidentReport, error) {
	report := domain.IncidentReport{
		From:     from.UTC().Format(time.RFC3339),
		To:       to.UTC().Format(time.RFC3339),
		ByTarget: []domain.IncidentTargetStat{},
		Recent:   []domain.Incident{},
	}
	windowSec := to.Sub(from).Seconds()
	if windowSec < 1 {
		windowSec = 1
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT i.id, i.target_id, IFNULL(t.name,''), IFNULL(t.host,''), i.probe_type, i.status, i.started_at, i.ended_at,
			i.duration_seconds, i.failure_count, i.summary, i.created_at, i.updated_at
		FROM incidents i LEFT JOIN targets t ON t.id = i.target_id
		WHERE i.started_at <= ? AND (i.ended_at IS NULL OR i.ended_at >= ?)
		ORDER BY i.started_at DESC`, to.UTC().Format(time.RFC3339Nano), from.UTC().Format(time.RFC3339Nano))
	if err != nil {
		return report, err
	}
	defer rows.Close()
	byTarget := map[string]*domain.IncidentTargetStat{}
	var mttrSum int64
	var mttrN int
	for rows.Next() {
		inc, err := scanIncident(rows)
		if err != nil {
			return report, err
		}
		report.TotalIncidents++
		if inc.Status == domain.IncidentOpen {
			report.OpenIncidents++
		} else {
			report.ResolvedIncidents++
			mttrSum += inc.DurationSeconds
			mttrN++
		}
		overlap := incidentOverlapSec(inc, from, to)
		report.TotalDowntimeSec += overlap
		if overlap > report.LongestOutageSec {
			report.LongestOutageSec = overlap
		}
		st := byTarget[inc.TargetID]
		if st == nil {
			st = &domain.IncidentTargetStat{TargetID: inc.TargetID, TargetName: inc.TargetName, Host: inc.Host}
			byTarget[inc.TargetID] = st
		}
		st.Incidents++
		if inc.Status == domain.IncidentOpen {
			st.Open++
		}
		st.DowntimeSec += overlap
		if len(report.Recent) < 20 {
			report.Recent = append(report.Recent, inc)
		}
	}
	if err := rows.Err(); err != nil {
		return report, err
	}
	if mttrN > 0 {
		report.AverageMTTRSec = mttrSum / int64(mttrN)
	}
	for _, st := range byTarget {
		up := 100 - (float64(st.DowntimeSec)/windowSec)*100
		if up < 0 {
			up = 0
		}
		if up > 100 {
			up = 100
		}
		st.UptimePercent = up
		report.ByTarget = append(report.ByTarget, *st)
	}
	return report, nil
}

func (r *IncidentRepository) update(ctx context.Context, inc domain.Incident) (domain.Incident, error) {
	_, err := r.db.ExecContext(ctx, `
		UPDATE incidents SET status = ?, ended_at = ?, duration_seconds = ?, failure_count = ?, summary = ?, updated_at = ?
		WHERE id = ?`,
		inc.Status, nullTime(inc.EndedAt), inc.DurationSeconds, inc.FailureCount, inc.Summary,
		inc.UpdatedAt.Format(time.RFC3339Nano), inc.ID,
	)
	return inc, err
}

func incidentWhere(f domain.IncidentFilter) (string, []any) {
	clauses := make([]string, 0)
	args := make([]any, 0)
	if f.TargetID != "" {
		clauses = append(clauses, "i.target_id = ?")
		args = append(args, f.TargetID)
	}
	switch strings.ToLower(f.Status) {
	case "open", "resolved":
		clauses = append(clauses, "i.status = ?")
		args = append(args, strings.ToLower(f.Status))
	}
	if f.From != "" {
		clauses = append(clauses, "i.started_at >= ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		clauses = append(clauses, "i.started_at <= ?")
		args = append(args, f.To)
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		like := "%" + s + "%"
		clauses = append(clauses, "(t.name LIKE ? OR t.host LIKE ? OR i.summary LIKE ?)")
		args = append(args, like, like, like)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}

func incidentOverlapSec(inc domain.Incident, from, to time.Time) int64 {
	start := inc.StartedAt
	end := to
	if inc.EndedAt != nil {
		end = *inc.EndedAt
	} else {
		end = time.Now().UTC()
	}
	if start.Before(from) {
		start = from
	}
	if end.After(to) {
		end = to
	}
	if !end.After(start) {
		return 0
	}
	return int64(end.Sub(start).Seconds())
}

func scanIncident(s scanner) (domain.Incident, error) {
	var inc domain.Incident
	var probe, status, started, created, updated string
	var ended sql.NullString
	err := s.Scan(
		&inc.ID, &inc.TargetID, &inc.TargetName, &inc.Host, &probe, &status, &started, &ended,
		&inc.DurationSeconds, &inc.FailureCount, &inc.Summary, &created, &updated,
	)
	if err != nil {
		return inc, err
	}
	inc.ProbeType = domain.NormalizeProbeType(probe)
	inc.Status = domain.IncidentStatus(status)
	if t := parseNullTime(sql.NullString{String: started, Valid: true}); t != nil {
		inc.StartedAt = *t
	}
	inc.EndedAt = parseNullTime(ended)
	if t := parseNullTime(sql.NullString{String: created, Valid: true}); t != nil {
		inc.CreatedAt = *t
	}
	if t := parseNullTime(sql.NullString{String: updated, Valid: true}); t != nil {
		inc.UpdatedAt = *t
	}
	if inc.Status == domain.IncidentOpen && inc.EndedAt == nil {
		inc.DurationSeconds = int64(time.Since(inc.StartedAt).Seconds())
	}
	return inc, nil
}
