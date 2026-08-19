package notification

import (
	"context"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

type Provider interface {
	Name() string
	Send(ctx context.Context, n domain.Notification) error
}

type Emitter interface {
	Emit(name string, data ...any)
}

type SettingsProvider interface {
	Get(ctx context.Context) (domain.Settings, error)
}

type Hub struct {
	mu        sync.RWMutex
	providers map[string]Provider
	settings  SettingsProvider
	repo      *repository.NotificationRepository
	logger    *slog.Logger
	emitter   Emitter
}

func NewHub(settings SettingsProvider, repo *repository.NotificationRepository, emitter Emitter, logger *slog.Logger, providers ...Provider) *Hub {
	if logger == nil {
		logger = slog.Default()
	}
	h := &Hub{
		providers: make(map[string]Provider),
		settings:  settings,
		repo:      repo,
		logger:    logger,
		emitter:   emitter,
	}
	for _, p := range providers {
		h.Register(p)
	}
	return h
}

func (h *Hub) Register(p Provider) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.providers[p.Name()] = p
}

func (h *Hub) Notify(ctx context.Context, n domain.Notification) error {
	settings, err := h.settings.Get(ctx)
	if err != nil {
		return err
	}
	if n.OccurredAt == "" {
		n.OccurredAt = time.Now().Format("15:04:05")
	}
	if n.Body == "" {
		n.Body = RenderTemplate(templateForKind(n.Kind), n)
	}

	if !h.allow(ctx, n.TargetID, string(n.Kind), settings.NotificationCooldownSeconds) {
		h.logger.Debug("notification suppressed by cooldown", "targetId", n.TargetID, "kind", n.Kind)
		return nil
	}

	enabled := enabledProviders(settings)
	var firstErr error
	sent := false
	for name, p := range h.snapshot() {
		if !enabled[name] {
			continue
		}
		sendErr := p.Send(ctx, n)
		payload := domain.NotificationSentPayload{
			Provider: name,
			TargetID: n.TargetID,
			Kind:     string(n.Kind),
			Success:  sendErr == nil,
		}
		if sendErr != nil {
			h.logger.Warn("notification failed", "provider", name, "error", sendErr)
			payload.Error = "notification delivery failed"
			if firstErr == nil {
				firstErr = sendErr
			}
		} else {
			sent = true
			h.logger.Info("notification sent", "provider", name, "targetId", n.TargetID, "kind", n.Kind)
		}
		if h.emitter != nil {
			h.emitter.Emit(domain.WailsNotificationSent, payload)
		}
	}
	if sent {
		_ = h.repo.MarkSent(ctx, n.TargetID, string(n.Kind), time.Now().UTC())
	}
	return firstErr
}

func (h *Hub) Test(ctx context.Context, provider string) error {
	n := domain.Notification{
		Kind:        domain.KindAlert,
		Title:       "PingPulse",
		TargetName:  "Production API",
		Host:        "10.10.10.20",
		Status:      "OFFLINE",
		Failures:    3,
		LastSuccess: time.Now().Add(-5 * time.Minute).Format("15:04:05"),
		OccurredAt:  time.Now().Format("15:04:05"),
	}
	n.Body = RenderTemplate(domain.DefaultSMSTemplate(), n)
	p, ok := h.snapshot()[provider]
	if !ok {
		return domain.NewValidationError("provider", "unknown notification provider")
	}
	return p.Send(ctx, n)
}

func (h *Hub) snapshot() map[string]Provider {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := make(map[string]Provider, len(h.providers))
	for k, v := range h.providers {
		out[k] = v
	}
	return out
}

func (h *Hub) allow(ctx context.Context, targetID, kind string, cooldownSec int) bool {
	if cooldownSec <= 0 || targetID == "" {
		return true
	}
	last, err := h.repo.LastSent(ctx, targetID, kind)
	if err != nil || last == nil {
		return true
	}
	return time.Since(*last) >= time.Duration(cooldownSec)*time.Second
}

func enabledProviders(s domain.Settings) map[string]bool {
	return map[string]bool{
		domain.ProviderSMS:     s.SMSEnabled,
		domain.ProviderDesktop: s.DesktopNotificationEnabled,
		domain.ProviderWebhook: s.WebhookEnabled,
	}
}

func templateForKind(kind domain.NotificationKind) string {
	if kind == domain.KindRecovery {
		return domain.DefaultRecoveryTemplate()
	}
	return domain.DefaultSMSTemplate()
}

func RenderTemplate(tmpl string, n domain.Notification) string {
	if tmpl == "" {
		tmpl = templateForKind(n.Kind)
	}
	latency := "n/a"
	if n.LatencyMs != nil {
		latency = formatMs(*n.LatencyMs)
	}
	replacer := strings.NewReplacer(
		"{{title}}", n.Title,
		"{{body}}", n.Body,
		"{{name}}", n.TargetName,
		"{{host}}", n.Host,
		"{{status}}", n.Status,
		"{{kind}}", string(n.Kind),
		"{{failures}}", itoa(n.Failures),
		"{{latency}}", latency,
		"{{lastSuccess}}", n.LastSuccess,
		"{{time}}", n.OccurredAt,
	)
	return replacer.Replace(tmpl)
}

func formatMs(v int64) string {
	return strconv.FormatInt(v, 10) + "ms"
}

func itoa(v int) string {
	return strconv.Itoa(v)
}
