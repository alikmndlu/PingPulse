import { EventsEmit } from "../../runtime/runtime";
import type {
  AvailabilityPoint,
  CreateMaintenanceInput,
  CreateTargetInput,
  DashboardStats,
  EventItem,
  HistoryFilter,
  HistoryPage,
  ImportResult,
  Incident,
  IncidentFilter,
  IncidentPage,
  IncidentReport,
  LatencyPoint,
  MaintenanceWindow,
  MonitoringStatus,
  NotificationConfig,
  PingResult,
  PingTestResult,
  ProbeTestInput,
  Settings,
  SlaReport,
  SlaTargetCompliance,
  SslInfo,
  Target,
  TargetDetails,
  TargetGroup,
  UpdateInfo,
  UpdateMaintenanceInput,
  UpdateTargetInput,
} from "@/types";

const STORAGE_KEY = "pingpulse_state_v2";

interface AppState {
  targets: Target[];
  groups: TargetGroup[];
  maintenance: MaintenanceWindow[];
  incidents: Incident[];
  history: PingResult[];
  events: EventItem[];
  settings: Settings;
  notifications: Record<string, NotificationConfig>;
  monitoring: {
    running: boolean;
    paused: boolean;
    startedAt: string | null;
  };
}

function generateSslInfo(host: string, daysAhead = 64): SslInfo {
  const now = new Date();
  const validFrom = new Date(now.getTime() - 120 * 86400000).toISOString();
  const validTo = new Date(now.getTime() + daysAhead * 86400000).toISOString();
  return {
    enabled: true,
    valid: daysAhead > 0,
    validFrom,
    validTo,
    daysRemaining: daysAhead,
    issuer: "Let's Encrypt Authority X3 (R3)",
    subject: `CN=${host}`,
    serialNumber: Math.random().toString(16).substring(2, 14).toUpperCase(),
    tlsVersion: "TLSv1.3",
    alertThresholdDays: 14,
  };
}

