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

	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

type HTTPProvider struct {
	name     string
	repo     *repository.NotificationRepository
	client   *http.Client
	required bool
}

func NewSMSProvider(repo *repository.NotificationRepository) *HTTPProvider {
	return &HTTPProvider{
		name:     domain.ProviderSMS,
		repo:     repo,
		client:   &http.Client{Timeout: 15 * time.Second},
		required: true,
	}
}

func NewWebhookProvider(repo *repository.NotificationRepository) *HTTPProvider {
	return &HTTPProvider{
		name:   domain.ProviderWebhook,
		repo:   repo,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *HTTPProvider) Name() string {
	return p.name
}

func (p *HTTPProvider) Send(ctx context.Context, n domain.Notification) error {
	cfg, err := p.repo.Get(ctx, p.name)
	if err != nil {
		return err
	}
	if p.name == domain.ProviderSMS && isMelipayamak(cfg) {
		return p.sendMelipayamak(ctx, cfg, n)
	}
	return p.sendGenericHTTP(ctx, cfg, n)
}

func isMelipayamak(cfg domain.NotificationConfig) bool {
	url := strings.ToLower(strings.TrimSpace(cfg.APIURL))
	return url == "" || strings.Contains(url, "melipayamak.com") || strings.Contains(url, "/api/send/simple")
}

func (p *HTTPProvider) sendMelipayamak(ctx context.Context, cfg domain.NotificationConfig, n domain.Notification) error {
	if strings.TrimSpace(cfg.Sender) == "" || strings.TrimSpace(cfg.Recipient) == "" {
		return fmt.Errorf("sms sender and recipient are required")
	}
	endpoint := strings.TrimSpace(cfg.APIURL)
	if endpoint == "" {
		endpoint = domain.DefaultMelipayamakURL()
	}
	endpoint = strings.ReplaceAll(endpoint, "{{apiKey}}", cfg.APIKey)
	if strings.Contains(endpoint, "{{apiKey}}") || strings.HasSuffix(strings.TrimRight(endpoint, "/"), "/simple") {
		return fmt.Errorf("sms provider is not configured")
	}
	text := strings.TrimSpace(n.Body)
	if strings.TrimSpace(cfg.BodyTemplate) != "" {
		text = RenderTemplate(cfg.BodyTemplate, n)
	}
	if text == "" {
		text = RenderTemplate(domain.DefaultSMSTemplate(), n)
	}
	payload, err := json.Marshal(map[string]string{
		"from": cfg.Sender,
		"to":   cfg.Recipient,
		"text": text,
	})
	if err != nil {
		return fmt.Errorf("invalid sms payload")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("invalid sms request")
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "PingPulse/1.0")
	for k, v := range cfg.CustomHeaders {
		if k == "" {
			continue
		}
		req.Header.Set(k, v)
	}
	return p.doRequest(req, p.name)
}

func (p *HTTPProvider) sendGenericHTTP(ctx context.Context, cfg domain.NotificationConfig, n domain.Notification) error {
	if strings.TrimSpace(cfg.APIURL) == "" {
		return fmt.Errorf("%s provider is not configured", p.name)
	}
	method := strings.ToUpper(strings.TrimSpace(cfg.HTTPMethod))
	if method == "" {
		method = http.MethodPost
	}
	body := RenderTemplate(cfg.BodyTemplate, n)
	req, err := http.NewRequestWithContext(ctx, method, cfg.APIURL, bytes.NewBufferString(body))
	if err != nil {
		return fmt.Errorf("invalid %s request", p.name)
	}
	if cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
		req.Header.Set("X-Api-Key", cfg.APIKey)
	}
	if cfg.Sender != "" {
		req.Header.Set("X-Sender", cfg.Sender)
	}
	if cfg.Recipient != "" {
		req.Header.Set("X-Recipient", cfg.Recipient)
		q := req.URL.Query()
		if q.Get("to") == "" {
			q.Set("to", cfg.Recipient)
			req.URL.RawQuery = q.Encode()
		}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "PingPulse/1.0")
	for k, v := range cfg.CustomHeaders {
		if k == "" {
			continue
		}
		req.Header.Set(k, v)
	}
	return p.doRequest(req, p.name)
}

func (p *HTTPProvider) doRequest(req *http.Request, name string) error {
	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("unable to send %s notification", name)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("%s provider returned status %d", name, resp.StatusCode)
	}
	return nil
}
