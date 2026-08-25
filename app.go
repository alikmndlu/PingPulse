package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync/atomic"
	"time"

	"pingpulse/internal/autostart"
	"pingpulse/internal/config"
	"pingpulse/internal/database"
	"pingpulse/internal/domain"
	"pingpulse/internal/impex"
	"pingpulse/internal/logging"
	"pingpulse/internal/monitor"
	"pingpulse/internal/notification"
	"pingpulse/internal/repository"
	"pingpulse/internal/scheduler"
	"pingpulse/internal/tray"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx       context.Context
	db        *sql.DB
	logger    *logging.Logger
	targets   *repository.TargetRepository
	results   *repository.ResultRepository
	events    *repository.EventRepository
	settings  *repository.SettingsRepository
	notifRepo *repository.NotificationRepository
	groups    *repository.GroupRepository
	maintenance *repository.MaintenanceRepository
	incidents *repository.IncidentRepository
	engine    *monitor.Engine
	scheduler *scheduler.Scheduler
	hub       *notification.Hub
	tray      *tray.Tray
	icon      []byte
	quitting  atomic.Bool
}

func NewApp(icon []byte) *App {
	return &App{icon: icon}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	logPath, err := config.LogPath()
	if err != nil {
		return
	}
	a.logger, err = logging.New(logPath, "info")
	if err != nil {
		a.logger = logging.NewNop()
	}
	dbPath, err := config.DatabasePath()
	if err != nil {
		a.logger.Error("resolve database path", "error", err)
		return
	}
	db, err := openDB(dbPath)
	if err != nil {
		a.logger.Error("open database", "error", err)
		return
	}
	a.db = db
	a.targets = repository.NewTargetRepository(db)
	a.results = repository.NewResultRepository(db)
	a.events = repository.NewEventRepository(db)
	a.settings = repository.NewSettingsRepository(db)
	a.notifRepo = repository.NewNotificationRepository(db)
	a.groups = repository.NewGroupRepository(db)
	a.maintenance = repository.NewMaintenanceRepository(db)
	a.incidents = repository.NewIncidentRepository(db)

	a.hub = notification.NewHub(a.settings, a.notifRepo, wailsEmitter{app: a}, a.logger.Logger,
		notification.NewSMSProvider(a.notifRepo),
		notification.NewWebhookProvider(a.notifRepo),
		notification.NewTelegramProvider(a.notifRepo),
		notification.NewDesktopProvider(),
	)
	a.engine = monitor.NewEngine(monitor.NewICMPPinger(), a.targets, a.results, a.events, a.settings, a.hub, wailsEmitter{app: a}, a.logger.Logger)
	a.engine.SetMaintenance(a.maintenance)
	a.engine.SetIncidents(a.incidents)
	a.scheduler = scheduler.New(a.targets, a.engine, wailsEmitter{app: a}, a.logger.Logger)

	settings, err := a.settings.Get(ctx)
	if err == nil {
		a.logger.SetLevel(settings.LogLevel)
		if settings.StartOnBoot {
			_ = autostart.Enable()
		}
		if settings.StartMonitoringAutomatically {
			if err := a.scheduler.Start(ctx); err != nil {
				a.logger.Error("auto-start monitoring", "error", err)
			}
		}
	}

	a.tray = tray.New(a.icon, a.logger.Logger, tray.Callbacks{
		OnOpen:  func() { runtime.WindowShow(a.ctx); runtime.WindowUnminimise(a.ctx) },
		OnStart: func() { _ = a.StartMonitoring() },
		OnStop:  func() { _ = a.StopMonitoring() },
		OnPause: func() { _ = a.PauseAll() },
		OnQuit:  func() { a.QuitApp() },
	})
	a.tray.Start()
	a.refreshTray()
	a.logger.Info("PingPulse started", "db", dbPath)
}

func (a *App) shutdown(ctx context.Context) {
	a.quitting.Store(true)
	if a.scheduler != nil {
		a.scheduler.Stop()
	}
	if a.tray != nil {
		a.tray.Stop()
	}
	if a.db != nil {
		_ = a.db.Close()
	}
	if a.logger != nil {
		_ = a.logger.Close()
	}
}

