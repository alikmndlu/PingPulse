package domain

type NotificationKind string

const (
	KindAlert    NotificationKind = "alert"
	KindRecovery NotificationKind = "recovery"
	KindLatency  NotificationKind = "latency"
	KindTimeout  NotificationKind = "timeout"
)

type Notification struct {
	Kind        NotificationKind
	Title       string
	Body        string
	TargetID    string
	TargetName  string
	Host        string
	Status      string
	Failures    int
	LatencyMs   *int64
	LastSuccess string
	OccurredAt  string
}

type NotificationConfig struct {
	ID            string            `json:"id"`
	Provider      string            `json:"provider"`
	Enabled       bool              `json:"enabled"`
	APIURL        string            `json:"apiUrl"`
	APIKey        string            `json:"apiKey"`
	APIKeySet     bool              `json:"apiKeySet"`
	Sender        string            `json:"sender"`
	Recipient     string            `json:"recipient"`
	HTTPMethod    string            `json:"httpMethod"`
	CustomHeaders map[string]string `json:"customHeaders"`
	BodyTemplate  string            `json:"bodyTemplate"`
}

const (
	ProviderSMS      = "sms"
	ProviderDesktop  = "desktop"
	ProviderWebhook  = "webhook"
	ProviderTelegram = "telegram"
)

func DefaultMelipayamakURL() string {
	return "https://console.melipayamak.com/api/send/simple/{{apiKey}}"
}

func DefaultSMSTemplate() string {
	return `🚨 PingPulse Alert

Target: {{name}}
Host: {{host}}
Status: {{status}}
Failures: {{failures}}
Last Success: {{lastSuccess}}`
}

func DefaultRecoveryTemplate() string {
	return `✅ PingPulse Recovery

Target: {{name}}
Host: {{host}}
Status: {{status}}
Latency: {{latency}}`
}

func DefaultTelegramAPI() string {
	return "https://api.telegram.org"
}

func DefaultTelegramTemplate() string {
	return `PingPulse

{{name}} ({{host}})
Status: {{status}}
Failures: {{failures}}
Last success: {{lastSuccess}}
Time: {{time}}`
}

func DefaultWebhookTemplate() string {
	return `{
  "title": "{{title}}",
  "body": "{{body}}",
  "target": "{{name}}",
  "host": "{{host}}",
  "status": "{{status}}",
  "kind": "{{kind}}",
  "failures": {{failures}},
  "latency": "{{latency}}",
  "time": "{{time}}"
}`
}
