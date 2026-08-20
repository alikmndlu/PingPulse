package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

type Emitter interface {
	Emit(name string, data ...any)
}

type SettingsProvider interface {
	Get(ctx context.Context) (domain.Settings, error)
}

type Notifier interface {
	Notify(ctx context.Context, n domain.Notification) error
}

type Engine struct {
	pinger       Pinger
	httpProber   *HTTPProber
	tcpProber    *TCPProber
	targets      *repository.TargetRepository
	results      *repository.ResultRepository
	events       *repository.EventRepository
	maintenance  *repository.MaintenanceRepository
	incidents    *repository.IncidentRepository
	settings     SettingsProvider
	notifier     Notifier
	emitter      Emitter
	logger       *slog.Logger
}

func NewEngine(
	pinger Pinger,
	targets *repository.TargetRepository,
	results *repository.ResultRepository,
	events *repository.EventRepository,
	settings SettingsProvider,
	notifier Notifier,
	emitter Emitter,
	logger *slog.Logger,
) *Engine {
	if logger == nil {
		logger = slog.Default()
	}
	return &Engine{
		pinger:     pinger,
		httpProber: NewHTTPProber(),
		tcpProber:  NewTCPProber(),
		targets:    targets,
		results:    results,
		events:     events,
		settings:   settings,
		notifier:   notifier,
		emitter:    emitter,
		logger:     logger,
	}
}

func (e *Engine) SetMaintenance(repo *repository.MaintenanceRepository) {
	e.maintenance = repo
}

func (e *Engine) SetIncidents(repo *repository.IncidentRepository) {
	e.incidents = repo
}

func (e *Engine) Check(ctx context.Context, targetID string) error {
	target, err := e.targets.Get(ctx, targetID)
	if err != nil {
		return err
	}
	if !target.Enabled {
		return nil
	}
	settings, err := e.settings.Get(ctx)
	if err != nil {
		return err
	}
	return e.checkTarget(ctx, target, settings)
}

func (e *Engine) TestPing(ctx context.Context, host string, timeoutSec, retries, retryDelaySec int) domain.PingTestResult {
	return e.TestProbe(ctx, domain.ProbeTestInput{
		ProbeType: string(domain.ProbeICMP),
		Host:      host,
		Timeout:   timeoutSec,
	})
}

func (e *Engine) TestProbe(ctx context.Context, in domain.ProbeTestInput) domain.PingTestResult {
	probe := domain.NormalizeProbeType(in.ProbeType)
	timeoutSec := in.Timeout
	if timeoutSec < 1 {
		timeoutSec = 5
	}
	timeout := time.Duration(timeoutSec) * time.Second
	target := domain.Target{
		Host:         domain.NormalizeHost(in.Host),
		ProbeType:    probe,
		HTTPURL:      strings.TrimSpace(in.HTTPURL),
		HTTPMethod:   domain.NormalizeHTTPMethod(in.HTTPMethod),
		ExpectStatus: in.ExpectStatus,
		TCPPort:      in.TCPPort,
		Timeout:      timeoutSec,
	}
	if probe == domain.ProbeHTTP && target.HTTPURL == "" {
		target.HTTPURL = in.Host
	}
	if probe == domain.ProbeHTTP {
		if url, host, err := domain.NormalizeHTTPURL(target.HTTPURL); err == nil {
			target.HTTPURL = url
			target.Host = host
		}
	}
	if target.ExpectStatus == 0 {
		target.ExpectStatus = 200
	}
	result := domain.PingTestResult{Host: target.EndpointLabel(), ProbeType: probe, Attempts: 1}
	rtt, err := e.probeOnce(ctx, target, timeout)
	if err == nil {
		ms := rtt.Milliseconds()
		result.Success = true
		result.LatencyMs = &ms
		result.Detail = fmt.Sprintf("%s OK in %dms", probe.Label(), ms)
		return result
	}
	result.Error = publicError(err)
	return result
}