func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	if a.quitting.Load() {
		return false
	}
	if a.settings != nil {
		s, err := a.settings.Get(ctx)
		if err == nil && s.MinimizeToTray {
			runtime.WindowHide(ctx)
			return true
		}
	}
	return false
}

func (a *App) emit(name string, data ...any) {
	if a.ctx == nil {
		return
	}
	runtime.EventsEmit(a.ctx, name, data...)
	if name == domain.WailsTargetStatusChanged {
		a.refreshTray()
	}
}

type wailsEmitter struct {
	app *App
}

func (e wailsEmitter) Emit(name string, data ...any) {
	e.app.emit(name, data...)
}

func (a *App) GetTargets() ([]domain.Target, error) {
	ctx := a.requestContext()
	items, err := a.targets.List(ctx)
	return items, publicErr(err)
}

func (a *App) GetTarget(id string) (domain.Target, error) {
	t, err := a.targets.Get(a.requestContext(), id)
	return t, publicErr(err)
}

func (a *App) CreateTarget(input domain.CreateTargetInput) (domain.Target, error) {
	ctx := a.requestContext()
	s, err := a.settings.Get(ctx)
	if err != nil {
		return domain.Target{}, publicErr(err)
	}
	input = domain.ApplyTargetDefaults(input, s)
	if err := domain.ValidateCreateTarget(input); err != nil {
		return domain.Target{}, publicErr(err)
	}
	t := domain.Target{
		Name:         input.Name,
		Host:         input.Host,
		Enabled:      *input.Enabled,
		Interval:     *input.Interval,
		Timeout:      *input.Timeout,
		RetryCount:   *input.RetryCount,
		RetryDelay:   *input.RetryDelay,
		LastStatus:   domain.StatusUnknown,
		ProbeType:    domain.NormalizeProbeType(input.ProbeType),
		HTTPURL:      input.HTTPURL,
		HTTPMethod:   domain.NormalizeHTTPMethod(input.HTTPMethod),
		ExpectStatus: 200,
		TCPPort:      0,
	}
	if input.ExpectStatus != nil {
		t.ExpectStatus = *input.ExpectStatus
	}
	if input.TCPPort != nil {
		t.TCPPort = *input.TCPPort
	}
	if !t.Enabled {
		t.LastStatus = domain.StatusDisabled
	}
	if input.GroupID != "" {
		if _, err := a.groups.Get(ctx, input.GroupID); err != nil {
			return domain.Target{}, publicErr(domain.NewValidationError("groupId", "group was not found"))
		}
		t.GroupID = input.GroupID
	}
	created, err := a.targets.Create(ctx, t)
	if err != nil {
		return domain.Target{}, publicErr(err)
	}
	a.scheduler.Upsert(created)
	return created, nil
}