function getInitialState(): AppState {
  const now = new Date();
  const subMinutes = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
  const addHours = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

  const groups: TargetGroup[] = [
    {
      id: "grp-1",
      name: "Production API & Gateways",
      color: "#10b981",
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(1440),
    },
    {
      id: "grp-2",
      name: "Core Infrastructure & DNS",
      color: "#3b82f6",
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(1440),
    },
    {
      id: "grp-3",
      name: "Databases & Caches",
      color: "#8b5cf6",
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(1440),
    },
  ];

  const targets: Target[] = [
    {
      id: "tgt-1",
      name: "GitHub REST API",
      host: "api.github.com",
      enabled: true,
      interval: 10,
      timeout: 5,
      retryCount: 2,
      retryDelay: 1,
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(10),
      lastStatus: "online",
      lastLatency: 38,
      lastCheckedAt: subMinutes(1),
      lastSuccessAt: subMinutes(1),
      lastFailureAt: subMinutes(180),
      consecutiveFailures: 0,
      consecutiveSuccesses: 184,
      groupId: "grp-1",
      groupName: "Production API & Gateways",
      groupColor: "#10b981",
      probeType: "http",
      httpUrl: "https://api.github.com",
      httpMethod: "GET",
      expectStatus: 200,
      ssl: generateSslInfo("api.github.com", 78),
      assertions: {
        matchBody: "current_user_url",
        maxLatencyMs: 400,
      },
      jitterMs: 3.2,
      isAnomaly: false,
    },
    {
      id: "tgt-2",
      name: "Cloudflare Edge DNS",
      host: "1.1.1.1",
      enabled: true,
      interval: 5,
      timeout: 2,
      retryCount: 1,
      retryDelay: 1,
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(5),
      lastStatus: "online",
      lastLatency: 14,
      lastCheckedAt: subMinutes(1),
      lastSuccessAt: subMinutes(1),
      lastFailureAt: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 420,
      groupId: "grp-2",
      groupName: "Core Infrastructure & DNS",
      groupColor: "#3b82f6",
      probeType: "icmp",
      jitterMs: 1.4,
      isAnomaly: false,
    },
    {
      id: "tgt-3",
      name: "Google Primary DNS",
      host: "8.8.8.8",
      enabled: true,
      interval: 10,
      timeout: 2,
      retryCount: 1,
      retryDelay: 1,
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(5),
      lastStatus: "online",
      lastLatency: 18,
      lastCheckedAt: subMinutes(1),
      lastSuccessAt: subMinutes(1),
      lastFailureAt: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 310,
      groupId: "grp-2",
      groupName: "Core Infrastructure & DNS",
      groupColor: "#3b82f6",
      probeType: "icmp",
      jitterMs: 2.1,
      isAnomaly: false,
    },
    {
      id: "tgt-4",
      name: "Primary PostgreSQL Replica",
      host: "db.production.internal",
      enabled: true,
      interval: 15,
      timeout: 3,
      retryCount: 2,
      retryDelay: 1,
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(15),
      lastStatus: "online",
      lastLatency: 6,
      lastCheckedAt: subMinutes(2),
      lastSuccessAt: subMinutes(2),
      lastFailureAt: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 290,
      groupId: "grp-3",
      groupName: "Databases & Caches",
      groupColor: "#8b5cf6",
      probeType: "tcp",
      tcpPort: 5432,
      jitterMs: 0.8,
      isAnomaly: false,
    },
    {
      id: "tgt-5",
      name: "Stripe Payment Gateway",
      host: "api.stripe.com",
      enabled: true,
      interval: 20,
      timeout: 5,
      retryCount: 2,
      retryDelay: 1,
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(20),
      lastStatus: "online",
      lastLatency: 52,
      lastCheckedAt: subMinutes(1),
      lastSuccessAt: subMinutes(1),
      lastFailureAt: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 150,
      groupId: "grp-1",
      groupName: "Production API & Gateways",
      groupColor: "#10b981",
      probeType: "http",
      httpUrl: "https://api.stripe.com/healthcheck",
      httpMethod: "GET",
      expectStatus: 200,
      ssl: generateSslInfo("api.stripe.com", 9), // Expiring soon demonstration!
      assertions: {
        matchJsonPath: "status",
        matchJsonValue: "ok",
        maxLatencyMs: 350,
      },
      jitterMs: 5.4,
      isAnomaly: false,
    },
    {
      id: "tgt-6",
      name: "Redis Cache Cluster",
      host: "cache.internal.net",
      enabled: true,
      interval: 10,
      timeout: 2,
      retryCount: 2,
      retryDelay: 1,
      createdAt: subMinutes(1440),
      updatedAt: subMinutes(10),
      lastStatus: "online",
      lastLatency: 3,
      lastCheckedAt: subMinutes(1),
      lastSuccessAt: subMinutes(1),
      lastFailureAt: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 490,
      groupId: "grp-3",
      groupName: "Databases & Caches",
      groupColor: "#8b5cf6",
      probeType: "tcp",
      tcpPort: 6379,
      jitterMs: 0.4,
      isAnomaly: false,
    },
  ];

  const maintenance: MaintenanceWindow[] = [
    {
      id: "maint-1",
      name: "Redis Cache Cluster Engine Upgrade",
      targetId: "tgt-6",
      groupId: "grp-3",
      startsAt: addHours(12),
      endsAt: addHours(14),
      reason: "Kernel patch and memory optimization",
      suppressChecks: false,
      suppressNotifications: true,
      enabled: true,
      createdAt: subMinutes(300),
      updatedAt: subMinutes(300),
      targetName: "Redis Cache Cluster",
      groupName: "Databases & Caches",
      active: false,
    },
  ];

  const incidents: Incident[] = [
    {
      id: "inc-1",
      targetId: "tgt-1",
      targetName: "GitHub REST API",
      host: "api.github.com",
      probeType: "http",
      status: "resolved",
      startedAt: subMinutes(240),
      endedAt: subMinutes(235),
      durationSeconds: 300,
      failureCount: 4,
      summary: "HTTP 503 Service Unavailable upstream gateway timeout",
      rootCause: "Upstream rate limit spike on GitHub Edge POP",
      createdAt: subMinutes(240),
      updatedAt: subMinutes(235),
    },
  ];

  const history: PingResult[] = [];
  for (let i = 0; i < 60; i++) {
    const t = targets[i % targets.length];
    if (t.enabled) {
      const lat = Math.floor(Math.random() * 20) + (t.lastLatency || 20);
      history.push({
        id: `ping-${i}`,
        targetId: t.id,
        timestamp: subMinutes(i * 2 + 1),
        success: true,
        latencyMs: lat,
        error: null,
        durationMs: lat + 2,
        assertionPassed: true,
        sslValid: true,
      });
    }
  }

  const events: EventItem[] = [
    {
      id: "evt-1",
      targetId: "tgt-5",
      type: "ssl_warning",
      message: "SSL Certificate for api.stripe.com will expire in 9 days (Renewal Recommended)",
      createdAt: subMinutes(60),
      metadata: '{"daysRemaining":9,"host":"api.stripe.com"}',
    },
    {
      id: "evt-2",
      targetId: "tgt-1",
      type: "status_change",
      message: "Target transitioned from degraded to online (38ms)",
      createdAt: subMinutes(235),
      metadata: '{"status":"online","latency":38}',
    },
    {
      id: "evt-3",
      targetId: "tgt-1",
      type: "incident_resolved",
      message: "Incident inc-1 marked resolved after 5 consecutive successful checks",
      createdAt: subMinutes(235),
      metadata: '{"incidentId":"inc-1"}',
    },
  ];

  const settings: Settings = {
    startOnBoot: false,
    minimizeToTray: false,
    startMonitoringAutomatically: true,
    defaultInterval: 10,
    defaultTimeout: 5,
    defaultRetry: 2,
    defaultRetryDelay: 1,
    failureThreshold: 3,
    recoveryThreshold: 2,
    smsEnabled: false,
    desktopNotificationEnabled: true,
    webhookEnabled: true,
    telegramEnabled: false,
    discordEnabled: true,
    slackEnabled: true,
    teamsEnabled: false,
    pagerDutyEnabled: false,
    notificationCooldownSeconds: 300,
    highLatencyThresholdMs: 250,
    notifyOnOffline: true,
    notifyOnRecovery: true,
    notifyOnHighLatency: true,
    notifyOnTimeout: true,
    notifyOnSslExpiry: true,
    notifyOnAnomaly: true,
    theme: "dark",
    logLevel: "info",
    mutedUntil: "",
    retentionDays: 30,
    autoPruneHistory: true,
    flappingDetection: true,
    flappingThreshold: 4,
    anomalyDetectionSensitivity: "medium",
    statusPagePublic: true,
    statusPageTitle: "PingPulse Infrastructure Status",
    statusPageMessage: "All systems are tracked live with high-precision ICMP, HTTP & TCP probers.",
  };

  const notifications: Record<string, NotificationConfig> = {
    webhook: {
      id: "notif-webhook",
      provider: "webhook",
      enabled: true,
      apiUrl: "https://api.example.com/webhooks/alerts",
      apiKey: "",
      apiKeySet: false,
      sender: "PingPulse",
      recipient: "Ops Webhook",
      httpMethod: "POST",
      customHeaders: { "Content-Type": "application/json" },
      bodyTemplate: '{\n  "event": "alert",\n  "target": "{{target.name}}",\n  "status": "{{target.status}}",\n  "latency": {{target.latency}},\n  "timestamp": "{{timestamp}}"\n}',
    },
    discord: {
      id: "notif-discord",
      provider: "discord",
      enabled: true,
      apiUrl: "https://discord.com/api/webhooks/example/token",
      apiKey: "",
      apiKeySet: false,
      sender: "PingPulse Bot",
      recipient: "#alerts",
      httpMethod: "POST",
      customHeaders: { "Content-Type": "application/json" },
      bodyTemplate: '{\n  "username": "PingPulse",\n  "embeds": [{\n    "title": "🚨 [Alert] {{target.name}} is {{target.status}}",\n    "color": 15158332,\n    "fields": [\n      {"name": "Host", "value": "{{target.host}}", "inline": true},\n      {"name": "Latency", "value": "{{target.latency}}ms", "inline": true}\n    ]\n  }]\n}',
    },
    slack: {
      id: "notif-slack",
      provider: "slack",
      enabled: true,
      apiUrl: "https://hooks.slack.com/services/T00/B00/XXXX",
      apiKey: "",
      apiKeySet: false,
      sender: "PingPulse Bot",
      recipient: "#devops-oncall",
      httpMethod: "POST",
      customHeaders: { "Content-Type": "application/json" },
      bodyTemplate: '{\n  "blocks": [\n    {\n      "type": "section",\n      "text": {\n        "type": "mrkdwn",\n        "text": "*[PingPulse Alert]* \\n:warning: `{{target.name}}` transitioned to *{{target.status}}* (Latency: {{target.latency}}ms)"\n      }\n    }\n  ]\n}',
    },
    teams: {
      id: "notif-teams",
      provider: "teams",
      enabled: false,
      apiUrl: "https://outlook.office.com/webhook/example",
      apiKey: "",
      apiKeySet: false,
      sender: "PingPulse Connector",
      recipient: "DevOps Channel",
      httpMethod: "POST",
      customHeaders: { "Content-Type": "application/json" },
      bodyTemplate: '{\n  "@type": "MessageCard",\n  "themeColor": "E81123",\n  "title": "PingPulse Service Alert",\n  "text": "Target {{target.name}} status changed to {{target.status}}"\n}',
    },
    pagerduty: {
      id: "notif-pagerduty",
      provider: "pagerduty",
      enabled: false,
      apiUrl: "https://events.pagerduty.com/v2/enqueue",
      apiKey: "",
      apiKeySet: false,
      sender: "PingPulse Event API",
      recipient: "PAGERDUTY-SERVICE-KEY",
      httpMethod: "POST",
      customHeaders: { "Content-Type": "application/json" },
      bodyTemplate: '{\n  "routing_key": "{{apiKey}}",\n  "event_action": "trigger",\n  "payload": {\n    "summary": "PingPulse: {{target.name}} is {{target.status}}",\n    "severity": "critical",\n    "source": "{{target.host}}"\n  }\n}',
    },
    telegram: {
      id: "notif-telegram",
      provider: "telegram",
      enabled: false,
      apiUrl: "https://api.telegram.org/bot",
      apiKey: "",
      apiKeySet: false,
      sender: "PingPulseBot",
      recipient: "@devops_channel",
      httpMethod: "POST",
      customHeaders: {},
      bodyTemplate: "🚨 *PingPulse Alert*\nTarget: `{{target.name}}`\nStatus: *{{target.status}}*\nLatency: `{{target.latency}}ms`",
    },
    desktop: {
      id: "notif-desktop",
      provider: "desktop",
      enabled: true,
      apiUrl: "",
      apiKey: "",
      apiKeySet: false,
      sender: "PingPulse",
      recipient: "System Notification",
      httpMethod: "",
      customHeaders: {},
      bodyTemplate: "{{target.name}} is {{target.status}} ({{target.latency}}ms)",
    },
    sms: {
      id: "notif-sms",
      provider: "sms",
      enabled: false,
      apiUrl: "https://api.melipayamak.com/v1/sms/send",
      apiKey: "",
      apiKeySet: false,
      sender: "50004000",
      recipient: "+989123456789",
      httpMethod: "POST",
      customHeaders: {},
      bodyTemplate: "PingPulse: {{target.name}} is {{target.status}}",
    },
  };

  return {
    targets,
    groups,
    maintenance,
    incidents,
    history,
    events,
    settings,
    notifications,
    monitoring: {
      running: true,
      paused: false,
      startedAt: subMinutes(120),
    },
  };
}

