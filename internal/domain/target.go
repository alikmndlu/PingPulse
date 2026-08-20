package domain

import "time"

type Target struct {
	ID                   string       `json:"id"`
	Name                 string       `json:"name"`
	Host                 string       `json:"host"`
	Enabled              bool         `json:"enabled"`
	Interval             int          `json:"interval"`
	Timeout              int          `json:"timeout"`
	RetryCount           int          `json:"retryCount"`
	RetryDelay           int          `json:"retryDelay"`
	CreatedAt            time.Time    `json:"createdAt"`
	UpdatedAt            time.Time    `json:"updatedAt"`
	LastStatus           TargetStatus `json:"lastStatus"`
	LastLatency          *int64       `json:"lastLatency"`
	LastCheckedAt        *time.Time   `json:"lastCheckedAt"`
	LastSuccessAt        *time.Time   `json:"lastSuccessAt"`
	LastFailureAt        *time.Time   `json:"lastFailureAt"`
	ConsecutiveFailures  int          `json:"consecutiveFailures"`
	ConsecutiveSuccesses int          `json:"consecutiveSuccesses"`
	GroupID              string       `json:"groupId"`
	GroupName            string       `json:"groupName"`
	GroupColor           string       `json:"groupColor"`
	MutedUntil           string       `json:"mutedUntil"`
	ProbeType            ProbeType    `json:"probeType"`
	HTTPURL              string       `json:"httpUrl"`
	HTTPMethod           string       `json:"httpMethod"`
	ExpectStatus         int          `json:"expectStatus"`
	TCPPort              int          `json:"tcpPort"`
}

type CreateTargetInput struct {
	Name         string `json:"name"`
	Host         string `json:"host"`
	Enabled      *bool  `json:"enabled,omitempty"`
	Interval     *int   `json:"interval,omitempty"`
	Timeout      *int   `json:"timeout,omitempty"`
	RetryCount   *int   `json:"retryCount,omitempty"`
	RetryDelay   *int   `json:"retryDelay,omitempty"`
	GroupID      string `json:"groupId,omitempty"`
	ProbeType    string `json:"probeType,omitempty"`
	HTTPURL      string `json:"httpUrl,omitempty"`
	HTTPMethod   string `json:"httpMethod,omitempty"`
	ExpectStatus *int   `json:"expectStatus,omitempty"`
	TCPPort      *int   `json:"tcpPort,omitempty"`
}

type UpdateTargetInput struct {
	Name         *string `json:"name,omitempty"`
	Host         *string `json:"host,omitempty"`
	Enabled      *bool   `json:"enabled,omitempty"`
	Interval     *int    `json:"interval,omitempty"`
	Timeout      *int    `json:"timeout,omitempty"`
	RetryCount   *int    `json:"retryCount,omitempty"`
	RetryDelay   *int    `json:"retryDelay,omitempty"`
	GroupID      *string `json:"groupId,omitempty"`
	ProbeType    *string `json:"probeType,omitempty"`
	HTTPURL      *string `json:"httpUrl,omitempty"`
	HTTPMethod   *string `json:"httpMethod,omitempty"`
	ExpectStatus *int    `json:"expectStatus,omitempty"`
	TCPPort      *int    `json:"tcpPort,omitempty"`
}

type TargetExport struct {
	Name         string `json:"name"`
	Host         string `json:"host"`
	Enabled      bool   `json:"enabled"`
	Interval     int    `json:"interval"`
	Timeout      int    `json:"timeout"`
	RetryCount   int    `json:"retryCount"`
	RetryDelay   int    `json:"retryDelay"`
	Group        string `json:"group,omitempty"`
	ProbeType    string `json:"probeType,omitempty"`
	HTTPURL      string `json:"httpUrl,omitempty"`
	HTTPMethod   string `json:"httpMethod,omitempty"`
	ExpectStatus int    `json:"expectStatus,omitempty"`
	TCPPort      int    `json:"tcpPort,omitempty"`
}

type ImportResult struct {
	Created int      `json:"created"`
	Updated int      `json:"updated"`
	Skipped int      `json:"skipped"`
	Errors  []string `json:"errors"`
}

type DashboardStats struct {
	TotalTargets      int        `json:"totalTargets"`
	Online            int        `json:"online"`
	Offline           int        `json:"offline"`
	Unknown           int        `json:"unknown"`
	Disabled          int        `json:"disabled"`
	ErrorCount        int        `json:"errorCount"`
	LastCheck         *time.Time `json:"lastCheck"`
	NextCheck         *time.Time `json:"nextCheck"`
	Monitoring        bool       `json:"monitoring"`
	Paused            bool       `json:"paused"`
	UptimePercent     float64    `json:"uptimePercent"`
	MutedUntil        string     `json:"mutedUntil"`
	OpenIncidents     int        `json:"openIncidents"`
	ActiveMaintenance int        `json:"activeMaintenance"`
}

type TargetMetrics struct {
	CurrentLatency *int64  `json:"currentLatency"`
	AverageLatency *int64  `json:"averageLatency"`
	MinLatency     *int64  `json:"minLatency"`
	MaxLatency     *int64  `json:"maxLatency"`
	UptimePercent  float64 `json:"uptimePercent"`
	TotalChecks    int     `json:"totalChecks"`
	Successful     int     `json:"successful"`
	Failed         int     `json:"failed"`
}

type TargetDetails struct {
	Target              Target              `json:"target"`
	Metrics             TargetMetrics       `json:"metrics"`
	RecentEvents        []Event             `json:"recentEvents"`
	RecentResults       []PingResult        `json:"recentResults"`
	LatencySeries       []LatencyPoint      `json:"latencySeries"`
	Availability        []AvailabilityPoint `json:"availability"`
	OpenIncident        *Incident           `json:"openIncident"`
	InMaintenance       bool                `json:"inMaintenance"`
	MaintenanceWindow   *MaintenanceWindow  `json:"maintenanceWindow"`
}

type LatencyPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Latency   *int64    `json:"latency"`
	Success   bool      `json:"success"`
}

type AvailabilityPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Up        bool      `json:"up"`
}

type PingTestResult struct {
	Host      string    `json:"host"`
	ProbeType ProbeType `json:"probeType"`
	Success   bool      `json:"success"`
	LatencyMs *int64    `json:"latencyMs"`
	Error     string    `json:"error"`
	Attempts  int       `json:"attempts"`
	Detail    string    `json:"detail"`
}

type ProbeTestInput struct {
	ProbeType    string `json:"probeType"`
	Host         string `json:"host"`
	Timeout      int    `json:"timeout"`
	HTTPURL      string `json:"httpUrl"`
	HTTPMethod   string `json:"httpMethod"`
	ExpectStatus int    `json:"expectStatus"`
	TCPPort      int    `json:"tcpPort"`
}

type MonitoringStatus struct {
	Running   bool       `json:"running"`
	Paused    bool       `json:"paused"`
	StartedAt *time.Time `json:"startedAt"`
}

func (t Target) EndpointLabel() string {
	switch NormalizeProbeType(string(t.ProbeType)) {
	case ProbeHTTP:
		if t.HTTPURL != "" {
			return t.HTTPURL
		}
		return t.Host
	case ProbeTCP:
		if t.TCPPort > 0 {
			return t.Host + ":" + itoa(t.TCPPort)
		}
		return t.Host
	default:
		return t.Host
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
