package monitor

import (
	"context"
	"sync"
	"testing"
	"time"

	"pingpulse/internal/database"
	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

type memEmitter struct {
	mu     sync.Mutex
	events []string
}

func (m *memEmitter) Emit(name string, data ...any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, name)
}

func setupEngine(t *testing.T, pinger Pinger) (*Engine, *repository.TargetRepository, *repository.SettingsRepository) {
	t.Helper()
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	targets := repository.NewTargetRepository(db)
	results := repository.NewResultRepository(db)
	events := repository.NewEventRepository(db)
	settings := repository.NewSettingsRepository(db)
	s := domain.DefaultSettings()
	s.FailureThreshold = 3
	s.RecoveryThreshold = 2
	s.NotifyOnOffline = false
	s.NotifyOnRecovery = false
	s.NotifyOnHighLatency = false
	s.NotifyOnTimeout = false
	if err := settings.Save(context.Background(), s); err != nil {
		t.Fatal(err)
	}
	eng := NewEngine(pinger, targets, results, events, settings, nopNotifier{}, &memEmitter{}, nil)
	return eng, targets, settings
}

type nopNotifier struct{}

func (nopNotifier) Notify(context.Context, domain.Notification) error { return nil }

func TestEngineMarksOfflineAfterThreshold(t *testing.T) {
	p := &stubPinger{err: errorsTimeout()}
	eng, targets, _ := setupEngine(t, p)
	enabled := true
	interval, timeout, retry, delay := 120, 1, 0, 0
	created, err := targets.Create(context.Background(), domain.Target{
		Name: "API", Host: "10.10.10.20", Enabled: enabled,
		Interval: interval, Timeout: timeout, RetryCount: retry, RetryDelay: delay,
		LastStatus: domain.StatusOnline,
	})
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 3; i++ {
		if err := eng.Check(context.Background(), created.ID); err != nil {
			t.Fatal(err)
		}
	}
	got, err := targets.Get(context.Background(), created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.LastStatus != domain.StatusOffline {
		t.Fatalf("status=%s failures=%d", got.LastStatus, got.ConsecutiveFailures)
	}
	if got.ConsecutiveFailures != 3 {
		t.Fatalf("failures=%d", got.ConsecutiveFailures)
	}
}

func TestEngineRecoversAfterThreshold(t *testing.T) {
	p := &stubPinger{err: errorsTimeout()}
	eng, targets, _ := setupEngine(t, p)
	created, err := targets.Create(context.Background(), domain.Target{
		Name: "API", Host: "10.10.10.21", Enabled: true,
		Interval: 120, Timeout: 1, RetryCount: 0, RetryDelay: 0,
		LastStatus: domain.StatusOnline,
	})
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 3; i++ {
		if err := eng.Check(context.Background(), created.ID); err != nil {
			t.Fatal(err)
		}
	}
	p.err = nil
	p.rtt = 24 * time.Millisecond
	if err := eng.Check(context.Background(), created.ID); err != nil {
		t.Fatal(err)
	}
	got, _ := targets.Get(context.Background(), created.ID)
	if got.LastStatus != domain.StatusOffline {
		t.Fatalf("expected still offline, got %s", got.LastStatus)
	}
	if err := eng.Check(context.Background(), created.ID); err != nil {
		t.Fatal(err)
	}
	got, _ = targets.Get(context.Background(), created.ID)
	if got.LastStatus != domain.StatusOnline {
		t.Fatalf("expected online, got %s", got.LastStatus)
	}
}

func errorsTimeout() error {
	return &domain.PingError{Host: "10.10.10.20", Timeout: "1s"}
}
