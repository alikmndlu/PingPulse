package repository

import (
	"context"
	"testing"
	"time"

	"pingpulse/internal/database"
	"pingpulse/internal/domain"
)

func TestMaintenanceEffectAndIncidents(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	targets := NewTargetRepository(db)
	maint := NewMaintenanceRepository(db)
	incidents := NewIncidentRepository(db)

	target, err := targets.Create(context.Background(), domain.Target{
		Name: "API", Host: "10.10.10.20", Enabled: true, Interval: 60, Timeout: 5,
		ProbeType: domain.ProbeICMP, LastStatus: domain.StatusOnline, ExpectStatus: 200, HTTPMethod: "GET",
	})
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	_, err = maint.Create(context.Background(), domain.MaintenanceWindow{
		Name: "Nightly", TargetID: target.ID,
		StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour),
		SuppressChecks: true, SuppressNotifications: true, Enabled: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	effect, err := maint.EffectFor(context.Background(), target, now)
	if err != nil || !effect.Active || !effect.SuppressChecks {
		t.Fatalf("effect=%+v err=%v", effect, err)
	}

	inc, err := incidents.Open(context.Background(), target, "offline", 3)
	if err != nil || inc.Status != domain.IncidentOpen {
		t.Fatalf("%+v %v", inc, err)
	}
	resolved, err := incidents.Resolve(context.Background(), target.ID, "recovered")
	if err != nil || resolved.Status != domain.IncidentResolved || resolved.EndedAt == nil {
		t.Fatalf("%+v %v", resolved, err)
	}
	report, err := incidents.Report(context.Background(), now.Add(-24*time.Hour), now.Add(time.Hour))
	if err != nil || report.TotalIncidents < 1 {
		t.Fatalf("%+v %v", report, err)
	}
}

func TestFindByProbeIdentity(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	targets := NewTargetRepository(db)
	_, err = targets.Create(context.Background(), domain.Target{
		Name: "Web", Host: "example.com", Enabled: true, Interval: 60, Timeout: 5,
		ProbeType: domain.ProbeHTTP, HTTPURL: "https://example.com/health", HTTPMethod: "GET", ExpectStatus: 200,
		LastStatus: domain.StatusUnknown,
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = targets.Create(context.Background(), domain.Target{
		Name: "Web TCP", Host: "example.com", Enabled: true, Interval: 60, Timeout: 5,
		ProbeType: domain.ProbeTCP, TCPPort: 443, HTTPMethod: "GET", ExpectStatus: 200, LastStatus: domain.StatusUnknown,
	})
	if err != nil {
		t.Fatal(err)
	}
	got, err := targets.FindByIdentity(context.Background(), domain.ProbeTCP, "example.com", 443, "")
	if err != nil || got.Name != "Web TCP" {
		t.Fatalf("%+v %v", got, err)
	}
}
