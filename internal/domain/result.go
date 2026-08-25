package domain

import "time"

type PingResult struct {
	ID         string    `json:"id"`
	TargetID   string    `json:"targetId"`
	Timestamp  time.Time `json:"timestamp"`
	Success    bool      `json:"success"`
	LatencyMs  *int64    `json:"latencyMs"`
	Error      *string   `json:"error"`
	DurationMs int64     `json:"durationMs"`
}

type HistoryFilter struct {
	TargetID string `json:"targetId"`
	Status   string `json:"status"`
	Search   string `json:"search"`
	From     string `json:"from"`
	To       string `json:"to"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
}

type HistoryPage struct {
	Items      []PingResult `json:"items"`
	Total      int          `json:"total"`
	Limit      int          `json:"limit"`
	Offset     int          `json:"offset"`
}
