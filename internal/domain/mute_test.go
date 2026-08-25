package domain

import (
	"testing"
	"time"
)

func TestIsMuted(t *testing.T) {
	if IsMuted("") {
		t.Fatal("empty should not be muted")
	}
	if IsMuted("not-a-date") {
		t.Fatal("invalid date should not be muted")
	}
	past := time.Now().Add(-time.Minute).UTC().Format(time.RFC3339)
	if IsMuted(past) {
		t.Fatal("past mute should be inactive")
	}
	future := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)
	if !IsMuted(future) {
		t.Fatal("future mute should be active")
	}
}

func TestMuteUntil(t *testing.T) {
	if MuteUntil(0) != "" {
		t.Fatal("zero seconds should clear mute")
	}
	until := MuteUntil(3600)
	if !IsMuted(until) {
		t.Fatalf("expected active mute, got %s", until)
	}
}
