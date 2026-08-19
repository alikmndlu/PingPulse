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

	a.hub = notification.NewHub(a.settings, a.notifRepo, wailsEmitter{app: a}, a.logger.Logger,
		notification.NewSMSProvider(a.notifRepo),
		notification.NewWebhookProvider(a.notifRepo),
		notification.NewDesktopProvider(),
	)
	a.engine = monitor.NewEngine(monitor.NewICMPPinger(), a.targets, a.results, a.events, a.settings, a.hub, wailsEmitter{app: a}, a.logger.Logger)
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
		Name:       input.Name,
		Host:       input.Host,
		Enabled:    *input.Enabled,
		Interval:   *input.Interval,
		Timeout:    *input.Timeout,
		RetryCount: *input.RetryCount,
		RetryDelay: *input.RetryDelay,
		LastStatus: domain.StatusUnknown,
	}
	if !t.Enabled {
		t.LastStatus = domain.StatusDisabled
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
		host := domain.NormalizeHost(*input.Host)
		if err := domain.ValidateHost(host); err != nil {
			return domain.Target{}, publicErr(err)
		}
		t.Host = host
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

func (a *App) TestPing(host string, timeout int) (domain.PingTestResult, error) {
	host = domain.NormalizeHost(host)
	if err := domain.ValidateHost(host); err != nil {
		return domain.PingTestResult{}, publicErr(err)
	}
	if timeout < 1 {
		timeout = 5
	}
	ctx, cancel := context.WithTimeout(a.requestContext(), time.Duration(timeout+2)*time.Second)
	defer cancel()
	result := a.engine.TestPing(ctx, host, timeout, 0, 0)
	return result, nil
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
	return domain.TargetDetails{
		Target: t, Metrics: metrics, RecentEvents: events, RecentResults: results,
		LatencySeries: series, Availability: avail,
	}, nil
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
	return maskConfig(c), nil
}

func (a *App) UpdateNotificationConfig(c domain.NotificationConfig) (domain.NotificationConfig, error) {
	ctx := a.requestContext()
	if c.Provider != domain.ProviderSMS && c.Provider != domain.ProviderWebhook {
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
		existing, err := a.targets.GetByHost(ctx, in.Host)
		if err == nil {
			existing.Name = in.Name
			existing.Enabled = *in.Enabled
			existing.Interval = *in.Interval
			existing.Timeout = *in.Timeout
			existing.RetryCount = *in.RetryCount
			existing.RetryDelay = *in.RetryDelay
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