func (e *Engine) checkTarget(ctx context.Context, target domain.Target, settings domain.Settings) error {
	now := time.Now().UTC()
	maint := domain.MaintenanceEffect{}
	if e.maintenance != nil {
		effect, err := e.maintenance.EffectFor(ctx, target, now)
		if err != nil {
			e.logger.Warn("maintenance lookup failed", "error", err, "targetId", target.ID)
		} else {
			maint = effect
		}
	}
	if maint.SuppressChecks {
		e.logger.Debug("check skipped, maintenance window", "targetId", target.ID)
		return nil
	}

	start := time.Now()
	success, latency, pingErr, timedOut := e.pingWithRetry(ctx, target)
	duration := time.Since(start).Milliseconds()
	target.LastCheckedAt = &now
	if success {
		target.LastLatency = latency
		target.LastSuccessAt = &now
	} else {
		target.LastFailureAt = &now
		if latency == nil {
			target.LastLatency = nil
		}
	}

	eval := Evaluate(target.LastStatus, target.ConsecutiveFailures, target.ConsecutiveSuccesses, settings.FailureThreshold, settings.RecoveryThreshold, success)
	prev := target.LastStatus
	target.LastStatus = eval.Status
	target.ConsecutiveFailures = eval.ConsecutiveFailures
	target.ConsecutiveSuccesses = eval.ConsecutiveSuccesses
	if !target.Enabled {
		target.LastStatus = domain.StatusDisabled
	}

	var errText *string
	if pingErr != nil {
		msg := publicError(pingErr)
		errText = &msg
	}
	res := domain.PingResult{
		TargetID:   target.ID,
		Timestamp:  now,
		Success:    success,
		LatencyMs:  latency,
		Error:      errText,
		DurationMs: duration,
	}
	if _, err := e.results.Insert(ctx, res); err != nil {
		e.logger.Error("store ping result", "error", err, "targetId", target.ID)
	}
	_ = e.results.Prune(ctx, target.ID, 2000)

	if _, err := e.targets.Update(ctx, target); err != nil {
		return fmt.Errorf("update target after ping: %w", err)
	}

	if e.emitter != nil {
		errStr := ""
		if errText != nil {
			errStr = *errText
		}
		e.emitter.Emit(domain.WailsTargetPingCompleted, domain.PingCompletedPayload{
			TargetID:  target.ID,
			Success:   success,
			LatencyMs: latency,
			Error:     errStr,
		})
		if prev != target.LastStatus {
			e.emitter.Emit(domain.WailsTargetStatusChanged, domain.StatusChangedPayload{
				TargetID: target.ID,
				Name:     target.Name,
				Host:     target.Host,
				Status:   target.LastStatus,
				Latency:  latency,
			})
		}
	}

	if eval.Transition == "offline" {
		e.handleOffline(ctx, target, settings, maint)
	} else if !success && target.LastStatus == domain.StatusOffline && e.incidents != nil {
		_ = e.incidents.TouchOpen(ctx, target.ID, target.ConsecutiveFailures)
	}
	if eval.Transition == "recovery" {
		e.handleRecovery(ctx, target, settings, latency, maint)
	}
	if success && latency != nil && settings.HighLatencyThresholdMs > 0 && *latency > int64(settings.HighLatencyThresholdMs) {
		e.handleHighLatency(ctx, target, settings, *latency, maint)
	}
	if timedOut && !success {
		e.handleTimeout(ctx, target, settings, pingErr, maint)
	}
	return nil
}

func (e *Engine) pingWithRetry(ctx context.Context, target domain.Target) (bool, *int64, error, bool) {
	timeout := time.Duration(target.Timeout) * time.Second
	var lastErr error
	timedOut := false
	for attempt := 0; attempt <= target.RetryCount; attempt++ {
		if attempt > 0 && target.RetryDelay > 0 {
			select {
			case <-ctx.Done():
				return false, nil, ctx.Err(), false
			case <-time.After(time.Duration(target.RetryDelay) * time.Second):
			}
		}
		rtt, err := e.probeOnce(ctx, target, timeout)
		if err == nil {
			ms := rtt.Milliseconds()
			return true, &ms, nil, false
		}
		lastErr = err
		if isTimeout(err) {
			timedOut = true
		}
	}
	return false, nil, lastErr, timedOut
}

func (e *Engine) probeOnce(ctx context.Context, target domain.Target, timeout time.Duration) (time.Duration, error) {
	switch domain.NormalizeProbeType(string(target.ProbeType)) {
	case domain.ProbeHTTP:
		return e.httpProber.Probe(ctx, target, timeout)
	case domain.ProbeTCP:
		return e.tcpProber.Probe(ctx, target, timeout)
	default:
		return e.pinger.Ping(ctx, target.Host, timeout)
	}
}

func (e *Engine) handleOffline(ctx context.Context, target domain.Target, settings domain.Settings, maint domain.MaintenanceEffect) {
	endpoint := target.EndpointLabel()
	msg := fmt.Sprintf("%s (%s) is OFFLINE after %d consecutive failed checks [%s]", target.Name, endpoint, target.ConsecutiveFailures, target.ProbeType.Label())
	e.storeEvent(ctx, target, domain.EventTargetOffline, msg, map[string]any{"failures": target.ConsecutiveFailures, "probe": target.ProbeType})
	if e.incidents != nil {
		inc, err := e.incidents.Open(ctx, target, msg, target.ConsecutiveFailures)
		if err != nil {
			e.logger.Warn("open incident", "error", err, "targetId", target.ID)
		} else if e.emitter != nil {
			e.emitter.Emit(domain.WailsIncidentUpdated, inc)
		}
	}
	if !settings.NotifyOnOffline || maint.SuppressNotifications {
		return
	}
	lastSuccess := "never"
	if target.LastSuccessAt != nil {
		lastSuccess = target.LastSuccessAt.Local().Format("15:04:05")
	}
	e.notify(ctx, target, domain.Notification{
		Kind:        domain.KindAlert,
		Title:       "PingPulse",
		Body:        fmt.Sprintf("%s is OFFLINE", target.Name),
		TargetID:    target.ID,
		TargetName:  target.Name,
		Host:        endpoint,
		Status:      "OFFLINE",
		Failures:    target.ConsecutiveFailures,
		LastSuccess: lastSuccess,
		OccurredAt:  time.Now().Format("15:04:05"),
	})
}