func (a *App) UpdateTarget(id string, input domain.UpdateTargetInput) (domain.Target, error) {
	ctx := a.requestContext()
	t, err := a.targets.Get(ctx, id)
	if err != nil {
		return domain.Target{}, publicErr(err)
	}
	if input.Name != nil {
		if err := domain.ValidateTargetName(*input.Name); err != nil {
			return domain.Target{}, publicErr(err)
		}
		t.Name = strings.TrimSpace(*input.Name)
	}
	if input.Host != nil {
		t.Host = strings.TrimSpace(*input.Host)
	}
	if input.ProbeType != nil {
		t.ProbeType = domain.NormalizeProbeType(*input.ProbeType)
	}
	if input.HTTPURL != nil {
		t.HTTPURL = strings.TrimSpace(*input.HTTPURL)
	}
	if input.HTTPMethod != nil {
		t.HTTPMethod = domain.NormalizeHTTPMethod(*input.HTTPMethod)
	}
	if input.ExpectStatus != nil {
		if err := domain.ValidatePositiveRange("expectStatus", *input.ExpectStatus, 100, 599); err != nil {
			return domain.Target{}, publicErr(err)
		}
		t.ExpectStatus = *input.ExpectStatus
	}
	if input.TCPPort != nil {
		t.TCPPort = *input.TCPPort
	}
	// Re-normalize probe-specific fields after updates.
	probeIn := domain.CreateTargetInput{
		Name: t.Name, Host: t.Host, ProbeType: string(t.ProbeType),
		HTTPURL: t.HTTPURL, HTTPMethod: t.HTTPMethod, ExpectStatus: &t.ExpectStatus, TCPPort: &t.TCPPort,
		Enabled: &t.Enabled, Interval: &t.Interval, Timeout: &t.Timeout, RetryCount: &t.RetryCount, RetryDelay: &t.RetryDelay,
	}
	s, _ := a.settings.Get(ctx)
	probeIn = domain.ApplyTargetDefaults(probeIn, s)
	if err := domain.ValidateCreateTarget(probeIn); err != nil {
		return domain.Target{}, publicErr(err)
	}
	t.Host = probeIn.Host
	t.ProbeType = domain.NormalizeProbeType(probeIn.ProbeType)
	t.HTTPURL = probeIn.HTTPURL
	t.HTTPMethod = probeIn.HTTPMethod
	if probeIn.ExpectStatus != nil {
		t.ExpectStatus = *probeIn.ExpectStatus
	}
	if probeIn.TCPPort != nil {
		t.TCPPort = *probeIn.TCPPort
	}
	if input.Enabled != nil {
		t.Enabled = *input.Enabled
		if !t.Enabled {
			t.LastStatus = domain.StatusDisabled
			t.ConsecutiveFailures = 0
			t.ConsecutiveSuccesses = 0
		} else if t.LastStatus == domain.StatusDisabled {
			t.LastStatus = domain.StatusUnknown
		}
	}
	if input.Interval != nil {
		if err := domain.ValidatePositiveRange("interval", *input.Interval, 5, 86400); err != nil {
			return domain.Target{}, publicErr(err)
		}
		t.Interval = *input.Interval
	}
	if input.Timeout != nil {
		if err := domain.ValidatePositiveRange("timeout", *input.Timeout, 1, 60); err != nil {
			return domain.Target{}, publicErr(err)
		}
		t.Timeout = *input.Timeout
	}
	if input.RetryCount != nil {
		if err := domain.ValidatePositiveRange("retryCount", *input.RetryCount, 0, 10); err != nil {
			return domain.Target{}, publicErr(err)
		}
		t.RetryCount = *input.RetryCount
	}
	if input.RetryDelay != nil {
		if err := domain.ValidatePositiveRange("retryDelay", *input.RetryDelay, 0, 60); err != nil {
			return domain.Target{}, publicErr(err)
		}
		t.RetryDelay = *input.RetryDelay
	}
	if input.GroupID != nil {
		gid := strings.TrimSpace(*input.GroupID)
		if gid != "" {
			if _, err := a.groups.Get(ctx, gid); err != nil {
				return domain.Target{}, publicErr(domain.NewValidationError("groupId", "group was not found"))
			}
		}
		t.GroupID = gid
	}
	updated, err := a.targets.Update(ctx, t)
	if err != nil {
		return domain.Target{}, publicErr(err)
	}
	a.scheduler.Upsert(updated)
	return updated, nil
}

func (a *App) DeleteTarget(id string) error {
	ctx := a.requestContext()
	a.scheduler.Remove(id)
	return publicErr(a.targets.Delete(ctx, id))
}

func (a *App) SetTargetEnabled(id string, enabled bool) (domain.Target, error) {
	return a.UpdateTarget(id, domain.UpdateTargetInput{Enabled: &enabled})
}

func (a *App) MuteNotifications(seconds int) (domain.Settings, error) {
	ctx := a.requestContext()
	s, err := a.settings.Get(ctx)
	if err != nil {
		return domain.Settings{}, publicErr(err)
	}
	s.MutedUntil = domain.MuteUntil(seconds)
	if err := a.settings.Save(ctx, s); err != nil {
		return domain.Settings{}, publicErr(err)
	}
	a.emit(domain.WailsMuteChanged, s.MutedUntil)
	return s, nil
}

func (a *App) MuteTarget(id string, seconds int) (domain.Target, error) {
	ctx := a.requestContext()
	t, err := a.targets.Get(ctx, id)
	if err != nil {
		return domain.Target{}, publicErr(err)
	}
	t.MutedUntil = domain.MuteUntil(seconds)
	updated, err := a.targets.Update(ctx, t)
	if err != nil {
		return domain.Target{}, publicErr(err)
	}
	a.emit(domain.WailsMuteChanged, map[string]string{"targetId": updated.ID, "mutedUntil": updated.MutedUntil})
	return updated, nil
}