let state: AppState = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.targets && parsed.settings) {
        return parsed;
      }
    }
  } catch {}
  return getInitialState();
})();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// Background simulation ticker for live pinging, jitter calculation & anomaly detection
let monitorInterval: ReturnType<typeof setInterval> | null = null;

function startSimulation() {
  if (monitorInterval) return;
  monitorInterval = setInterval(() => {
    if (!state.monitoring.running || state.monitoring.paused) return;

    const enabledTargets = state.targets.filter((t) => t.enabled);
    if (enabledTargets.length === 0) return;

    const target = enabledTargets[Math.floor(Math.random() * enabledTargets.length)];
    const nowIso = new Date().toISOString();
    const baseLatency = target.probeType === "http" ? 40 : target.probeType === "tcp" ? 6 : 18;

    // Simulate potential rare anomaly spike (5% chance)
    const isSpike = Math.random() < 0.05;
    const latencyJitter = isSpike
      ? Math.round(baseLatency * 3.5 + Math.random() * 40)
      : Math.max(1, Math.round(baseLatency + (Math.random() * 14 - 7)));

    const prevLatency = target.lastLatency || baseLatency;
    const currentJitter = Math.round(Math.abs(latencyJitter - prevLatency) * 10) / 10;

    target.lastCheckedAt = nowIso;
    target.lastLatency = latencyJitter;
    target.lastSuccessAt = nowIso;
    target.jitterMs = currentJitter;
    target.isAnomaly = isSpike;
    target.consecutiveSuccesses = (target.consecutiveSuccesses || 0) + 1;

    // Check SLA latency assertion if set
    let assertionPassed = true;
    let assertionError = "";
    if (target.assertions?.maxLatencyMs && latencyJitter > target.assertions.maxLatencyMs) {
      assertionPassed = false;
      assertionError = `Latency ${latencyJitter}ms exceeded max threshold of ${target.assertions.maxLatencyMs}ms`;
      target.lastStatus = "degraded";
    } else {
      target.lastStatus = "online";
    }

    const pingResult: PingResult = {
      id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetId: target.id,
      timestamp: nowIso,
      success: true,
      latencyMs: latencyJitter,
      error: assertionError || null,
      durationMs: latencyJitter + 2,
      assertionPassed,
      assertionError: assertionError || undefined,
      sslValid: target.ssl ? target.ssl.valid : undefined,
    };

    state.history.unshift(pingResult);

    // Auto-prune if enabled and length exceeds 500 entries
    if (state.settings.autoPruneHistory && state.history.length > 500) {
      state.history = state.history.slice(0, 400);
    }

    if (isSpike && state.settings.notifyOnAnomaly) {
      state.events.unshift({
        id: `evt-${Date.now()}`,
        targetId: target.id,
        type: "anomaly_detected",
        message: `High latency anomaly detected on "${target.name}": ${latencyJitter}ms (avg: ${baseLatency}ms, jitter: ${currentJitter}ms)`,
        createdAt: nowIso,
        metadata: JSON.stringify({ latency: latencyJitter, jitter: currentJitter }),
      });
      EventsEmit("event:created", { targetId: target.id });
    }

    saveState();
    EventsEmit("target:ping_completed", { targetId: target.id, result: pingResult });
  }, 3500);
}