func (e *Engine) handleRecovery(ctx context.Context, target domain.Target, settings domain.Settings, latency *int64, maint domain.MaintenanceEffect) {
	endpoint := target.EndpointLabel()
	lat := "n/a"
	if latency != nil {
		lat = fmt.Sprintf("%dms", *latency)
	}
	msg := fmt.Sprintf("%s (%s) is back ONLINE (%s) [%s]", target.Name, endpoint, lat, target.ProbeType.Label())
	e.storeEvent(ctx, target, domain.EventTargetRecovery, msg, map[string]any{"latency": lat, "probe": target.ProbeType})
	if e.incidents != nil {
		inc, err := e.incidents.Resolve(ctx, target.ID, msg)
		if err == nil && e.emitter != nil {
			e.emitter.Emit(domain.WailsIncidentUpdated, inc)
		}
	}
	if !settings.NotifyOnRecovery || maint.SuppressNotifications {
		return
	}
	e.notify(ctx, target, domain.Notification{
		Kind:       domain.KindRecovery,
		Title:      "PingPulse",
		Body:       fmt.Sprintf("%s is back ONLINE", target.Name),
		TargetID:   target.ID,
		TargetName: target.Name,
		Host:       endpoint,
		Status:     "ONLINE",
		LatencyMs:  latency,
		OccurredAt: time.Now().Format("15:04:05"),
	})
}

func (e *Engine) handleHighLatency(ctx context.Context, target domain.Target, settings domain.Settings, latency int64, maint domain.MaintenanceEffect) {
	endpoint := target.EndpointLabel()
	msg := fmt.Sprintf("%s (%s) high latency: %dms (threshold %dms)", target.Name, endpoint, latency, settings.HighLatencyThresholdMs)
	e.storeEvent(ctx, target, domain.EventHighLatency, msg, map[string]any{"latency": latency})
	if !settings.NotifyOnHighLatency || maint.SuppressNotifications {
		return
	}
	ms := latency
	e.notify(ctx, target, domain.Notification{
		Kind:       domain.KindLatency,
		Title:      "PingPulse",
		Body:       fmt.Sprintf("%s latency is %dms", target.Name, latency),
		TargetID:   target.ID,
		TargetName: target.Name,
		Host:       endpoint,
		Status:     "HIGH LATENCY",
		LatencyMs:  &ms,
		OccurredAt: time.Now().Format("15:04:05"),
	})
}

func (e *Engine) handleTimeout(ctx context.Context, target domain.Target, settings domain.Settings, pingErr error, maint domain.MaintenanceEffect) {
	msg := publicError(pingErr)
	if msg == "" {
		msg = fmt.Sprintf("Unable to reach %s: timeout after %d seconds", target.EndpointLabel(), target.Timeout)
	}
	e.storeEvent(ctx, target, domain.EventPingTimeout, msg, nil)
	if !settings.NotifyOnTimeout || maint.SuppressNotifications {
		return
	}
	e.notify(ctx, target, domain.Notification{
		Kind:       domain.KindTimeout,
		Title:      "PingPulse",
		Body:       fmt.Sprintf("%s probe timed out", target.Name),
		TargetID:   target.ID,
		TargetName: target.Name,
		Host:       target.EndpointLabel(),
		Status:     "TIMEOUT",
		OccurredAt: time.Now().Format("15:04:05"),
	})
}

func (e *Engine) notify(ctx context.Context, target domain.Target, n domain.Notification) {
	if domain.IsMuted(target.MutedUntil) {
		e.logger.Debug("notification skipped, target muted", "targetId", target.ID, "kind", n.Kind)
		return
	}
	_ = e.notifier.Notify(ctx, n)
}

func (e *Engine) storeEvent(ctx context.Context, target domain.Target, typ domain.EventType, message string, meta map[string]any) {
	raw := ""
	if meta != nil {
		b, _ := json.Marshal(meta)
		raw = string(b)
	}
	ev, err := e.events.Insert(ctx, domain.Event{
		TargetID: target.ID,
		Type:     typ,
		Message:  message,
		Metadata: raw,
	})
	if err != nil {
		e.logger.Error("store event", "error", err, "type", typ)
		return
	}
	if e.emitter != nil {
		e.emitter.Emit(domain.WailsEventCreated, ev)
	}
}

func publicError(err error) string {
	if err == nil {
		return ""
	}
	if pe, ok := err.(*domain.PingError); ok {
		return pe.Error()
	}
	msg := err.Error()
	lower := strings.ToLower(msg)
	if strings.Contains(lower, "api_key") || strings.Contains(lower, "token") || strings.Contains(lower, "authorization") {
		return "The request failed. Check notification settings."
	}
	if len(msg) > 240 {
		msg = msg[:240]
	}
	return msg
}

func isTimeout(err error) bool {
	if err == nil {
		return false
	}
	if pe, ok := err.(*domain.PingError); ok {
		return pe.Timeout != ""
	}
	return strings.Contains(strings.ToLower(err.Error()), "timeout")
}