func (a *App) ListGroups() ([]domain.TargetGroup, error) {
	if a.groups == nil {
		return []domain.TargetGroup{}, fmt.Errorf("application is still starting")
	}
	items, err := a.groups.List(a.requestContext())
	if items == nil {
		items = []domain.TargetGroup{}
	}
	return items, publicErr(err)
}

func (a *App) CreateGroup(name, color string) (domain.TargetGroup, error) {
	ctx := a.requestContext()
	if err := domain.ValidateGroupName(name); err != nil {
		return domain.TargetGroup{}, publicErr(err)
	}
	normalized, err := domain.NormalizeGroupColor(color)
	if err != nil {
		return domain.TargetGroup{}, publicErr(err)
	}
	created, err := a.groups.Create(ctx, domain.TargetGroup{Name: strings.TrimSpace(name), Color: normalized})
	if err != nil {
		return domain.TargetGroup{}, publicErr(err)
	}
	a.emit(domain.WailsGroupsChanged, created)
	return created, nil
}

func (a *App) UpdateGroup(id, name, color string) (domain.TargetGroup, error) {
	ctx := a.requestContext()
	g, err := a.groups.Get(ctx, id)
	if err != nil {
		return domain.TargetGroup{}, publicErr(err)
	}
	if err := domain.ValidateGroupName(name); err != nil {
		return domain.TargetGroup{}, publicErr(err)
	}
	normalized, err := domain.NormalizeGroupColor(color)
	if err != nil {
		return domain.TargetGroup{}, publicErr(err)
	}
	g.Name = strings.TrimSpace(name)
	g.Color = normalized
	updated, err := a.groups.Update(ctx, g)
	if err != nil {
		return domain.TargetGroup{}, publicErr(err)
	}
	a.emit(domain.WailsGroupsChanged, updated)
	return updated, nil
}

func (a *App) DeleteGroup(id string) error {
	if err := a.groups.Delete(a.requestContext(), id); err != nil {
		return publicErr(err)
	}
	a.emit(domain.WailsGroupsChanged, id)
	return nil
}

func (a *App) TestPing(host string, timeout int) (domain.PingTestResult, error) {
	return a.TestProbe(domain.ProbeTestInput{ProbeType: string(domain.ProbeICMP), Host: host, Timeout: timeout})
}

func (a *App) TestProbe(input domain.ProbeTestInput) (domain.PingTestResult, error) {
	if a.engine == nil {
		return domain.PingTestResult{}, fmt.Errorf("application is still starting")
	}
	timeout := input.Timeout
	if timeout < 1 {
		timeout = 5
	}
	ctx, cancel := context.WithTimeout(a.requestContext(), time.Duration(timeout+5)*time.Second)
	defer cancel()
	return a.engine.TestProbe(ctx, input), nil
}

func (a *App) GetTargetHistory(filter domain.HistoryFilter) (domain.HistoryPage, error) {
	page, err := a.results.List(a.requestContext(), filter)
	return page, publicErr(err)
}

func (a *App) GetDashboardStats() (domain.DashboardStats, error) {
	ctx := a.requestContext()
	stats, err := a.targets.Stats(ctx)
	if err != nil {
		return stats, publicErr(err)
	}
	st := a.scheduler.Status()
	stats.Monitoring = st.Running
	stats.Paused = st.Paused
	stats.NextCheck = a.scheduler.NextCheck()
	targets, err := a.targets.List(ctx)
	if err == nil && len(targets) > 0 {
		var up, total int
		for _, t := range targets {
			if !t.Enabled {
				continue
			}
			m, err := a.targets.Metrics(ctx, t.ID)
			if err == nil {
				up += m.Successful
				total += m.TotalChecks
			}
		}
		if total > 0 {
			stats.UptimePercent = (float64(up) / float64(total)) * 100
		}
	}
	if err == nil {
		s, serr := a.settings.Get(ctx)
		if serr == nil {
			stats.MutedUntil = s.MutedUntil
		}
	}
	if a.incidents != nil {
		if n, err := a.incidents.OpenCount(ctx); err == nil {
			stats.OpenIncidents = n
		}
	}
	if a.maintenance != nil {
		if n, err := a.maintenance.ActiveCount(ctx); err == nil {
			stats.ActiveMaintenance = n
		}
	}
	return stats, nil
}

