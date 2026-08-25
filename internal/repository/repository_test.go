package repository

import (
	"context"
	"testing"

	"pingpulse/internal/database"
	"pingpulse/internal/domain"
)

func TestTargetRepositoryCRUD(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	repo := NewTargetRepository(db)
	created, err := repo.Create(context.Background(), domain.Target{
		Name: "Production API", Host: "10.10.10.20", Enabled: true,
		Interval: 120, Timeout: 5, RetryCount: 3, RetryDelay: 2, LastStatus: domain.StatusUnknown,
	})
	if err != nil {
		t.Fatal(err)
	}
	got, err := repo.Get(context.Background(), created.ID)
	if err != nil || got.Host != "10.10.10.20" {
		t.Fatalf("get: %+v %v", got, err)
	}
	created.Name = "Prod API"
	updated, err := repo.Update(context.Background(), created)
	if err != nil || updated.Name != "Prod API" {
		t.Fatalf("update: %+v %v", updated, err)
	}
	list, err := repo.List(context.Background())
	if err != nil || len(list) != 1 {
		t.Fatalf("list=%d err=%v", len(list), err)
	}
	if err := repo.Delete(context.Background(), created.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.Get(context.Background(), created.ID); err != domain.ErrNotFound {
		t.Fatalf("expected not found, got %v", err)
	}
}

func TestTargetRepositoryDuplicateHost(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	repo := NewTargetRepository(db)
	_, err = repo.Create(context.Background(), domain.Target{Name: "A", Host: "1.1.1.1", Interval: 120, Timeout: 5, LastStatus: domain.StatusUnknown})
	if err != nil {
		t.Fatal(err)
	}
	_, err = repo.Create(context.Background(), domain.Target{Name: "B", Host: "1.1.1.1", Interval: 120, Timeout: 5, LastStatus: domain.StatusUnknown})
	if err != domain.ErrDuplicateTarget {
		t.Fatalf("expected duplicate, got %v", err)
	}
}

func TestResultRepositoryHistoryFilter(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	targets := NewTargetRepository(db)
	results := NewResultRepository(db)
	t1, _ := targets.Create(context.Background(), domain.Target{Name: "A", Host: "1.1.1.1", Interval: 30, Timeout: 1, LastStatus: domain.StatusUnknown})
	ms := int64(12)
	_, _ = results.Insert(context.Background(), domain.PingResult{TargetID: t1.ID, Success: true, LatencyMs: &ms, DurationMs: 12})
	errMsg := "timeout"
	_, _ = results.Insert(context.Background(), domain.PingResult{TargetID: t1.ID, Success: false, Error: &errMsg, DurationMs: 1000})
	page, err := results.List(context.Background(), domain.HistoryFilter{TargetID: t1.ID, Status: "failure"})
	if err != nil {
		t.Fatal(err)
	}
	if page.Total != 1 || len(page.Items) != 1 || page.Items[0].Success {
		t.Fatalf("filter failed: %+v", page)
	}
}

func TestTargetRepositoryStatsEmpty(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	repo := NewTargetRepository(db)
	stats, err := repo.Stats(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if stats.TotalTargets != 0 || stats.Online != 0 || stats.Offline != 0 {
		t.Fatalf("expected empty stats, got %+v", stats)
	}
	metrics, err := repo.Metrics(context.Background(), "missing")
	if err != nil {
		t.Fatal(err)
	}
	if metrics.TotalChecks != 0 || metrics.Successful != 0 {
		t.Fatalf("expected empty metrics, got %+v", metrics)
	}
}

func TestSettingsRoundTrip(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	repo := NewSettingsRepository(db)
	s := domain.DefaultSettings()
	s.FailureThreshold = 5
	s.Theme = "dark"
	if err := repo.Save(context.Background(), s); err != nil {
		t.Fatal(err)
	}
	got, err := repo.Get(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if got.FailureThreshold != 5 || got.Theme != "dark" {
		t.Fatalf("%+v", got)
	}
}

func TestGroupRepositoryAndTargetMute(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	groups := NewGroupRepository(db)
	targets := NewTargetRepository(db)
	home, err := groups.Create(context.Background(), domain.TargetGroup{Name: "خانه", Color: "#22d3ee"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := groups.Create(context.Background(), domain.TargetGroup{Name: "خانه", Color: "#34d399"}); err != domain.ErrDuplicateGroup {
		t.Fatalf("expected duplicate group, got %v", err)
	}
	created, err := targets.Create(context.Background(), domain.Target{
		Name: "Router", Host: "192.168.1.1", Enabled: true,
		Interval: 120, Timeout: 5, LastStatus: domain.StatusUnknown, GroupID: home.ID,
		MutedUntil: domain.MuteUntil(3600),
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.GroupName != "خانه" || created.GroupColor != "#22d3ee" || !domain.IsMuted(created.MutedUntil) {
		t.Fatalf("target group/mute: %+v", created)
	}
	if err := groups.Delete(context.Background(), home.ID); err != nil {
		t.Fatal(err)
	}
	got, err := targets.Get(context.Background(), created.ID)
	if err != nil || got.GroupID != "" {
		t.Fatalf("expected group cleared, got %+v %v", got, err)
	}
}