startSimulation();

// Public App Methods
export async function GetTargets(): Promise<Target[]> {
  return [...state.targets];
}

export async function GetTarget(id: string): Promise<Target> {
  const t = state.targets.find((item) => item.id === id);
  if (!t) throw new Error("Target not found");
  return { ...t };
}

export async function CreateTarget(input: CreateTargetInput): Promise<Target> {
  const now = new Date().toISOString();
  const group = state.groups.find((g) => g.id === input.groupId);
  const probe = (input.probeType as Target["probeType"]) || "icmp";
  const host = input.host || (input.httpUrl ? new URL(input.httpUrl).hostname : "localhost");

  const ssl: SslInfo | undefined =
    input.sslEnabled || probe === "http" || host.includes(".com") || host.includes(".org") || host.includes(".net")
      ? generateSslInfo(host, Math.floor(Math.random() * 80) + 20)
      : undefined;

  const newTarget: Target = {
    id: `tgt-${Date.now()}`,
    name: input.name,
    host,
    enabled: input.enabled !== undefined ? input.enabled : true,
    interval: input.interval || state.settings.defaultInterval || 10,
    timeout: input.timeout || state.settings.defaultTimeout || 5,
    retryCount: input.retryCount || state.settings.defaultRetry || 2,
    retryDelay: input.retryDelay || state.settings.defaultRetryDelay || 1,
    createdAt: now,
    updatedAt: now,
    lastStatus: input.enabled === false ? "disabled" : "online",
    lastLatency: Math.floor(Math.random() * 20) + 15,
    lastCheckedAt: now,
    lastSuccessAt: now,
    lastFailureAt: null,
    consecutiveFailures: 0,
    consecutiveSuccesses: 1,
    groupId: input.groupId,
    groupName: group?.name,
    groupColor: group?.color,
    probeType: probe,
    httpUrl: input.httpUrl,
    httpMethod: input.httpMethod,
    expectStatus: input.expectStatus,
    tcpPort: input.tcpPort,
    ssl,
    assertions: {
      matchBody: input.matchBody,
      matchJsonPath: input.matchJsonPath,
      matchJsonValue: input.matchJsonValue,
      maxLatencyMs: input.maxLatencyMs,
      customHeaders: input.customHeaders,
    },
    jitterMs: 1.2,
    isAnomaly: false,
  };

  state.targets.push(newTarget);
  state.events.unshift({
    id: `evt-${Date.now()}`,
    targetId: newTarget.id,
    type: "target_created",
    message: `Target "${newTarget.name}" (${newTarget.probeType?.toUpperCase()}) created with SSL & Assertion monitoring`,
    createdAt: now,
    metadata: JSON.stringify(newTarget),
  });

  saveState();
  EventsEmit("target:status_changed", newTarget);
  EventsEmit("event:created", { targetId: newTarget.id });
  return newTarget;
}

export async function UpdateTarget(id: string, input: UpdateTargetInput): Promise<Target> {
  const index = state.targets.findIndex((t) => t.id === id);
  if (index === -1) throw new Error("Target not found");

  const existing = state.targets[index];
  const now = new Date().toISOString();
  const group = input.groupId !== undefined ? state.groups.find((g) => g.id === input.groupId) : undefined;

  const ssl: SslInfo | undefined =
    input.sslEnabled !== undefined
      ? input.sslEnabled
        ? existing.ssl || generateSslInfo(input.host || existing.host, 75)
        : undefined
      : existing.ssl;

  const updated: Target = {
    ...existing,
    ...input,
    groupName: group ? group.name : input.groupId === "" ? undefined : existing.groupName,
    groupColor: group ? group.color : input.groupId === "" ? undefined : existing.groupColor,
    probeType: (input.probeType as Target["probeType"]) || existing.probeType,
    ssl,
    assertions: {
      matchBody: input.matchBody !== undefined ? input.matchBody : existing.assertions?.matchBody,
      matchJsonPath: input.matchJsonPath !== undefined ? input.matchJsonPath : existing.assertions?.matchJsonPath,
      matchJsonValue: input.matchJsonValue !== undefined ? input.matchJsonValue : existing.assertions?.matchJsonValue,
      maxLatencyMs: input.maxLatencyMs !== undefined ? input.maxLatencyMs : existing.assertions?.maxLatencyMs,
      customHeaders: input.customHeaders !== undefined ? input.customHeaders : existing.assertions?.customHeaders,
    },
    updatedAt: now,
  };

  if (input.enabled !== undefined && !input.enabled) {
    updated.lastStatus = "disabled";
  } else if (input.enabled && updated.lastStatus === "disabled") {
    updated.lastStatus = "online";
  }

  state.targets[index] = updated;
  saveState();
  EventsEmit("target:status_changed", updated);
  return updated;
}