func (a *App) GetTargetDetails(id string) (domain.TargetDetails, error) {
	ctx := a.requestContext()
	t, err := a.targets.Get(ctx, id)
	if err != nil {
		return domain.TargetDetails{}, publicErr(err)
	}
	metrics, err := a.targets.Metrics(ctx, id)
	if err != nil {
		return domain.TargetDetails{}, publicErr(err)
	}
	metrics.CurrentLatency = t.LastLatency
	events, _ := a.events.List(ctx, domain.EventFilter{TargetID: id, Limit: 20})
	results, _ := a.results.Recent(ctx, id, 30)
	series, _ := a.results.Series(ctx, id, 120)
	avail := make([]domain.AvailabilityPoint, 0, len(series))
	for _, p := range series {
		avail = append(avail, domain.AvailabilityPoint{Timestamp: p.Timestamp, Up: p.Success})
	}
	if events == nil {
		events = []domain.Event{}
	}
	if results == nil {
		results = []domain.PingResult{}
	}
	details := domain.TargetDetails{
		Target: t, Metrics: metrics, RecentEvents: events, RecentResults: results,
		LatencySeries: series, Availability: avail,
	}
	if a.incidents != nil {
		if open, err := a.incidents.GetOpen(ctx, id); err == nil {
			details.OpenIncident = &open
		}
	}
	if a.maintenance != nil {
		if effect, err := a.maintenance.EffectFor(ctx, t, time.Now().UTC()); err == nil && effect.Active {
			details.InMaintenance = true
			details.MaintenanceWindow = effect.Window
		}
	}
	return details, nil
}

func (a *App) GetSettings() (domain.Settings, error) {
	s, err := a.settings.Get(a.requestContext())
	return s, publicErr(err)
}

func (a *App) UpdateSettings(s domain.Settings) (domain.Settings, error) {
	s = s.Normalized()
	if err := a.settings.Save(a.requestContext(), s); err != nil {
		return s, publicErr(err)
	}
	a.logger.SetLevel(s.LogLevel)
	if s.StartOnBoot {
		if err := autostart.Enable(); err != nil {
			a.logger.Warn("enable autostart", "error", err)
		}
	} else {
		_ = autostart.Disable()
	}
	return s, nil
}

func (a *App) GetNotificationConfig(provider string) (domain.NotificationConfig, error) {
	c, err := a.notifRepo.Get(a.requestContext(), provider)
	if err != nil {
		return c, publicErr(err)
	}
	if c.Provider == domain.ProviderSMS && strings.TrimSpace(c.APIURL) == "" {
		c.APIURL = domain.DefaultMelipayamakURL()
	}
	if c.Provider == domain.ProviderTelegram {
		if strings.TrimSpace(c.APIURL) == "" {
			c.APIURL = domain.DefaultTelegramAPI()
		}
		if strings.TrimSpace(c.BodyTemplate) == "" {
			c.BodyTemplate = domain.DefaultTelegramTemplate()
		}
	}
	return maskConfig(c), nil
}

func (a *App) UpdateNotificationConfig(c domain.NotificationConfig) (domain.NotificationConfig, error) {
	ctx := a.requestContext()
	if c.Provider != domain.ProviderSMS && c.Provider != domain.ProviderWebhook && c.Provider != domain.ProviderTelegram {
		return c, domain.NewValidationError("provider", "unsupported provider")
	}
	existing, err := a.notifRepo.Get(ctx, c.Provider)
	if err != nil {
		return c, publicErr(err)
	}
	if strings.TrimSpace(c.APIKey) == "" {
		c.APIKey = existing.APIKey
	}
	if c.HTTPMethod == "" {
		c.HTTPMethod = "POST"
	}
	if c.CustomHeaders == nil {
		c.CustomHeaders = map[string]string{}
	}
	if err := a.notifRepo.Save(ctx, c); err != nil {
		return c, publicErr(err)
	}
	saved, err := a.notifRepo.Get(ctx, c.Provider)
	if err != nil {
		return c, publicErr(err)
	}
	return maskConfig(saved), nil
}

func (a *App) TestNotification(provider string) error {
	return publicErr(a.hub.Test(a.requestContext(), provider))
}

