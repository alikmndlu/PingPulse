package domain

import (
	"testing"
	"time"
)

func TestBuildSlaReport(t *testing.T) {
	from := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)
	targets := []Target{
		{ID: "a", Name: "API", Host: "10.0.0.1", GroupName: "Prod"},
		{ID: "b", Name: "DB", Host: "10.0.0.2"},
	}
	inc := IncidentReport{
		ByTarget: []IncidentTargetStat{
			{TargetID: "a", TargetName: "API", Host: "10.0.0.1", Incidents: 2, DowntimeSec: 3600, UptimePercent: 99.5, AverageMTTRSec: 1800},
		},
	}
	rep := BuildSlaReport("30d", 99.9, from, to, targets, inc)
	if len(rep.Targets) != 2 {
		t.Fatalf("targets=%d", len(rep.Targets))
	}
	if rep.Targets[0].Status != "breached" {
		t.Fatalf("api status=%s uptime=%v", rep.Targets[0].Status, rep.Targets[0].UptimePercent)
	}
	if rep.Targets[1].Status != "compliant" || rep.Targets[1].UptimePercent != 100 {
		t.Fatalf("db row=%+v", rep.Targets[1])
	}
	if rep.BreachedCount != 1 || rep.CompliantCount != 1 {
		t.Fatalf("counts breached=%d compliant=%d", rep.BreachedCount, rep.CompliantCount)
	}
}
