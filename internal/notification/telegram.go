package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

const telegramMaxText = 4096

type TelegramProvider struct {
	repo   *repository.NotificationRepository
	client *http.Client
}

func NewTelegramProvider(repo *repository.NotificationRepository) *TelegramProvider {
	return &TelegramProvider{
		repo:   repo,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *TelegramProvider) Name() string {
	return domain.ProviderTelegram
}

func (p *TelegramProvider) Send(ctx context.Context, n domain.Notification) error {
	cfg, err := p.repo.Get(ctx, domain.ProviderTelegram)
	if err != nil {
		return err
	}
	token := strings.TrimSpace(cfg.APIKey)
	chatID := strings.TrimSpace(cfg.Recipient)
	if token == "" || chatID == "" {
		return fmt.Errorf("telegram bot token and chat id are required")
	}
	text := telegramText(cfg, n)
	if utf8.RuneCountInString(text) > telegramMaxText {
		runes := []rune(text)
		text = string(runes[:telegramMaxText-1]) + "…"
	}
	base := strings.TrimRight(strings.TrimSpace(cfg.APIURL), "/")
	if base == "" {
		base = domain.DefaultTelegramAPI()
	}
	endpoint := base + "/bot" + token + "/sendMessage"
	payload, err := json.Marshal(map[string]any{
		"chat_id":                  chatID,
		"text":                     text,
		"disable_web_page_preview": true,
	})
	if err != nil {
		return fmt.Errorf("invalid telegram payload")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("invalid telegram request")
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "PingPulse/1.0")
	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("unable to send telegram notification")
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telegram provider returned status %d", resp.StatusCode)
	}
	var parsed struct {
		OK bool `json:"ok"`
	}
	if len(body) > 0 && json.Unmarshal(body, &parsed) == nil && !parsed.OK {
		return fmt.Errorf("telegram rejected the message")
	}
	return nil
}

func telegramText(cfg domain.NotificationConfig, n domain.Notification) string {
	if strings.TrimSpace(cfg.BodyTemplate) != "" {
		return strings.TrimSpace(RenderTemplate(cfg.BodyTemplate, n))
	}
	if strings.TrimSpace(n.Body) != "" {
		return strings.TrimSpace(n.Body)
	}
	return strings.TrimSpace(RenderTemplate(domain.DefaultTelegramTemplate(), n))
}
