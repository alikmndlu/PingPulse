export type TargetStatus = "online" | "offline" | "unknown" | "disabled";

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
}

export interface CreateTargetInput {
  name: string;
  host: string;
  enabled?: boolean;
  interval?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface UpdateTargetInput {
  name?: string;
  host?: string;
  enabled?: boolean;
  interval?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
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
  notificationCooldownSeconds: number;
  highLatencyThresholdMs: number;
  notifyOnOffline: boolean;
  notifyOnRecovery: boolean;
  notifyOnHighLatency: boolean;
  notifyOnTimeout: boolean;
  theme: "dark" | "light";
  logLevel: string;
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
}

export interface PingTestResult {
  host: string;
  success: boolean;
  latencyMs: number | null;
  error: string;
  attempts: number;
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
