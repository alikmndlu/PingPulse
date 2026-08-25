package monitor

import (
	"testing"

	"pingpulse/internal/domain"
)

func TestEvaluateOfflineAfterFailureThreshold(t *testing.T) {
	status := domain.StatusOnline
	fail, succ := 0, 0
	var trans string
	for i := 0; i < 2; i++ {
		ev := Evaluate(status, fail, succ, 3, 2, false)
		status, fail, succ, trans = ev.Status, ev.ConsecutiveFailures, ev.ConsecutiveSuccesses, ev.Transition
		if trans == "offline" {
			t.Fatalf("should not go offline before threshold, got transition after %d fails", fail)
		}
		if status != domain.StatusOnline {
			t.Fatalf("expected online during flap protection, got %s", status)
		}
	}
	ev := Evaluate(status, fail, succ, 3, 2, false)
	if ev.Status != domain.StatusOffline || ev.Transition != "offline" {
		t.Fatalf("expected offline transition, got status=%s transition=%s failures=%d", ev.Status, ev.Transition, ev.ConsecutiveFailures)
	}
}

func TestEvaluateRecoveryAfterThreshold(t *testing.T) {
	ev := Evaluate(domain.StatusOffline, 3, 0, 3, 2, true)
	if ev.Status != domain.StatusOffline || ev.Transition != "" {
		t.Fatalf("first success should not recover, got %+v", ev)
	}
	ev = Evaluate(ev.Status, ev.ConsecutiveFailures, ev.ConsecutiveSuccesses, 3, 2, true)
	if ev.Status != domain.StatusOnline || ev.Transition != "recovery" {
		t.Fatalf("second success should recover, got %+v", ev)
	}
}

func TestEvaluateUnknownUntilRecoveryThreshold(t *testing.T) {
	ev := Evaluate(domain.StatusUnknown, 0, 0, 3, 2, true)
	if ev.Status != domain.StatusUnknown {
		t.Fatalf("expected unknown after first success, got %s", ev.Status)
	}
	ev = Evaluate(ev.Status, ev.ConsecutiveFailures, ev.ConsecutiveSuccesses, 3, 2, true)
	if ev.Status != domain.StatusOnline {
		t.Fatalf("expected online after recovery threshold, got %s", ev.Status)
	}
}

func TestEvaluateDisabledUnchanged(t *testing.T) {
	ev := Evaluate(domain.StatusDisabled, 0, 0, 3, 2, false)
	if ev.Status != domain.StatusDisabled {
		t.Fatalf("disabled target changed status: %s", ev.Status)
	}
}

func TestEvaluateImmediateOfflineWhenThresholdOne(t *testing.T) {
	ev := Evaluate(domain.StatusOnline, 0, 1, 1, 1, false)
	if ev.Status != domain.StatusOffline || ev.Transition != "offline" {
		t.Fatalf("threshold 1 should offline immediately, got %+v", ev)
	}
}
