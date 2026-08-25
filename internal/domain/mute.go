package domain

import (
	"strings"
	"time"
)

func MuteUntil(seconds int) string {
	if seconds <= 0 {
		return ""
	}
	return time.Now().UTC().Add(time.Duration(seconds) * time.Second).Format(time.RFC3339)
}

func IsMuted(until string) bool {
	until = strings.TrimSpace(until)
	if until == "" {
		return false
	}
	t, err := time.Parse(time.RFC3339, until)
	if err != nil {
		t, err = time.Parse(time.RFC3339Nano, until)
		if err != nil {
			return false
		}
	}
	return time.Now().Before(t)
}