export async function DeleteTarget(id: string): Promise<void> {
  state.targets = state.targets.filter((t) => t.id !== id);
  state.history = state.history.filter((h) => h.targetId !== id);
  state.events = state.events.filter((e) => e.targetId !== id);
  saveState();
  EventsEmit("target:status_changed", { id, deleted: true });
}

export async function SetTargetEnabled(id: string, enabled: boolean): Promise<Target> {
  return UpdateTarget(id, { enabled });
}

export async function MuteTarget(id: string, seconds: number): Promise<Target> {
  const mutedUntil = seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : "";
  const index = state.targets.findIndex((t) => t.id === id);
  if (index === -1) throw new Error("Target not found");
  state.targets[index].mutedUntil = mutedUntil;
  saveState();
  EventsEmit("mute:changed", mutedUntil);
  return state.targets[index];
}

export async function TestPing(host: string, timeout = 5): Promise<PingTestResult> {
  await new Promise((r) => setTimeout(r, 350));
  const latency = Math.floor(Math.random() * 20) + 12;
  return {
    host,
    probeType: "icmp",
    success: true,
    latencyMs: latency,
    error: "",
    attempts: 1,
    detail: `Echo reply from ${host}: bytes=32 time=${latency}ms TTL=56`,
  };
}

export async function TestProbe(input: ProbeTestInput): Promise<PingTestResult> {
  await new Promise((r) => setTimeout(r, 450));
  const latency = Math.floor(Math.random() * 30) + 16;
  const probe = input.probeType || "icmp";
  const sslInfo =
    input.sslEnabled || probe === "http" ? generateSslInfo(input.host, Math.floor(Math.random() * 60) + 30) : undefined;

  let assertionPassed = true;
  let assertionDetail = "All configured assertions passed.";

  if (input.maxLatencyMs && latency > input.maxLatencyMs) {
    assertionPassed = false;
    assertionDetail = `Latency ${latency}ms exceeded max limit of ${input.maxLatencyMs}ms.`;
  }

  if (input.matchBody) {
    assertionDetail += ` Body matched pattern "${input.matchBody}".`;
  }
  if (input.matchJsonPath) {
    assertionDetail += ` JSON path "${input.matchJsonPath}" matched value "${input.matchJsonValue}".`;
  }

  return {
    host: input.host,
    probeType: probe as Target["probeType"],
    success: true,
    latencyMs: latency,
    error: "",
    attempts: 1,
    detail:
      probe === "http"
        ? `HTTP/1.1 ${input.expectStatus || 200} OK (${latency}ms) [TLS 1.3 Valid]`
        : probe === "tcp"
        ? `TCP Connected to port ${input.tcpPort || 80} (${latency}ms)`
        : `ICMP Echo Reply from ${input.host} (${latency}ms)`,
    sslInfo,
    assertionPassed,
    assertionDetail,
  };
}

export async function GetTargetHistory(filter: HistoryFilter): Promise<HistoryPage> {
  let items = [...state.history];
  if (filter.targetId) {
    items = items.filter((h) => h.targetId === filter.targetId);
  }
  if (filter.status === "success" || filter.status === "online") {
    items = items.filter((h) => h.success);
  } else if (filter.status === "failed" || filter.status === "offline") {
    items = items.filter((h) => !h.success);
  }
  if (filter.search) {
    const s = filter.search.toLowerCase();
    items = items.filter((h) => h.id.includes(s) || (h.error && h.error.toLowerCase().includes(s)));
  }

  const total = items.length;
  const offset = filter.offset || 0;
  const limit = filter.limit || 50;
  const paged = items.slice(offset, offset + limit);

  return {
    items: paged,
    total,
    limit,
    offset,
  };
}

export async function PruneHistory(daysToKeep = 30): Promise<{ deletedCount: number; remainingCount: number }> {
  const cutoff = new Date(Date.now() - daysToKeep * 86400000).toISOString();
  const initial = state.history.length;
  state.history = state.history.filter((h) => h.timestamp >= cutoff);
  const deletedCount = initial - state.history.length;
  saveState();
  return { deletedCount, remainingCount: state.history.length };
}

export async function GetDashboardStats(): Promise<DashboardStats> {
  const targets = state.targets;
  const online = targets.filter((t) => t.enabled && t.lastStatus === "online").length;
  const degraded = targets.filter((t) => t.enabled && t.lastStatus === "degraded").length;
  const offline = targets.filter((t) => t.enabled && t.lastStatus === "offline").length;
  const unknown = targets.filter((t) => t.enabled && t.lastStatus === "unknown").length;
  const disabled = targets.filter((t) => !t.enabled || t.lastStatus === "disabled").length;
  const openIncidents = state.incidents.filter((i) => i.status === "open").length;
  const activeMaintenance = state.maintenance.filter((m) => m.enabled && m.active).length;

  const sslExpiringCount = targets.filter(
    (t) => t.ssl && t.ssl.daysRemaining !== undefined && t.ssl.daysRemaining <= 14,
  ).length;

  const anomaliesCount = targets.filter((t) => t.isAnomaly).length;

  const totalChecks = targets.reduce(
    (sum, t) => sum + (t.consecutiveSuccesses || 0) + (t.consecutiveFailures || 0),
    0,
  );
  const totalSuccess = targets.reduce((sum, t) => sum + (t.consecutiveSuccesses || 0), 0);
  const uptimePercent = totalChecks > 0 ? Math.round((totalSuccess / totalChecks) * 1000) / 10 : 99.95;

  return {
    totalTargets: targets.length,
    online,
    degraded,
    offline,
    unknown,
    disabled,
    errorCount: offline + degraded + openIncidents,
    lastCheck: new Date().toISOString(),
    nextCheck: new Date(Date.now() + 4000).toISOString(),
    monitoring: state.monitoring.running,
    paused: state.monitoring.paused,
    uptimePercent,
    mutedUntil: state.settings.mutedUntil,
    openIncidents,
    activeMaintenance,
    sslExpiringCount,
    anomaliesCount,
  };
}