func (a *App) ImportTargets(payload, format string) (domain.ImportResult, error) {
	items, err := impex.Parse(payload, format)
	if err != nil {
		return domain.ImportResult{}, publicErr(err)
	}
	ctx := a.requestContext()
	s, err := a.settings.Get(ctx)
	if err != nil {
		return domain.ImportResult{}, publicErr(err)
	}
	var result domain.ImportResult
	for i, in := range items {
		in = domain.ApplyTargetDefaults(in, s)
		if err := domain.ValidateCreateTarget(in); err != nil {
			result.Skipped++
			result.Errors = append(result.Errors, impex.FormatError(i, err))
			continue
		}
		gid, gerr := a.resolveImportGroup(ctx, in.GroupID)
		if gerr != nil {
			result.Skipped++
			result.Errors = append(result.Errors, impex.FormatError(i, gerr))
			continue
		}
		in.GroupID = gid
		probe := domain.NormalizeProbeType(in.ProbeType)
		tcpPort, expect := 0, 200
		if in.TCPPort != nil {
			tcpPort = *in.TCPPort
		}
		if in.ExpectStatus != nil {
			expect = *in.ExpectStatus
		}
		existing, err := a.targets.FindByIdentity(ctx, probe, in.Host, tcpPort, in.HTTPURL)
		if err == nil {
			existing.Name = in.Name
			existing.Enabled = *in.Enabled
			existing.Interval = *in.Interval
			existing.Timeout = *in.Timeout
			existing.RetryCount = *in.RetryCount
			existing.RetryDelay = *in.RetryDelay
			existing.GroupID = gid
			existing.ProbeType = probe
			existing.HTTPURL = in.HTTPURL
			existing.HTTPMethod = domain.NormalizeHTTPMethod(in.HTTPMethod)
			existing.ExpectStatus = expect
			existing.TCPPort = tcpPort
			if !existing.Enabled {
				existing.LastStatus = domain.StatusDisabled
			}
			updated, err := a.targets.Update(ctx, existing)
			if err != nil {
				result.Skipped++
				result.Errors = append(result.Errors, impex.FormatError(i, err))
				continue
			}
			a.scheduler.Upsert(updated)
			result.Updated++
			continue
		}
		created, err := a.CreateTarget(in)
		if err != nil {
			result.Skipped++
			result.Errors = append(result.Errors, impex.FormatError(i, err))
			continue
		}
		_ = created
		result.Created++
	}
	return result, nil
}

func (a *App) ExportTargets(format string) (string, error) {
	items, err := a.targets.List(a.requestContext())
	if err != nil {
		return "", publicErr(err)
	}
	switch strings.ToLower(format) {
	case "csv":
		return impex.ExportCSV(items)
	default:
		return impex.ExportJSON(items)
	}
}

func (a *App) StartMonitoring() error {
	if a.scheduler == nil {
		return fmt.Errorf("application is still starting")
	}
	return publicErr(a.scheduler.Start(a.requestContext()))
}

func (a *App) StopMonitoring() error {
	a.scheduler.Stop()
	return nil
}

func (a *App) PauseAll() error {
	a.scheduler.Pause()
	return nil
}

func (a *App) GetMonitoringStatus() (domain.MonitoringStatus, error) {
	return a.scheduler.Status(), nil
}

func (a *App) GetEvents(filter domain.EventFilter) ([]domain.Event, error) {
	items, err := a.events.List(a.requestContext(), filter)
	if items == nil {
		items = []domain.Event{}
	}
	return items, publicErr(err)
}

func (a *App) MinimizeToTray() error {
	if a.ctx != nil {
		runtime.WindowHide(a.ctx)
	}
	return nil
}

func (a *App) ListMaintenanceWindows() ([]domain.MaintenanceWindow, error) {
	if a.maintenance == nil {
		return []domain.MaintenanceWindow{}, fmt.Errorf("application is still starting")
	}
	items, err := a.maintenance.List(a.requestContext())
	if items == nil {
		items = []domain.MaintenanceWindow{}
	}
	return items, publicErr(err)
}

