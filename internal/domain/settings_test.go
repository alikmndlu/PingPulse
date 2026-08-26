package domain

import "testing"

func TestSettingsRetentionNormalized(t *testing.T) {
	s := DefaultSettings()
	if s.Normalized().HistoryRetentionDays != 30 {
		t.Fatal("default retention should be 30")
	}
	s.HistoryRetentionDays = 7
	if s.Normalized().HistoryRetentionDays != 7 {
		t.Fatal("7 days should stay")
	}
	s.HistoryRetentionDays = 12
	if s.Normalized().HistoryRetentionDays != 30 {
		t.Fatalf("invalid retention got %d", s.Normalized().HistoryRetentionDays)
	}
}