export async function GetTargetDetails(id: string): Promise<TargetDetails> {
  const target = state.targets.find((t) => t.id === id);
  if (!target) throw new Error("Target not found");

  const recentResults = state.history.filter((h) => h.targetId === id).slice(0, 40);
  const recentEvents = state.events.filter((e) => e.targetId === id).slice(0, 15);

  const latencies = recentResults.map((r) => r.latencyMs).filter((l): l is number => typeof l === "number");
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : target.lastLatency || 20;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : (target.lastLatency || 20) + 15;
  const averageLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : target.lastLatency || 25;

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95Latency = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] || maxLatency : maxLatency;
  const p99Latency = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] || maxLatency : maxLatency;

  const totalChecks = (target.consecutiveSuccesses || 0) + (target.consecutiveFailures || 0) || 50;
  const successful = target.consecutiveSuccesses || 50;
  const failed = target.consecutiveFailures || 0;
  const uptimePercent = Math.round((successful / totalChecks) * 1000) / 10;

  // Generate 24h latency and availability series
  const now = Date.now();
  const latencySeries: LatencyPoint[] = [];
  const availability: AvailabilityPoint[] = [];

  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600000).toISOString();
    const isSpikePoint = i === 4;
    const lat = isSpikePoint
      ? Math.round(averageLatency * 2.8)
      : Math.floor(Math.random() * (maxLatency - minLatency + 1)) + minLatency;

    latencySeries.push({
      timestamp,
      latency: lat,
      success: true,
      isAnomaly: isSpikePoint,
    });
    availability.push({
      timestamp,
      up: true,
    });
  }

  const openIncident = state.incidents.find((inc) => inc.targetId === id && inc.status === "open") || null;
  const maintWindow = state.maintenance.find((m) => m.targetId === id && m.enabled) || null;

  // AI Root Cause & Health Diagnosis Analysis
  const aiDiagnosis = `AI Health Analysis:
• Latency Stability: Excellent (Jitter: ${target.jitterMs || 1.2}ms, Mean: ${averageLatency}ms).
• SSL Certificate: ${target.ssl ? `${target.ssl.daysRemaining} days remaining (${target.ssl.issuer})` : "N/A"}.
• Anomaly Assessment: Target operating within normal 99th percentile (${p99Latency}ms). No packet fragmentation or TCP handshake degradation observed.`;

  return {
    target,
    metrics: {
      currentLatency: target.lastLatency || averageLatency,
      averageLatency,
      minLatency,
      maxLatency,
      jitterMs: target.jitterMs || 1.2,
      uptimePercent,
      totalChecks,
      successful,
      failed,
      p95Latency,
      p99Latency,
    },
    recentEvents,
    recentResults,
    latencySeries,
    availability,
    openIncident,
    inMaintenance: Boolean(maintWindow?.active),
    maintenanceWindow: maintWindow,
    aiDiagnosis,
  };
}

export async function GetSlaReport(period = "30d", targetSla = 99.9): Promise<SlaReport> {
  const now = new Date();
  const from = new Date(now.getTime() - (period === "7d" ? 7 : period === "90d" ? 90 : 30) * 86400000).toISOString();
  const to = now.toISOString();

  const totalPeriodSeconds = (period === "7d" ? 7 : period === "90d" ? 90 : 30) * 86400;
  const allowedDowntimeSec = Math.round(totalPeriodSeconds * ((100 - targetSla) / 100));

  const targetCompliances: SlaTargetCompliance[] = state.targets.map((t) => {
    const targetIncidents = state.incidents.filter((i) => i.targetId === t.id);
    const downtimeSec = targetIncidents.reduce((sum, inc) => sum + (inc.durationSeconds || 0), 0);
    const actualUptime = Math.max(90, Math.min(100, Math.round(((totalPeriodSeconds - downtimeSec) / totalPeriodSeconds) * 10000) / 100));
    const budgetRemaining = Math.max(0, Math.round(((allowedDowntimeSec - downtimeSec) / allowedDowntimeSec) * 100));

    let status: SlaTargetCompliance["status"] = "compliant";
    if (actualUptime < targetSla) {
      status = "breached";
    } else if (budgetRemaining < 25) {
      status = "warning";
    }

    return {
      targetId: t.id,
      targetName: t.name,
      groupName: t.groupName || "General",
      host: t.host,
      uptimePercent: actualUptime,
      targetSlaPercent: targetSla,
      allowedDowntimeSec,
      actualDowntimeSec: downtimeSec,
      errorBudgetRemainingPercent: budgetRemaining,
      status,
      mtbfHours: Math.round((totalPeriodSeconds / 3600) / (targetIncidents.length + 1)),
      mttrMinutes: targetIncidents.length > 0 ? Math.round((downtimeSec / targetIncidents.length) / 60) : 0,
      outageCount: targetIncidents.length,
    };
  });

  const compliantCount = targetCompliances.filter((c) => c.status === "compliant").length;
  const breachedCount = targetCompliances.filter((c) => c.status === "breached").length;
  const overallUptime = targetCompliances.length > 0
    ? Math.round((targetCompliances.reduce((a, b) => a + b.uptimePercent, 0) / targetCompliances.length) * 100) / 100
    : 99.95;

  return {
    period,
    from,
    to,
    overallUptime,
    slaTarget: targetSla,
    compliantCount,
    breachedCount,
    totalErrorBudgetHours: Math.round((allowedDowntimeSec * targetCompliances.length) / 3600),
    consumedErrorBudgetHours: Math.round(targetCompliances.reduce((sum, c) => sum + c.actualDowntimeSec, 0) / 3600),
    targets: targetCompliances,
  };
}

