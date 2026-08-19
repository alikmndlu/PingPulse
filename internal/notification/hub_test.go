package notification

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"pingpulse/internal/database"
	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

type stubProvider struct {
	name  string
	calls atomic.Int32
}

func (s *stubProvider) Name() string { return s.name }
func (s *stubProvider) Send(ctx context.Context, n domain.Notification) error {
	s.calls.Add(1)
	return nil
}

func TestRenderTemplate(t *testing.T) {
	ms := int64(24)
	out := RenderTemplate(domain.DefaultRecoveryTemplate(), domain.Notification{
		TargetName: "Production API",
		Host:       "10.10.10.20",
		Status:     "ONLINE",
		LatencyMs:  &ms,
	})
	if out == "" || !contains(out, "Production API") || !contains(out, "24ms") {
		t.Fatalf("unexpected template output: %s", out)
	}
}

func TestCooldownSuppressesRepeatAlerts(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	settings := repository.NewSettingsRepository(db)
	s := domain.DefaultSettings()
	s.SMSEnabled = true
	s.DesktopNotificationEnabled = false
	s.WebhookEnabled = false
	s.NotificationCooldownSeconds = 600
	if err := settings.Save(context.Background(), s); err != nil {
		t.Fatal(err)
	}
	repo := repository.NewNotificationRepository(db)
	p := &stubProvider{name: domain.ProviderSMS}
	h := NewHub(settings, repo, nil, nil, p)
	n := domain.Notification{Kind: domain.KindAlert, TargetID: "t1", TargetName: "API", Host: "1.1.1.1", Status: "OFFLINE"}
	if err := h.Notify(context.Background(), n); err != nil {
		t.Fatal(err)
	}
	if err := h.Notify(context.Background(), n); err != nil {
		t.Fatal(err)
	}
	if p.calls.Load() != 1 {
		t.Fatalf("cooldown failed, calls=%d", p.calls.Load())
	}
}

func TestGlobalMuteSuppressesAlerts(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	settings := repository.NewSettingsRepository(db)
	s := domain.DefaultSettings()
	s.SMSEnabled = true
	s.DesktopNotificationEnabled = false
	s.WebhookEnabled = false
	s.NotificationCooldownSeconds = 0
	s.MutedUntil = domain.MuteUntil(3600)
	if err := settings.Save(context.Background(), s); err != nil {
		t.Fatal(err)
	}
	repo := repository.NewNotificationRepository(db)
	p := &stubProvider{name: domain.ProviderSMS}
	h := NewHub(settings, repo, nil, nil, p)
	n := domain.Notification{Kind: domain.KindAlert, TargetID: "t1", TargetName: "API", Host: "1.1.1.1", Status: "OFFLINE"}
	if err := h.Notify(context.Background(), n); err != nil {
		t.Fatal(err)
	}
	if p.calls.Load() != 0 {
		t.Fatalf("mute failed, calls=%d", p.calls.Load())
	}
}

func TestSMSHTTPProvider(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("X-Api-Key")
		body, _ := io.ReadAll(r.Body)
		if len(body) == 0 {
			t.Errorf("empty body")
		}
		w.WriteHeader(200)
	}))
	t.Cleanup(srv.Close)

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	repo := repository.NewNotificationRepository(db)
	if err := repo.Save(context.Background(), domain.NotificationConfig{
		Provider:     domain.ProviderSMS,
		APIURL:       srv.URL,
		APIKey:       "secret-key",
		HTTPMethod:   "POST",
		BodyTemplate: domain.DefaultSMSTemplate(),
	}); err != nil {
		t.Fatal(err)
	}
	p := NewSMSProvider(repo)
	err = p.Send(context.Background(), domain.Notification{
		Kind: domain.KindAlert, TargetName: "Production API", Host: "10.10.10.20", Status: "OFFLINE", Failures: 3, LastSuccess: "14:32:10",
	})
	if err != nil {
		t.Fatal(err)
	}
	if gotAuth != "secret-key" {
		t.Fatalf("api key header=%q", gotAuth)
	}
}

func TestMelipayamakSMSProvider(t *testing.T) {
	var (
		gotPath   string
		gotQuery  string
		gotAuth   string
		gotBody   string
		gotMethod string
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.RawQuery
		gotAuth = r.Header.Get("Authorization")
		gotMethod = r.Method
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		w.WriteHeader(200)
	}))
	t.Cleanup(srv.Close)

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	repo := repository.NewNotificationRepository(db)
	if err := repo.Save(context.Background(), domain.NotificationConfig{
		Provider:   domain.ProviderSMS,
		APIURL:     srv.URL + "/api/send/simple/{{apiKey}}",
		APIKey:     "test-token",
		Sender:     "3000",
		Recipient:  "09120000000",
		HTTPMethod: "POST",
	}); err != nil {
		t.Fatal(err)
	}
	p := NewSMSProvider(repo)
	err = p.Send(context.Background(), domain.Notification{
		Body: "host is OFFLINE", TargetName: "API", Host: "10.10.10.20", Status: "OFFLINE",
	})
	if err != nil {
		t.Fatal(err)
	}
	if gotMethod != "POST" {
		t.Fatalf("method=%s", gotMethod)
	}
	if gotPath != "/api/send/simple/test-token" {
		t.Fatalf("path=%s", gotPath)
	}
	if gotQuery != "" {
		t.Fatalf("unexpected query %q", gotQuery)
	}
	if gotAuth != "" {
		t.Fatalf("unexpected auth header %q", gotAuth)
	}
	if !contains(gotBody, `"from":"3000"`) || !contains(gotBody, `"to":"09120000000"`) || !contains(gotBody, `"text":"host is OFFLINE"`) {
		t.Fatalf("body=%s", gotBody)
	}
}

func TestTelegramProvider(t *testing.T) {
	var (
		gotPath   string
		gotBody   string
		gotMethod string
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotMethod = r.Method
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"result":{}}`))
	}))
	t.Cleanup(srv.Close)

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	repo := repository.NewNotificationRepository(db)
	if err := repo.Save(context.Background(), domain.NotificationConfig{
		Provider:     domain.ProviderTelegram,
		APIURL:       srv.URL,
		APIKey:       "123:secret-token",
		Recipient:    "-100123",
		BodyTemplate: "{{name}} is {{status}}",
	}); err != nil {
		t.Fatal(err)
	}
	p := NewTelegramProvider(repo)
	err = p.Send(context.Background(), domain.Notification{
		TargetName: "API", Host: "10.10.10.20", Status: "OFFLINE",
	})
	if err != nil {
		t.Fatal(err)
	}
	if gotMethod != "POST" {
		t.Fatalf("method=%s", gotMethod)
	}
	if gotPath != "/bot123:secret-token/sendMessage" {
		t.Fatalf("path=%s", gotPath)
	}
	if !contains(gotBody, `"chat_id":"-100123"`) || !contains(gotBody, `"text":"API is OFFLINE"`) {
		t.Fatalf("body=%s", gotBody)
	}
}

func TestHTTPProviderTimeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.WriteHeader(200)
	}))
	t.Cleanup(srv.Close)
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	repo := repository.NewNotificationRepository(db)
	_ = repo.Save(context.Background(), domain.NotificationConfig{Provider: domain.ProviderSMS, APIURL: srv.URL, HTTPMethod: "POST"})
	p := NewSMSProvider(repo)
	p.client.Timeout = 10 * time.Millisecond
	if err := p.Send(context.Background(), domain.Notification{TargetName: "x", Host: "1.1.1.1"}); err == nil {
		t.Fatal("expected timeout error")
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || (len(s) > 0 && (indexOf(s, sub) >= 0)))
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
