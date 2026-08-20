package domain

import "time"

type IncidentStatus string

const (
	IncidentOpen     IncidentStatus = "open"
	IncidentResolved IncidentStatus = "resolved"
)

type Incident struct {
	ID              string         `json:"id"`
	TargetID        string         `json:"targetId"`
	TargetName      string         `json:"targetName"`
	Host            string         `json:"host"`
	ProbeType       ProbeType      `json:"probeType"`
	Status          IncidentStatus `json:"status"`
	StartedAt       time.Time      `json:"startedAt"`
	EndedAt         *time.Time     `json:"endedAt"`
	DurationSeconds int64          `json:"durationSeconds"`
	FailureCount    int            `json:"failureCount"`
	Summary         string         `json:"summary"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

type IncidentFilter struct {
	TargetID string `json:"targetId"`
	Status   string `json:"status"`
	From     string `json:"from"`
	To       string `json:"to"`
	Search   string `json:"search"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
}

type IncidentPage struct {
	Items  []Incident `json:"items"`
	Total  int        `json:"total"`
	Limit  int        `json:"limit"`
	Offset int        `json:"offset"`
}

type IncidentReport struct {
	From              string            `json:"from"`
	To                string            `json:"to"`
	TotalIncidents    int               `json:"totalIncidents"`
	OpenIncidents     int               `json:"openIncidents"`
	ResolvedIncidents int               `json:"resolvedIncidents"`
	TotalDowntimeSec  int64             `json:"totalDowntimeSec"`
	AverageMTTRSec    int64             `json:"averageMttrSec"`
	LongestOutageSec  int64             `json:"longestOutageSec"`
	ByTarget          []IncidentTargetStat `json:"byTarget"`
	Recent            []Incident        `json:"recent"`
}

type IncidentTargetStat struct {
	TargetID       string  `json:"targetId"`
	TargetName     string  `json:"targetName"`
	Host           string  `json:"host"`
	Incidents      int     `json:"incidents"`
	Open           int     `json:"open"`
	DowntimeSec    int64   `json:"downtimeSec"`
	UptimePercent  float64 `json:"uptimePercent"`
}

const (
	WailsIncidentUpdated     = "incident:updated"
	WailsMaintenanceChanged  = "maintenance:changed"
)
