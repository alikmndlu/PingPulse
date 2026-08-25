package scheduler

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"pingpulse/internal/database"
	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

type countingChecker struct {
	n atomic.Int32
}

func (c *countingChecker) Check(ctx context.Context, targetID string) error {
	c.n.Add(1)
	return nil
}

type nopEmitter struct{}

func (nopEmitter) Emit(string, ...any) {}

func TestSchedulerStartsAndStopsWorkers(t *testing.T) {
	prev := minInterval
	minInterval = 20 * time.Millisecond
	t.Cleanup(func() { minInterval = prev })

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	targets := repository.NewTargetRepository(db)
	_, err = targets.Create(context.Background(), domain.Target{
		Name: "A", Host: "1.1.1.1", Enabled: true, Interval: 1, Timeout: 1, RetryCount: 0, LastStatus: domain.StatusUnknown,
	})
	if err != nil {
		t.Fatal(err)
	}
	checker := &countingChecker{}
	s := New(targets, checker, nopEmitter{}, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := s.Start(ctx); err != nil {
		t.Fatal(err)
	}
	if !s.Running() {
		t.Fatal("expected running")
	}
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if checker.n.Load() >= 2 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if checker.n.Load() < 2 {
		t.Fatalf("expected multiple checks, got %d", checker.n.Load())
	}
	s.Stop()
	if s.Running() {
		t.Fatal("expected stopped")
	}
	n := checker.n.Load()
	time.Sleep(80 * time.Millisecond)
	if checker.n.Load() != n {
		t.Fatal("checks continued after stop")
	}
}

func TestSchedulerPauseAndRemove(t *testing.T) {
	prev := minInterval
	minInterval = 20 * time.Millisecond
	t.Cleanup(func() { minInterval = prev })

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	targets := repository.NewTargetRepository(db)
	created, err := targets.Create(context.Background(), domain.Target{
		Name: "B", Host: "8.8.8.8", Enabled: true, Interval: 1, Timeout: 1, LastStatus: domain.StatusUnknown,
	})
	if err != nil {
		t.Fatal(err)
	}
	s := New(targets, &countingChecker{}, nopEmitter{}, nil)
	if err := s.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	s.Pause()
	st := s.Status()
	if !st.Paused || st.Running {
		t.Fatalf("status=%+v", st)
	}
	s.Remove(created.ID)
	var wg sync.WaitGroup
	wg.Wait()
}
