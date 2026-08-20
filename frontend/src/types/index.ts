export type TargetStatus = "online" | "offline" | "unknown" | "disabled";
export type ProbeType = "icmp" | "http" | "tcp";

export interface Target {
  id: string;
  name: string;
  host: string;
  enabled: boolean;
  interval: number;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  createdAt: string;
  updatedAt: string;
  lastStatus: TargetStatus;
  lastLatency: number | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
  mutedUntil?: string;
  probeType?: ProbeType;
  httpUrl?: string;
  httpMethod?: string;
  expectStatus?: number;
  tcpPort?: number;
}

export interface TargetGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTargetInput {
  name: string;
  host: string;
  enabled?: boolean;
  interval?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  groupId?: string;
  probeType?: ProbeType | string;
  httpUrl?: string;
  httpMethod?: string;
  expectStatus?: number;
  tcpPort?: number;
}

export interface UpdateTargetInput {
  name?: string;
  host?: string;
  enabled?: boolean;
  interval?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  groupId?: string;
  probeType?: ProbeType | string;
  httpUrl?: string;
  httpMethod?: string;
  expectStatus?: number;
  tcpPort?: number;
}

export interface DashboardStats {
  totalTargets: number;
  online: number;
  offline: number;
  unknown: number;
  disabled: number;
  errorCount: number;
  lastCheck: string | null;
  nextCheck: string | null;
  monitoring: boolean;
  paused: boolean;
  uptimePercent: number;
  mutedUntil?: string;
  openIncidents?: number;
  activeMaintenance?: number;
}

export interface PingResult {
  id: string;
  targetId: string;
  timestamp: string;
  success: boolean;
  latencyMs: number | null;
  error: string | null;
  durationMs: number;
}

export interface HistoryFilter {
  targetId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryPage {
  items: PingResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface EventItem {
  id: string;
  targetId: string;
  type: string;
  message: string;
  createdAt: string;
  metadata: string;
}

export interface Settings {
  startOnBoot: boolean;
  minimizeToTray: boolean;
  startMonitoringAutomatically: boolean;
  defaultInterval: number;
  defaultTimeout: number;
  defaultRetry: number;
  defaultRetryDelay: number;
  failureThreshold: number;
  recoveryThreshold: number;
  smsEnabled: boolean;
  desktopNotificationEnabled: boolean;
  webhookEnabled: boolean;
  telegramEnabled: boolean;
  notificationCooldownSeconds: number;
  highLatencyThresholdMs: number;
  notifyOnOffline: boolean;
  notifyOnRecovery: boolean;
  notifyOnHighLatency: boolean;
  notifyOnTimeout: boolean;
  theme: "dark" | "light";
  logLevel: string;
  mutedUntil?: string;
}

export interface NotificationConfig {
  id: string;
  provider: string;
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  apiKeySet: boolean;
  sender: string;
  recipient: string;
  httpMethod: string;
  customHeaders: Record<string, string>;
  bodyTemplate: string;
}

export interface TargetMetrics {
  currentLatency: number | null;
  averageLatency: number | null;
  minLatency: number | null;
  maxLatency: number | null;
  uptimePercent: number;
  totalChecks: number;
  successful: number;
  failed: number;
}

export interface LatencyPoint {
  timestamp: string;
  latency: number | null;
  success: boolean;
}

export interface AvailabilityPoint {
  timestamp: string;
  up: boolean;
}

export interface TargetDetails {
  target: Target;
  metrics: TargetMetrics;
  recentEvents: EventItem[];
  recentResults: PingResult[];
  latencySeries: LatencyPoint[];
  availability: AvailabilityPoint[];
  openIncident?: Incident | null;
  inMaintenance?: boolean;
  maintenanceWindow?: MaintenanceWindow | null;
}

export interface PingTestResult {
  host: string;
  probeType?: ProbeType;
  success: boolean;
  latencyMs: number | null;
  error: string;
  attempts: number;
  detail?: string;
}

export interface ProbeTestInput {
  probeType?: string;
  host: string;
  timeout?: number;
  httpUrl?: string;
  httpMethod?: string;
  expectStatus?: number;
  tcpPort?: number;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  targetId: string;
  groupId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  suppressChecks: boolean;
  suppressNotifications: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  targetName?: string;
  groupName?: string;
  active?: boolean;
}

export interface CreateMaintenanceInput {
  name: string;
  targetId?: string;
  groupId?: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
  suppressChecks?: boolean;
  suppressNotifications?: boolean;
  enabled?: boolean;
}

export interface UpdateMaintenanceInput {
  name?: string;
  targetId?: string;
  groupId?: string;
  startsAt?: string;
  endsAt?: string;
  reason?: string;
  suppressChecks?: boolean;
  suppressNotifications?: boolean;
  enabled?: boolean;
}

export interface Incident {
  id: string;
  targetId: string;
  targetName: string;
  host: string;
  probeType: ProbeType | string;
  status: "open" | "resolved" | string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  failureCount: number;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentFilter {
  targetId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IncidentPage {
  items: Incident[];
  total: number;
  limit: number;
  offset: number;
}

export interface IncidentTargetStat {
  targetId: string;
  targetName: string;
  host: string;
  incidents: number;
  open: number;
  downtimeSec: number;
  uptimePercent: number;
}

export interface IncidentReport {
  from: string;
  to: string;
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  totalDowntimeSec: number;
  averageMttrSec: number;
  longestOutageSec: number;
  byTarget: IncidentTargetStat[];
  recent: Incident[];
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface MonitoringStatus {
  running: boolean;
  paused: boolean;
  startedAt: string | null;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  notes: string;
  assetName: string;
  assetUrl: string;
  available: boolean;
  canInstall: boolean;
}

export interface UpdateProgress {
  percent: number;
  bytes: number;
  total: number;
}
