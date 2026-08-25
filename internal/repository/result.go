package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"pingpulse/internal/domain"

	"github.com/google/uuid"
)

type ResultRepository struct {
	db *sql.DB
}

func NewResultRepository(db *sql.DB) *ResultRepository {
	return &ResultRepository{db: db}
}

func (r *ResultRepository) Insert(ctx context.Context, res domain.PingResult) (domain.PingResult, error) {
	if res.ID == "" {
		res.ID = uuid.NewString()
	}
	if res.Timestamp.IsZero() {
		res.Timestamp = time.Now().UTC()
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ping_results (id, target_id, timestamp, success, latency_ms, error, duration_ms)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		res.ID, res.TargetID, res.Timestamp.UTC().Format(time.RFC3339Nano), boolToInt(res.Success),
		nullInt(res.LatencyMs), nullString(res.Error), res.DurationMs,
	)
	return res, err
}

func (r *ResultRepository) List(ctx context.Context, f domain.HistoryFilter) (domain.HistoryPage, error) {
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 100
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	where, args := historyWhere(f)
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM ping_results r LEFT JOIN targets t ON t.id = r.target_id `+where, args...).Scan(&total); err != nil {
		return domain.HistoryPage{}, err
	}
	query := `SELECT r.id, r.target_id, r.timestamp, r.success, r.latency_ms, r.error, r.duration_ms
		FROM ping_results r LEFT JOIN targets t ON t.id = r.target_id ` + where + ` ORDER BY r.timestamp DESC LIMIT ? OFFSET ?`
	args = append(args, f.Limit, f.Offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.HistoryPage{}, err
	}
	defer rows.Close()
	items := make([]domain.PingResult, 0)
	for rows.Next() {
		item, err := scanResult(rows)
		if err != nil {
			return domain.HistoryPage{}, err
		}
		items = append(items, item)
	}
	return domain.HistoryPage{Items: items, Total: total, Limit: f.Limit, Offset: f.Offset}, rows.Err()
}

func (r *ResultRepository) Recent(ctx context.Context, targetID string, limit int) ([]domain.PingResult, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, target_id, timestamp, success, latency_ms, error, duration_ms
		FROM ping_results WHERE target_id = ? ORDER BY timestamp DESC LIMIT ?`, targetID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.PingResult, 0)
	for rows.Next() {
		item, err := scanResult(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ResultRepository) Series(ctx context.Context, targetID string, limit int) ([]domain.LatencyPoint, error) {
	if limit <= 0 {
		limit = 120
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT timestamp, success, latency_ms FROM ping_results
		WHERE target_id = ? ORDER BY timestamp DESC LIMIT ?`, targetID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	points := make([]domain.LatencyPoint, 0)
	for rows.Next() {
		var ts string
		var success int
		var latency sql.NullInt64
		if err := rows.Scan(&ts, &success, &latency); err != nil {
			return nil, err
		}
		t, _ := time.Parse(time.RFC3339Nano, ts)
		p := domain.LatencyPoint{Timestamp: t, Success: success == 1}
		if latency.Valid {
			v := latency.Int64
			p.Latency = &v
		}
		points = append(points, p)
	}
	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}
	return points, rows.Err()
}

func (r *ResultRepository) Prune(ctx context.Context, targetID string, keep int) error {
	if keep < 100 {
		keep = 100
	}
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM ping_results WHERE target_id = ? AND id NOT IN (
			SELECT id FROM ping_results WHERE target_id = ? ORDER BY timestamp DESC LIMIT ?
		)`, targetID, targetID, keep)
	return err
}

func historyWhere(f domain.HistoryFilter) (string, []any) {
	clauses := make([]string, 0)
	args := make([]any, 0)
	if f.TargetID != "" {
		clauses = append(clauses, "r.target_id = ?")
		args = append(args, f.TargetID)
	}
	switch strings.ToLower(f.Status) {
	case "success", "online":
		clauses = append(clauses, "r.success = 1")
	case "failure", "offline":
		clauses = append(clauses, "r.success = 0")
	}
	if f.From != "" {
		clauses = append(clauses, "r.timestamp >= ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		clauses = append(clauses, "r.timestamp <= ?")
		args = append(args, f.To)
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		like := "%" + s + "%"
		clauses = append(clauses, "(t.name LIKE ? OR t.host LIKE ? OR IFNULL(r.error,'') LIKE ?)")
		args = append(args, like, like, like)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}

func scanResult(s scanner) (domain.PingResult, error) {
	var res domain.PingResult
	var ts string
	var success int
	var latency sql.NullInt64
	var errMsg sql.NullString
	if err := s.Scan(&res.ID, &res.TargetID, &ts, &success, &latency, &errMsg, &res.DurationMs); err != nil {
		return res, err
	}
	res.Timestamp, _ = time.Parse(time.RFC3339Nano, ts)
	res.Success = success == 1
	if latency.Valid {
		v := latency.Int64
		res.LatencyMs = &v
	}
	if errMsg.Valid {
		v := errMsg.String
		res.Error = &v
	}
	return res, nil
}
