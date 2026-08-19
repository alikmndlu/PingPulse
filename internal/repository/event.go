package repository

import (
	"context"
	"database/sql"
	"time"

	"pingpulse/internal/domain"

	"github.com/google/uuid"
)

type EventRepository struct {
	db *sql.DB
}

func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

func (r *EventRepository) Insert(ctx context.Context, e domain.Event) (domain.Event, error) {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now().UTC()
	}
	var target any
	if e.TargetID != "" {
		target = e.TargetID
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO events (id, target_id, type, message, created_at, metadata)
		VALUES (?, ?, ?, ?, ?, ?)`,
		e.ID, target, e.Type, e.Message, e.CreatedAt.UTC().Format(time.RFC3339Nano), e.Metadata,
	)
	return e, err
}

func (r *EventRepository) List(ctx context.Context, f domain.EventFilter) ([]domain.Event, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	query := `SELECT id, IFNULL(target_id,''), type, message, created_at, IFNULL(metadata,'') FROM events WHERE 1=1`
	args := make([]any, 0)
	if f.TargetID != "" {
		query += ` AND target_id = ?`
		args = append(args, f.TargetID)
	}
	if f.Type != "" {
		query += ` AND type = ?`
		args = append(args, f.Type)
	}
	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, f.Limit, f.Offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.Event, 0)
	for rows.Next() {
		var e domain.Event
		var ts string
		if err := rows.Scan(&e.ID, &e.TargetID, &e.Type, &e.Message, &ts, &e.Metadata); err != nil {
			return nil, err
		}
		e.CreatedAt, _ = time.Parse(time.RFC3339Nano, ts)
		items = append(items, e)
	}
	return items, rows.Err()
}
