package domain

type Settings struct {
	StartOnBoot                  bool   `json:"startOnBoot"`
	MinimizeToTray               bool   `json:"minimizeToTray"`
	StartMonitoringAutomatically bool   `json:"startMonitoringAutomatically"`
	DefaultInterval              int    `json:"defaultInterval"`
	DefaultTimeout               int    `json:"defaultTimeout"`
	DefaultRetry                 int    `json:"defaultRetry"`
	DefaultRetryDelay            int    `json:"defaultRetryDelay"`
	FailureThreshold             int    `json:"failureThreshold"`
	RecoveryThreshold            int    `json:"recoveryThreshold"`
	SMSEnabled                   bool   `json:"smsEnabled"`
	DesktopNotificationEnabled   bool   `json:"desktopNotificationEnabled"`
	WebhookEnabled               bool   `json:"webhookEnabled"`
	TelegramEnabled              bool   `json:"telegramEnabled"`
	DiscordEnabled               bool   `json:"discordEnabled"`
	SlackEnabled                 bool   `json:"slackEnabled"`
	TeamsEnabled                 bool   `json:"teamsEnabled"`
	NotificationCooldownSeconds  int    `json:"notificationCooldownSeconds"`
	HighLatencyThresholdMs       int    `json:"highLatencyThresholdMs"`
	NotifyOnOffline              bool   `json:"notifyOnOffline"`
	NotifyOnRecovery             bool   `json:"notifyOnRecovery"`
	NotifyOnHighLatency          bool   `json:"notifyOnHighLatency"`
	NotifyOnTimeout              bool   `json:"notifyOnTimeout"`
	Theme                        string `json:"theme"`
	LogLevel                     string `json:"logLevel"`
	MutedUntil                   string `json:"mutedUntil"`
	HistoryRetentionDays         int    `json:"historyRetentionDays"`
	OnboardingComplete           bool   `json:"onboardingComplete"`
}

func DefaultSettings() Settings {
	return Settings{
		StartOnBoot:                  false,
		MinimizeToTray:               true,
		StartMonitoringAutomatically: true,
		DefaultInterval:              120,
		DefaultTimeout:               5,
		DefaultRetry:                 3,
		DefaultRetryDelay:            2,
		FailureThreshold:             3,
		RecoveryThreshold:            2,
		SMSEnabled:                   false,
		DesktopNotificationEnabled:   true,
		WebhookEnabled:               false,
		TelegramEnabled:              false,
		DiscordEnabled:               false,
		SlackEnabled:                 false,
		TeamsEnabled:                 false,
		NotificationCooldownSeconds:  600,
		HighLatencyThresholdMs:       500,
		NotifyOnOffline:              true,
		NotifyOnRecovery:             true,
		NotifyOnHighLatency:          false,
		NotifyOnTimeout:              false,
		Theme:                        "dark",
		LogLevel:                     "info",
		HistoryRetentionDays:         30,
	}
}

func (s Settings) Normalized() Settings {
	out := s
	if out.DefaultInterval < 5 {
		out.DefaultInterval = 5
	}
	if out.DefaultTimeout < 1 {
		out.DefaultTimeout = 1
	}
	if out.DefaultRetry < 0 {
		out.DefaultRetry = 0
	}
	if out.DefaultRetryDelay < 0 {
		out.DefaultRetryDelay = 0
	}
	if out.FailureThreshold < 1 {
		out.FailureThreshold = 1
	}
	if out.RecoveryThreshold < 1 {
		out.RecoveryThreshold = 1
	}
	if out.NotificationCooldownSeconds < 0 {
		out.NotificationCooldownSeconds = 0
	}
	if out.HighLatencyThresholdMs < 1 {
		out.HighLatencyThresholdMs = 1
	}
	switch out.Theme {
	case "dark", "light":
	default:
		out.Theme = "dark"
	}
	switch out.LogLevel {
	case "debug", "info", "warn", "error":
	default:
		out.LogLevel = "info"
	}
	if !IsMuted(out.MutedUntil) {
		out.MutedUntil = ""
	}
	switch out.HistoryRetentionDays {
	case 7, 30, 90:
	default:
		out.HistoryRetentionDays = 30
	}
	return out
}

type DataPaths struct {
	Dir      string `json:"dir"`
	Database string `json:"database"`
	Log      string `json:"log"`
}

type BackupResult struct {
	Cancelled        bool   `json:"cancelled"`
	Path             string `json:"path"`
	RestartRequired  bool   `json:"restartRequired"`
}
