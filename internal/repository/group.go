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

type GroupRepository struct {
	db *sql.DB
}

func NewGroupRepository(db *sql.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

func (r *GroupRepository) List(ctx context.Context) ([]domain.TargetGroup, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+groupColumns+` FROM target_groups ORDER BY name COLLATE NOCASE ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.TargetGroup, 0)
	for rows.Next() {
		g, err := scanGroup(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, g)
	}
	return items, rows.Err()
}

func (r *GroupRepository) Get(ctx context.Context, id string) (domain.TargetGroup, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+groupColumns+` FROM target_groups WHERE id = ?`, id)
	g, err := scanGroup(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.TargetGroup{}, domain.ErrNotFound
	}
	return g, err
}

func (r *GroupRepository) GetByName(ctx context.Context, name string) (domain.TargetGroup, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+groupColumns+` FROM target_groups WHERE name = ? COLLATE NOCASE`, strings.TrimSpace(name))
	g, err := scanGroup(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.TargetGroup{}, domain.ErrNotFound
	}
	return g, err
}

func (r *GroupRepository) Create(ctx context.Context, g domain.TargetGroup) (domain.TargetGroup, error) {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	now := time.Now().UTC()
	g.CreatedAt = now
	g.UpdatedAt = now
	if g.Color == "" {
		g.Color = domain.DefaultGroupColor
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO target_groups (id, name, color, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)`,
		g.ID, g.Name, g.Color, g.CreatedAt.Format(time.RFC3339Nano), g.UpdatedAt.Format(time.RFC3339Nano),
	)
	if err != nil {
		if isUniqueErr(err) {
			return domain.TargetGroup{}, domain.ErrDuplicateGroup
		}
		return domain.TargetGroup{}, err
	}
	return g, nil
}

func (r *GroupRepository) Update(ctx context.Context, g domain.TargetGroup) (domain.TargetGroup, error) {
	g.UpdatedAt = time.Now().UTC()
	res, err := r.db.ExecContext(ctx, `
		UPDATE target_groups SET name = ?, color = ?, updated_at = ? WHERE id = ?`,
		g.Name, g.Color, g.UpdatedAt.Format(time.RFC3339Nano), g.ID,
	)
	if err != nil {
		if isUniqueErr(err) {
			return domain.TargetGroup{}, domain.ErrDuplicateGroup
		}
		return domain.TargetGroup{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.TargetGroup{}, domain.ErrNotFound
	}
	return g, nil
}

func (r *GroupRepository) Delete(ctx context.Context, id string) error {
	if _, err := r.db.ExecContext(ctx, `UPDATE targets SET group_id = NULL WHERE group_id = ?`, id); err != nil {
		return err
	}
	res, err := r.db.ExecContext(ctx, `DELETE FROM target_groups WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *GroupRepository) EnsureByName(ctx context.Context, name, color string) (domain.TargetGroup, error) {
	existing, err := r.GetByName(ctx, name)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, domain.ErrNotFound) {
		return domain.TargetGroup{}, err
	}
	return r.Create(ctx, domain.TargetGroup{Name: name, Color: color})
}

const groupColumns = `id, name, color, created_at, updated_at`

func scanGroup(s scanner) (domain.TargetGroup, error) {
	var g domain.TargetGroup
	var created, updated string
	err := s.Scan(&g.ID, &g.Name, &g.Color, &created, &updated)
	if err != nil {
		return g, err
	}
	g.CreatedAt, _ = time.Parse(time.RFC3339Nano, created)
	g.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updated)
	return g, nil
}

func isUniqueErr(err error) bool {
	return strings.Contains(strings.ToLower(err.Error()), "unique")
}
