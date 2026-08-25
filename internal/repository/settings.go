package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"pingpulse/internal/domain"
)

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) Get(ctx context.Context) (domain.Settings, error) {
	var raw string
	err := r.db.QueryRowContext(ctx, `SELECT data FROM app_settings WHERE id = 1`).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		s := domain.DefaultSettings()
		if err := r.Save(ctx, s); err != nil {
			return s, err
		}
		return s, nil
	}
	if err != nil {
		return domain.Settings{}, err
	}
	s := domain.DefaultSettings()
	if err := json.Unmarshal([]byte(raw), &s); err != nil {
		return domain.DefaultSettings(), nil
	}
	return s.Normalized(), nil
}

func (r *SettingsRepository) Save(ctx context.Context, s domain.Settings) error {
	s = s.Normalized()
	b, err := json.Marshal(s)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO app_settings (id, data) VALUES (1, ?)
		ON CONFLICT(id) DO UPDATE SET data = excluded.data`, string(b))
	return err
}

type NotificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Get(ctx context.Context, provider string) (domain.NotificationConfig, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, provider, enabled, IFNULL(api_url,''), IFNULL(api_key,''), IFNULL(sender,''), IFNULL(recipient,''),
			IFNULL(http_method,'POST'), IFNULL(custom_headers,'{}'), IFNULL(body_template,'')
		FROM notification_configs WHERE provider = ?`, provider)
	c, err := scanNotif(row)
	if errors.Is(err, sql.ErrNoRows) {
		return defaultConfig(provider), nil
	}
	return c, err
}

func (r *NotificationRepository) Save(ctx context.Context, c domain.NotificationConfig) error {
	if c.ID == "" {
		c.ID = c.Provider
	}
	if c.HTTPMethod == "" {
		c.HTTPMethod = "POST"
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO notification_configs (
			id, provider, enabled, api_url, api_key, sender, recipient, http_method, custom_headers, body_template, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(provider) DO UPDATE SET
			enabled = excluded.enabled,
			api_url = excluded.api_url,
			api_key = excluded.api_key,
			sender = excluded.sender,
			recipient = excluded.recipient,
			http_method = excluded.http_method,
			custom_headers = excluded.custom_headers,
			body_template = excluded.body_template,
			updated_at = excluded.updated_at`,
		c.ID, c.Provider, boolToInt(c.Enabled), c.APIURL, c.APIKey, c.Sender, c.Recipient, c.HTTPMethod,
		marshalJSONMap(c.CustomHeaders), c.BodyTemplate, time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (r *NotificationRepository) LastSent(ctx context.Context, targetID, kind string) (*time.Time, error) {
	var raw string
	err := r.db.QueryRowContext(ctx, `SELECT last_sent_at FROM notification_cooldowns WHERE target_id = ? AND kind = ?`, targetID, kind).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	t, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return nil, nil
	}
	return &t, nil
}

func (r *NotificationRepository) MarkSent(ctx context.Context, targetID, kind string, at time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO notification_cooldowns (target_id, kind, last_sent_at) VALUES (?, ?, ?)
		ON CONFLICT(target_id, kind) DO UPDATE SET last_sent_at = excluded.last_sent_at`,
		targetID, kind, at.UTC().Format(time.RFC3339Nano),
	)
	return err
}

func defaultConfig(provider string) domain.NotificationConfig {
	c := domain.NotificationConfig{
		ID:            provider,
		Provider:      provider,
		HTTPMethod:    "POST",
		CustomHeaders: map[string]string{},
	}
	switch provider {
	case domain.ProviderSMS:
		c.APIURL = domain.DefaultMelipayamakURL()
		c.BodyTemplate = domain.DefaultSMSTemplate()
	case domain.ProviderWebhook:
		c.BodyTemplate = domain.DefaultWebhookTemplate()
	case domain.ProviderTelegram:
		c.APIURL = domain.DefaultTelegramAPI()
		c.BodyTemplate = domain.DefaultTelegramTemplate()
	}
	return c
}

func scanNotif(s scanner) (domain.NotificationConfig, error) {
	var c domain.NotificationConfig
	var enabled int
	var headers sql.NullString
	err := s.Scan(&c.ID, &c.Provider, &enabled, &c.APIURL, &c.APIKey, &c.Sender, &c.Recipient, &c.HTTPMethod, &headers, &c.BodyTemplate)
	if err != nil {
		return c, err
	}
	c.Enabled = enabled == 1
	c.APIKeySet = c.APIKey != ""
	c.CustomHeaders = parseJSONMap(headers)
	return c, nil
}