export async function GetSettings(): Promise<Settings> {
  return { ...state.settings };
}

export async function UpdateSettings(s: Settings): Promise<Settings> {
  state.settings = { ...state.settings, ...s };
  saveState();
  return { ...state.settings };
}

export async function MuteNotifications(seconds: number): Promise<Settings> {
  const mutedUntil = seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : "";
  state.settings.mutedUntil = mutedUntil;
  saveState();
  EventsEmit("mute:changed", mutedUntil);
  return { ...state.settings };
}

export async function ListGroups(): Promise<TargetGroup[]> {
  return [...state.groups];
}

export async function CreateGroup(name: string, color: string): Promise<TargetGroup> {
  const now = new Date().toISOString();
  const group: TargetGroup = {
    id: `grp-${Date.now()}`,
    name,
    color,
    createdAt: now,
    updatedAt: now,
  };
  state.groups.push(group);
  saveState();
  EventsEmit("groups:changed", state.groups);
  return group;
}

export async function UpdateGroup(id: string, name: string, color: string): Promise<TargetGroup> {
  const index = state.groups.findIndex((g) => g.id === id);
  if (index === -1) throw new Error("Group not found");
  const updated = {
    ...state.groups[index],
    name,
    color,
    updatedAt: new Date().toISOString(),
  };
  state.groups[index] = updated;

  state.targets.forEach((t) => {
    if (t.groupId === id) {
      t.groupName = name;
      t.groupColor = color;
    }
  });

  saveState();
  EventsEmit("groups:changed", state.groups);
  return updated;
}

export async function DeleteGroup(id: string): Promise<void> {
  state.groups = state.groups.filter((g) => g.id !== id);
  state.targets.forEach((t) => {
    if (t.groupId === id) {
      t.groupId = undefined;
      t.groupName = undefined;
      t.groupColor = undefined;
    }
  });
  saveState();
  EventsEmit("groups:changed", state.groups);
}

export async function ListMaintenanceWindows(): Promise<MaintenanceWindow[]> {
  return [...state.maintenance];
}

export async function CreateMaintenanceWindow(input: CreateMaintenanceInput): Promise<MaintenanceWindow> {
  const now = new Date().toISOString();
  const target = state.targets.find((t) => t.id === input.targetId);
  const group = state.groups.find((g) => g.id === input.groupId);

  const window: MaintenanceWindow = {
    id: `maint-${Date.now()}`,
    name: input.name,
    targetId: input.targetId || "",
    groupId: input.groupId || "",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    reason: input.reason || "",
    suppressChecks: input.suppressChecks ?? false,
    suppressNotifications: input.suppressNotifications ?? true,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
    targetName: target?.name,
    groupName: group?.name,
    active: false,
  };
  state.maintenance.push(window);
  saveState();
  EventsEmit("maintenance:changed", state.maintenance);
  return window;
}

export async function UpdateMaintenanceWindow(id: string, input: UpdateMaintenanceInput): Promise<MaintenanceWindow> {
  const index = state.maintenance.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Maintenance window not found");
  const target = input.targetId ? state.targets.find((t) => t.id === input.targetId) : undefined;
  const group = input.groupId ? state.groups.find((g) => g.id === input.groupId) : undefined;

  const updated: MaintenanceWindow = {
    ...state.maintenance[index],
    ...input,
    targetName: target ? target.name : state.maintenance[index].targetName,
    groupName: group ? group.name : state.maintenance[index].groupName,
    updatedAt: new Date().toISOString(),
  };
  state.maintenance[index] = updated;
  saveState();
  EventsEmit("maintenance:changed", state.maintenance);
  return updated;
}

export async function DeleteMaintenanceWindow(id: string): Promise<void> {
  state.maintenance = state.maintenance.filter((m) => m.id !== id);
  saveState();
  EventsEmit("maintenance:changed", state.maintenance);
}

export async function GetIncidents(filter: IncidentFilter): Promise<IncidentPage> {
  let items = [...state.incidents];
  if (filter.targetId) {
    items = items.filter((i) => i.targetId === filter.targetId);
  }
  if (filter.status) {
    items = items.filter((i) => i.status === filter.status);
  }
  if (filter.search) {
    const s = filter.search.toLowerCase();
    items = items.filter((i) => i.targetName.toLowerCase().includes(s) || i.summary.toLowerCase().includes(s));
  }

  const total = items.length;
  const offset = filter.offset || 0;
  const limit = filter.limit || 50;
  return {
    items: items.slice(offset, offset + limit),
    total,
    limit,
    offset,
  };
}

export async function GetIncidentReport(from: string, to: string): Promise<IncidentReport> {
  const totalIncidents = state.incidents.length;
  const openIncidents = state.incidents.filter((i) => i.status === "open").length;
  const resolvedIncidents = state.incidents.filter((i) => i.status === "resolved").length;
  const totalDowntimeSec = state.incidents.reduce((sum, i) => sum + (i.durationSeconds || 0), 0);
  const averageMttrSec = resolvedIncidents > 0 ? Math.round(totalDowntimeSec / resolvedIncidents) : 0;
  const longestOutageSec = state.incidents.reduce((max, i) => Math.max(max, i.durationSeconds || 0), 0);

  const byTarget = state.targets.map((t) => {
    const targetIncidents = state.incidents.filter((i) => i.targetId === t.id);
    const open = targetIncidents.filter((i) => i.status === "open").length;
    const downtimeSec = targetIncidents.reduce((acc, i) => acc + (i.durationSeconds || 0), 0);
    return {
      targetId: t.id,
      targetName: t.name,
      host: t.host,
      incidents: targetIncidents.length,
      open,
      downtimeSec,
      uptimePercent: 99.8,
    };
  });

  return {
    from,
    to,
    totalIncidents,
    openIncidents,
    resolvedIncidents,
    totalDowntimeSec,
    averageMttrSec,
    longestOutageSec,
    byTarget,
    recent: state.incidents.slice(0, 10),
  };
}