func (a *App) CreateMaintenanceWindow(input domain.CreateMaintenanceInput) (domain.MaintenanceWindow, error) {
	if a.maintenance == nil {
		return domain.MaintenanceWindow{}, fmt.Errorf("application is still starting")
	}
	ctx := a.requestContext()
	if err := domain.ValidateMaintenanceName(input.Name); err != nil {
		return domain.MaintenanceWindow{}, publicErr(err)
	}
	starts, err := repository.ParseTimeInput(input.StartsAt)
	if err != nil {
		return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("startsAt", "invalid start time"))
	}
	ends, err := repository.ParseTimeInput(input.EndsAt)
	if err != nil {
		return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("endsAt", "invalid end time"))
	}
	if !ends.After(starts) {
		return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("endsAt", "end time must be after start time"))
	}
	suppressChecks := true
	if input.SuppressChecks != nil {
		suppressChecks = *input.SuppressChecks
	}
	suppressNotif := true
	if input.SuppressNotifications != nil {
		suppressNotif = *input.SuppressNotifications
	}
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	targetID := strings.TrimSpace(input.TargetID)
	groupID := strings.TrimSpace(input.GroupID)
	if targetID != "" && groupID != "" {
		return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("scope", "choose either a target or a group, not both"))
	}
	if targetID != "" {
		if _, err := a.targets.Get(ctx, targetID); err != nil {
			return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("targetId", "target was not found"))
		}
	}
	if groupID != "" {
		if _, err := a.groups.Get(ctx, groupID); err != nil {
			return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("groupId", "group was not found"))
		}
	}
	created, err := a.maintenance.Create(ctx, domain.MaintenanceWindow{
		Name: strings.TrimSpace(input.Name), TargetID: targetID, GroupID: groupID,
		StartsAt: starts, EndsAt: ends, Reason: strings.TrimSpace(input.Reason),
		SuppressChecks: suppressChecks, SuppressNotifications: suppressNotif, Enabled: enabled,
	})
	if err != nil {
		return domain.MaintenanceWindow{}, publicErr(err)
	}
	a.emit(domain.WailsMaintenanceChanged, created)
	return created, nil
}

func (a *App) UpdateMaintenanceWindow(id string, input domain.UpdateMaintenanceInput) (domain.MaintenanceWindow, error) {
	if a.maintenance == nil {
		return domain.MaintenanceWindow{}, fmt.Errorf("application is still starting")
	}
	ctx := a.requestContext()
	w, err := a.maintenance.Get(ctx, id)
	if err != nil {
		return domain.MaintenanceWindow{}, publicErr(err)
	}
	if input.Name != nil {
		if err := domain.ValidateMaintenanceName(*input.Name); err != nil {
			return domain.MaintenanceWindow{}, publicErr(err)
		}
		w.Name = strings.TrimSpace(*input.Name)
	}
	if input.StartsAt != nil {
		t, err := repository.ParseTimeInput(*input.StartsAt)
		if err != nil {
			return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("startsAt", "invalid start time"))
		}
		w.StartsAt = t
	}
	if input.EndsAt != nil {
		t, err := repository.ParseTimeInput(*input.EndsAt)
		if err != nil {
			return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("endsAt", "invalid end time"))
		}
		w.EndsAt = t
	}
	if !w.EndsAt.After(w.StartsAt) {
		return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("endsAt", "end time must be after start time"))
	}
	if input.Reason != nil {
		w.Reason = strings.TrimSpace(*input.Reason)
	}
	if input.SuppressChecks != nil {
		w.SuppressChecks = *input.SuppressChecks
	}
	if input.SuppressNotifications != nil {
		w.SuppressNotifications = *input.SuppressNotifications
	}
	if input.Enabled != nil {
		w.Enabled = *input.Enabled
	}
	if input.TargetID != nil {
		w.TargetID = strings.TrimSpace(*input.TargetID)
		if w.TargetID != "" {
			if _, err := a.targets.Get(ctx, w.TargetID); err != nil {
				return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("targetId", "target was not found"))
			}
			w.GroupID = ""
		}
	}
	if input.GroupID != nil {
		w.GroupID = strings.TrimSpace(*input.GroupID)
		if w.GroupID != "" {
			if _, err := a.groups.Get(ctx, w.GroupID); err != nil {
				return domain.MaintenanceWindow{}, publicErr(domain.NewValidationError("groupId", "group was not found"))
			}
			w.TargetID = ""
		}
	}
	updated, err := a.maintenance.Update(ctx, w)
	if err != nil {
		return domain.MaintenanceWindow{}, publicErr(err)
	}
	a.emit(domain.WailsMaintenanceChanged, updated)
	return updated, nil
}

