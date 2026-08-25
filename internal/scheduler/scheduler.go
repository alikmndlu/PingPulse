package scheduler

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

var minInterval = 5 * time.Second

type Checker interface {
	Check(ctx context.Context, targetID string) error
}

type Scheduler struct {
	mu        sync.Mutex
	targets   *repository.TargetRepository
	checker   Checker
	logger    *slog.Logger
	workers   map[string]*worker
	parent    context.Context
	cancel    context.CancelFunc
	running   bool
	paused    bool
	startedAt *time.Time
	nextRun   map[string]time.Time
	emitter   Emitter
}

type Emitter interface {
	Emit(name string, data ...any)
}

type worker struct {
	cancel context.CancelFunc
}

func New(targets *repository.TargetRepository, checker Checker, emitter Emitter, logger *slog.Logger) *Scheduler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Scheduler{
		targets: targets,
		checker: checker,
		logger:  logger,
		workers: make(map[string]*worker),
		nextRun: make(map[string]time.Time),
		emitter: emitter,
	}
}

func (s *Scheduler) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running && !s.paused {
		return nil
	}
	if s.cancel != nil {
		s.cancel()
	}
	parent, cancel := context.WithCancel(ctx)
	s.parent = parent
	s.cancel = cancel
	s.running = true
	s.paused = false
	now := time.Now().UTC()
	s.startedAt = &now
	targets, err := s.targets.List(parent)
	if err != nil {
		return err
	}
	for _, t := range targets {
		if t.Enabled {
			s.startLocked(t)
		}
	}
	if s.emitter != nil {
		s.emitter.Emit(domain.WailsMonitoringStarted, domain.MonitoringStatus{Running: true, Paused: false, StartedAt: s.startedAt})
	}
	s.logger.Info("monitoring started", "targets", len(s.workers))
	return nil
}

func (s *Scheduler) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stopLocked()
	s.running = false
	s.paused = false
	s.startedAt = nil
	if s.emitter != nil {
		s.emitter.Emit(domain.WailsMonitoringStopped, domain.MonitoringStatus{Running: false, Paused: false})
	}
	s.logger.Info("monitoring stopped")
}

func (s *Scheduler) Pause() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.running {
		return
	}
	s.stopLocked()
	s.paused = true
	s.running = true
	if s.emitter != nil {
		s.emitter.Emit(domain.WailsMonitoringStopped, domain.MonitoringStatus{Running: true, Paused: true, StartedAt: s.startedAt})
	}
	s.logger.Info("monitoring paused")
}

func (s *Scheduler) Status() domain.MonitoringStatus {
	s.mu.Lock()
	defer s.mu.Unlock()
	return domain.MonitoringStatus{Running: s.running && !s.paused, Paused: s.paused, StartedAt: s.startedAt}
}

func (s *Scheduler) Running() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running && !s.paused
}

func (s *Scheduler) NextCheck() *time.Time {
	s.mu.Lock()
	defer s.mu.Unlock()
	var min *time.Time
	for _, t := range s.nextRun {
		tt := t
		if min == nil || tt.Before(*min) {
			min = &tt
		}
	}
	return min
}

func (s *Scheduler) Upsert(t domain.Target) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stopOneLocked(t.ID)
	if s.running && !s.paused && t.Enabled {
		s.startLocked(t)
	}
}

func (s *Scheduler) Remove(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stopOneLocked(id)
}

func (s *Scheduler) stopLocked() {
	if s.cancel != nil {
		s.cancel()
		s.cancel = nil
	}
	for id, w := range s.workers {
		w.cancel()
		delete(s.workers, id)
	}
	s.nextRun = make(map[string]time.Time)
}

func (s *Scheduler) stopOneLocked(id string) {
	if w, ok := s.workers[id]; ok {
		w.cancel()
		delete(s.workers, id)
	}
	delete(s.nextRun, id)
}

func (s *Scheduler) startLocked(t domain.Target) {
	if s.parent == nil {
		return
	}
	ctx, cancel := context.WithCancel(s.parent)
	s.workers[t.ID] = &worker{cancel: cancel}
	interval := time.Duration(t.Interval) * time.Second
	if interval < minInterval {
		interval = minInterval
	}
	s.nextRun[t.ID] = time.Now().Add(time.Second)
	go s.loop(ctx, t.ID, interval)
}

func (s *Scheduler) loop(ctx context.Context, targetID string, interval time.Duration) {
	s.setNext(targetID, time.Now().Add(500*time.Millisecond))
	timer := time.NewTimer(500 * time.Millisecond)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			if err := s.checker.Check(ctx, targetID); err != nil && ctx.Err() == nil {
				s.logger.Warn("target check failed", "targetId", targetID, "error", err)
			}
			s.setNext(targetID, time.Now().Add(interval))
			timer.Reset(interval)
		}
	}
}

func (s *Scheduler) setNext(id string, t time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.workers[id]; ok {
		s.nextRun[id] = t
	}
}
