export type TargetStatus = "online" | "offline" | "degraded" | "unknown" | "disabled";
export type ProbeType = "icmp" | "http" | "tcp";

export interface SslInfo {
  enabled: boolean;
  valid: boolean;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  issuer?: string;
  subject?: string;
  serialNumber?: string;
  tlsVersion?: string;
  alertThresholdDays?: number;
}

export interface HttpAssertions {
  matchBody?: string;
  matchJsonPath?: string;
  matchJsonValue?: string;
  maxLatencyMs?: number;
  customHeaders?: Record<string, string>;
}

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
  ssl?: SslInfo;
  assertions?: HttpAssertions;
  jitterMs?: number;
  isAnomaly?: boolean;
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
  sslEnabled?: boolean;
  sslAlertDays?: number;
  matchBody?: string;
  matchJsonPath?: string;
  matchJsonValue?: string;
  maxLatencyMs?: number;
  customHeaders?: Record<string, string>;
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
  sslEnabled?: boolean;
  sslAlertDays?: number;
  matchBody?: string;
  matchJsonPath?: string;
  matchJsonValue?: string;
  maxLatencyMs?: number;
  customHeaders?: Record<string, string>;
}

export interface DashboardStats {
  totalTargets: number;
  online: number;
  offline: number;
  unknown: number;
  disabled: number;
  degraded?: number;
  errorCount: number;
  lastCheck: string | null;
  nextCheck: string | null;
  monitoring: boolean;
  paused: boolean;
  uptimePercent: number;
  mutedUntil?: string;
  openIncidents?: number;
  activeMaintenance?: number;
  sslExpiringCount?: number;
  anomaliesCount?: number;
}

export interface PingResult {
  id: string;
  targetId: string;
  timestamp: string;
  success: boolean;
  latencyMs: number | null;
  error: string | null;
  durationMs: number;
  assertionPassed?: boolean;
  assertionError?: string;
  sslValid?: boolean;
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
  discordEnabled?: boolean;
  slackEnabled?: boolean;
  teamsEnabled?: boolean;
  pagerDutyEnabled?: boolean;
  notificationCooldownSeconds: number;
  highLatencyThresholdMs: number;
  notifyOnOffline: boolean;
  notifyOnRecovery: boolean;
  notifyOnHighLatency: boolean;
  notifyOnTimeout: boolean;
  notifyOnSslExpiry?: boolean;
  notifyOnAnomaly?: boolean;
  theme: "dark" | "light";
  logLevel: string;
  mutedUntil?: string;
  // Long term & retention
  retentionDays?: number;
  autoPruneHistory?: boolean;
  flappingDetection?: boolean;
  flappingThreshold?: number;
  anomalyDetectionSensitivity?: "low" | "medium" | "high";
  statusPagePublic?: boolean;
  statusPageTitle?: string;
  statusPageMessage?: string;
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
  jitterMs: number;
  uptimePercent: number;
  totalChecks: number;
  successful: number;
  failed: number;
  p95Latency?: number;
  p99Latency?: number;
}

export interface LatencyPoint {
  timestamp: string;
  latency: number | null;
  success: boolean;
  isAnomaly?: boolean;
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
  aiDiagnosis?: string;
}

export interface PingTestResult {
  host: string;
  probeType?: ProbeType;
  success: boolean;
  latencyMs: number | null;
  error: string;
  attempts: number;
  detail?: string;
  sslInfo?: SslInfo;
  assertionPassed?: boolean;
  assertionDetail?: string;
}

export interface ProbeTestInput {
  probeType?: string;
  host: string;
  timeout?: number;
  httpUrl?: string;
  httpMethod?: string;
  expectStatus?: number;
  tcpPort?: number;
  sslEnabled?: boolean;
  matchBody?: string;
  matchJsonPath?: string;
  matchJsonValue?: string;
  maxLatencyMs?: number;
  customHeaders?: Record<string, string>;
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
  rootCause?: string;
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

export interface SlaTargetCompliance {
  targetId: string;
  targetName: string;
  groupName?: string;
  host: string;
  uptimePercent: number;
  targetSlaPercent: number;
  allowedDowntimeSec: number;
  actualDowntimeSec: number;
  errorBudgetRemainingPercent: number;
  status: "compliant" | "warning" | "breached";
  mtbfHours: number;
  mttrMinutes: number;
  outageCount: number;
}

export interface SlaReport {
  period: string;
  from: string;
  to: string;
  overallUptime: number;
  slaTarget: number;
  compliantCount: number;
  breachedCount: number;
  totalErrorBudgetHours: number;
  consumedErrorBudgetHours: number;
  targets: SlaTargetCompliance[];
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