func (a *App) DeleteMaintenanceWindow(id string) error {
	if a.maintenance == nil {
		return fmt.Errorf("application is still starting")
	}
	if err := a.maintenance.Delete(a.requestContext(), id); err != nil {
		return publicErr(err)
	}
	a.emit(domain.WailsMaintenanceChanged, id)
	return nil
}

func (a *App) GetIncidents(filter domain.IncidentFilter) (domain.IncidentPage, error) {
	if a.incidents == nil {
		return domain.IncidentPage{Items: []domain.Incident{}}, fmt.Errorf("application is still starting")
	}
	page, err := a.incidents.List(a.requestContext(), filter)
	if page.Items == nil {
		page.Items = []domain.Incident{}
	}
	return page, publicErr(err)
}

func (a *App) GetIncidentReport(from, to string) (domain.IncidentReport, error) {
	if a.incidents == nil {
		return domain.IncidentReport{}, fmt.Errorf("application is still starting")
	}
	end := time.Now().UTC()
	start := end.Add(-30 * 24 * time.Hour)
	if strings.TrimSpace(from) != "" {
		t, err := repository.ParseTimeInput(from)
		if err != nil {
			return domain.IncidentReport{}, publicErr(domain.NewValidationError("from", "invalid from date"))
		}
		start = t
	}
	if strings.TrimSpace(to) != "" {
		t, err := repository.ParseTimeInput(to)
		if err != nil {
			return domain.IncidentReport{}, publicErr(domain.NewValidationError("to", "invalid to date"))
		}
		end = t
	}
	if !end.After(start) {
		return domain.IncidentReport{}, publicErr(domain.NewValidationError("to", "end must be after start"))
	}
	report, err := a.incidents.Report(a.requestContext(), start, end)
	if report.ByTarget == nil {
		report.ByTarget = []domain.IncidentTargetStat{}
	}
	if report.Recent == nil {
		report.Recent = []domain.Incident{}
	}
	return report, publicErr(err)
}

func (a *App) QuitApp() {
	a.quitting.Store(true)
	if a.ctx != nil {
		runtime.Quit(a.ctx)
	}
}

func (a *App) requestContext() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
}

func (a *App) resolveImportGroup(ctx context.Context, name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", nil
	}
	if err := domain.ValidateGroupName(name); err != nil {
		return "", err
	}
	g, err := a.groups.EnsureByName(ctx, name, domain.DefaultGroupColor)
	if err != nil {
		return "", err
	}
	return g.ID, nil
}

func (a *App) refreshTray() {
	if a.tray == nil || a.targets == nil {
		return
	}
	stats, err := a.targets.Stats(a.requestContext())
	if err != nil {
		return
	}
	a.tray.SetOfflineCount(stats.Offline)
}

func maskConfig(c domain.NotificationConfig) domain.NotificationConfig {
	c.APIKeySet = c.APIKey != ""
	c.APIKey = ""
	return c
}

func publicErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, domain.ErrNotFound) {
		return fmt.Errorf("the requested item was not found")
	}
	if errors.Is(err, domain.ErrDuplicateTarget) {
		return fmt.Errorf("a target with this host already exists")
	}
	if errors.Is(err, domain.ErrDuplicateGroup) {
		return fmt.Errorf("a group with this name already exists")
	}
	var ve *domain.ValidationError
	if errors.As(err, &ve) {
		return ve
	}
	var pe *domain.PingError
	if errors.As(err, &pe) {
		return pe
	}
	slog.Debug("internal error", "error", err)
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "unique") {
		if strings.Contains(msg, "target_groups") {
			return fmt.Errorf("a group with this name already exists")
		}
		return fmt.Errorf("a target with this host already exists")
	}
	if strings.Contains(msg, "constraint") {
		return fmt.Errorf("unable to save data. Please try again")
	}
	if strings.Contains(msg, "locked") || strings.Contains(msg, "busy") {
		return fmt.Errorf("the database is busy. Please try again")
	}
	return err
}

func openDB(path string) (*sql.DB, error) {
	return database.Open(path)
}