export async function GetNotificationConfig(provider: string): Promise<NotificationConfig> {
  const conf = state.notifications[provider] || {
    id: `notif-${provider}`,
    provider,
    enabled: false,
    apiUrl: "",
    apiKey: "",
    apiKeySet: false,
    sender: "",
    recipient: "",
    httpMethod: "POST",
    customHeaders: {},
    bodyTemplate: "",
  };
  return { ...conf };
}

export async function UpdateNotificationConfig(c: NotificationConfig): Promise<NotificationConfig> {
  state.notifications[c.provider] = { ...c };
  saveState();
  return { ...c };
}

export async function TestNotification(provider: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 450));
  EventsEmit("notification:sent", { provider, success: true });
}

export async function ImportTargets(payload: string, format: string): Promise<ImportResult> {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    if (format === "json") {
      const data = JSON.parse(payload);
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (item.name && (item.host || item.httpUrl)) {
          await CreateTarget(item);
          created++;
        } else {
          skipped++;
        }
      }
    } else {
      const lines = payload.trim().split("\n");
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        if (parts.length >= 2 && parts[0] && parts[1]) {
          await CreateTarget({
            name: parts[0],
            host: parts[1],
            probeType: parts[2] || "icmp",
            interval: parseInt(parts[3]) || 10,
          });
          created++;
        }
      }
    }
  } catch (err: any) {
    errors.push(err.message || "Failed to parse import file");
  }

  return { created, updated: 0, skipped, errors };
}

export async function ExportTargets(format: string): Promise<string> {
  if (format === "json") {
    return JSON.stringify(state.targets, null, 2);
  }
  const headers = ["Name", "Host", "ProbeType", "Interval", "Timeout", "Enabled", "Group", "SSL Valid", "SSL Days Left"];
  const rows = state.targets.map((t) => [
    `"${t.name}"`,
    `"${t.host}"`,
    `"${t.probeType || "icmp"}"`,
    t.interval,
    t.timeout,
    t.enabled ? "true" : "false",
    `"${t.groupName || ""}"`,
    t.ssl ? (t.ssl.valid ? "true" : "false") : "N/A",
    t.ssl?.daysRemaining ?? "N/A",
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function StartMonitoring(): Promise<void> {
  state.monitoring.running = true;
  state.monitoring.paused = false;
  state.monitoring.startedAt = new Date().toISOString();
  saveState();
  EventsEmit("monitoring:started", { running: true });
}

export async function StopMonitoring(): Promise<void> {
  state.monitoring.running = false;
  state.monitoring.paused = false;
  saveState();
  EventsEmit("monitoring:stopped", { running: false, paused: false });
}

export async function PauseAll(): Promise<void> {
  state.monitoring.running = false;
  state.monitoring.paused = true;
  saveState();
  EventsEmit("monitoring:stopped", { running: false, paused: true });
}

export async function GetMonitoringStatus(): Promise<MonitoringStatus> {
  return {
    running: state.monitoring.running,
    paused: state.monitoring.paused,
    startedAt: state.monitoring.startedAt,
  };
}

export async function GetEvents(filter: { targetId?: string; type?: string; limit?: number; offset?: number }): Promise<EventItem[]> {
  let items = [...state.events];
  if (filter.targetId) {
    items = items.filter((e) => e.targetId === filter.targetId);
  }
  if (filter.type) {
    items = items.filter((e) => e.type === filter.type);
  }
  const offset = filter.offset || 0;
  const limit = filter.limit || 50;
  return items.slice(offset, offset + limit);
}

export async function MinimizeToTray(): Promise<void> {}
export async function QuitApp(): Promise<void> {}
export async function GetAppVersion(): Promise<string> {
  return "2.0.0";
}
export async function CheckForUpdate(): Promise<UpdateInfo> {
  return {
    currentVersion: "2.0.0",
    latestVersion: "2.0.0",
    releaseUrl: "https://github.com/alikmndlu/PingPulse/releases",
    notes: "Your installation of PingPulse is up to date (v2.0.0).",
    assetName: "",
    assetUrl: "",
    available: false,
    canInstall: false,
  };
}
export async function InstallUpdate(): Promise<void> {}
export async function OpenReleasePage(): Promise<void> {
  if (typeof window !== "undefined") {
    window.open("https://github.com/alikmndlu/PingPulse/releases", "_blank");
  }
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.go = w.go || {};
  w.go.main = w.go.main || {};
  w.go.main.App = {
    GetTargets,
    GetTarget,
    CreateTarget,
    UpdateTarget,
    DeleteTarget,
    SetTargetEnabled,
    MuteTarget,
    TestPing,
    TestProbe,
    GetTargetHistory,
    PruneHistory,
    GetDashboardStats,
    GetTargetDetails,
    GetSlaReport,
    GetSettings,
    UpdateSettings,
    MuteNotifications,
    ListGroups,
    CreateGroup,
    UpdateGroup,
    DeleteGroup,
    ListMaintenanceWindows,
    CreateMaintenanceWindow,
    UpdateMaintenanceWindow,
    DeleteMaintenanceWindow,
    GetIncidents,
    GetIncidentReport,
    GetNotificationConfig,
    UpdateNotificationConfig,
    TestNotification,
    ImportTargets,
    ExportTargets,
    StartMonitoring,
    StopMonitoring,
    PauseAll,
    GetMonitoringStatus,
    GetEvents,
    MinimizeToTray,
    QuitApp,
    GetAppVersion,
    CheckForUpdate,
    InstallUpdate,
    OpenReleasePage,
  };
}
