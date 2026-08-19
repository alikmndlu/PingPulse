package domain

import "time"

type EventType string

const (
	EventTargetOffline  EventType = "target_offline"
	EventTargetRecovery EventType = "target_recovery"
	EventHighLatency    EventType = "high_latency"
	EventPingTimeout    EventType = "ping_timeout"
)

type Event struct {
	ID        string    `json:"id"`
	TargetID  string    `json:"targetId"`
	Type      EventType `json:"type"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
	Metadata  string    `json:"metadata"`
}

type EventFilter struct {
	TargetID string `json:"targetId"`
	Type     string `json:"type"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
}

const (
	WailsTargetStatusChanged = "target:status_changed"
	WailsTargetPingCompleted = "target:ping_completed"
	WailsNotificationSent    = "notification:sent"
	WailsMonitoringStarted   = "monitoring:started"
	WailsMonitoringStopped   = "monitoring:stopped"
	WailsEventCreated        = "event:created"
)

type StatusChangedPayload struct {
	TargetID string       `json:"targetId"`
	Name     string       `json:"name"`
	Host     string       `json:"host"`
	Status   TargetStatus `json:"status"`
	Latency  *int64       `json:"latency"`
}

type PingCompletedPayload struct {
	TargetID  string `json:"targetId"`
	Success   bool   `json:"success"`
	LatencyMs *int64 `json:"latencyMs"`
	Error     string `json:"error"`
}

type NotificationSentPayload struct {
	Provider string `json:"provider"`
	TargetID string `json:"targetId"`
	Kind     string `json:"kind"`
	Success  bool   `json:"success"`
	Error    string `json:"error,omitempty"`
}
