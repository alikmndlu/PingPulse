export namespace domain {
	
	export class AvailabilityPoint {
	    // Go type: time
	    timestamp: any;
	    up: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AvailabilityPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.up = source["up"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CreateMaintenanceInput {
	    name: string;
	    targetId: string;
	    groupId: string;
	    startsAt: string;
	    endsAt: string;
	    reason: string;
	    suppressChecks?: boolean;
	    suppressNotifications?: boolean;
	    enabled?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CreateMaintenanceInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.targetId = source["targetId"];
	        this.groupId = source["groupId"];
	        this.startsAt = source["startsAt"];
	        this.endsAt = source["endsAt"];
	        this.reason = source["reason"];
	        this.suppressChecks = source["suppressChecks"];
	        this.suppressNotifications = source["suppressNotifications"];
	        this.enabled = source["enabled"];
	    }
	}
	export class CreateTargetInput {
	    name: string;
	    host: string;
	    enabled?: boolean;
	    interval?: number;
	    timeout?: number;
	    retryCount?: number;
	    retryDelay?: number;
	    groupId?: string;
	    probeType?: string;
	    httpUrl?: string;
	    httpMethod?: string;
	    expectStatus?: number;
	    tcpPort?: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateTargetInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.host = source["host"];
	        this.enabled = source["enabled"];
	        this.interval = source["interval"];
	        this.timeout = source["timeout"];
	        this.retryCount = source["retryCount"];
	        this.retryDelay = source["retryDelay"];
	        this.groupId = source["groupId"];
	        this.probeType = source["probeType"];
	        this.httpUrl = source["httpUrl"];
	        this.httpMethod = source["httpMethod"];
	        this.expectStatus = source["expectStatus"];
	        this.tcpPort = source["tcpPort"];
	    }
	}
	export class DashboardStats {
	    totalTargets: number;
	    online: number;
	    offline: number;
	    unknown: number;
	    disabled: number;
	    errorCount: number;
	    // Go type: time
	    lastCheck?: any;
	    // Go type: time
	    nextCheck?: any;
	    monitoring: boolean;
	    paused: boolean;
	    uptimePercent: number;
	    mutedUntil: string;
	    openIncidents: number;
	    activeMaintenance: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalTargets = source["totalTargets"];
	        this.online = source["online"];
	        this.offline = source["offline"];
	        this.unknown = source["unknown"];
	        this.disabled = source["disabled"];
	        this.errorCount = source["errorCount"];
	        this.lastCheck = this.convertValues(source["lastCheck"], null);
	        this.nextCheck = this.convertValues(source["nextCheck"], null);
	        this.monitoring = source["monitoring"];
	        this.paused = source["paused"];
	        this.uptimePercent = source["uptimePercent"];
	        this.mutedUntil = source["mutedUntil"];
	        this.openIncidents = source["openIncidents"];
	        this.activeMaintenance = source["activeMaintenance"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Event {
	    id: string;
	    targetId: string;
	    type: string;
	    message: string;
	    // Go type: time
	    createdAt: any;
	    metadata: string;
	
	    static createFrom(source: any = {}) {
	        return new Event(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.targetId = source["targetId"];
	        this.type = source["type"];
	        this.message = source["message"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.metadata = source["metadata"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EventFilter {
	    targetId: string;
	    type: string;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new EventFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.targetId = source["targetId"];
	        this.type = source["type"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	}
	export class HistoryFilter {
	    targetId: string;
	    status: string;
	    search: string;
	    from: string;
	    to: string;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new HistoryFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.targetId = source["targetId"];
	        this.status = source["status"];
	        this.search = source["search"];
	        this.from = source["from"];
	        this.to = source["to"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	}
	export class PingResult {
	    id: string;
	    targetId: string;
	    // Go type: time
	    timestamp: any;
	    success: boolean;
	    latencyMs?: number;
	    error?: string;
	    durationMs: number;
	
	    static createFrom(source: any = {}) {
	        return new PingResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.targetId = source["targetId"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.success = source["success"];
	        this.latencyMs = source["latencyMs"];
	        this.error = source["error"];
	        this.durationMs = source["durationMs"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoryPage {
	    items: PingResult[];
	    total: number;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new HistoryPage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], PingResult);
	        this.total = source["total"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportResult {
	    created: number;
	    updated: number;
	    skipped: number;
	    errors: string[];
	
	    static createFrom(source: any = {}) {
	        return new ImportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.created = source["created"];
	        this.updated = source["updated"];
	        this.skipped = source["skipped"];
	        this.errors = source["errors"];
	    }
	}
	export class Incident {
	    id: string;
	    targetId: string;
	    targetName: string;
	    host: string;
	    probeType: string;
	    status: string;
	    // Go type: time
	    startedAt: any;
	    // Go type: time
	    endedAt?: any;
	    durationSeconds: number;
	    failureCount: number;
	    summary: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Incident(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.targetId = source["targetId"];
	        this.targetName = source["targetName"];
	        this.host = source["host"];
	        this.probeType = source["probeType"];
	        this.status = source["status"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.endedAt = this.convertValues(source["endedAt"], null);
	        this.durationSeconds = source["durationSeconds"];
	        this.failureCount = source["failureCount"];
	        this.summary = source["summary"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IncidentFilter {
	    targetId: string;
	    status: string;
	    from: string;
	    to: string;
	    search: string;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new IncidentFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.targetId = source["targetId"];
	        this.status = source["status"];
	        this.from = source["from"];
	        this.to = source["to"];
	        this.search = source["search"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	}
	export class IncidentPage {
	    items: Incident[];
	    total: number;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new IncidentPage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], Incident);
	        this.total = source["total"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IncidentTargetStat {
	    targetId: string;
	    targetName: string;
	    host: string;
	    incidents: number;
	    open: number;
	    downtimeSec: number;
	    uptimePercent: number;
	
	    static createFrom(source: any = {}) {
	        return new IncidentTargetStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.targetId = source["targetId"];
	        this.targetName = source["targetName"];
	        this.host = source["host"];
	        this.incidents = source["incidents"];
	        this.open = source["open"];
	        this.downtimeSec = source["downtimeSec"];
	        this.uptimePercent = source["uptimePercent"];
	    }
	}
	export class IncidentReport {
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
	
	    static createFrom(source: any = {}) {
	        return new IncidentReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.from = source["from"];
	        this.to = source["to"];
	        this.totalIncidents = source["totalIncidents"];
	        this.openIncidents = source["openIncidents"];
	        this.resolvedIncidents = source["resolvedIncidents"];
	        this.totalDowntimeSec = source["totalDowntimeSec"];
	        this.averageMttrSec = source["averageMttrSec"];
	        this.longestOutageSec = source["longestOutageSec"];
	        this.byTarget = this.convertValues(source["byTarget"], IncidentTargetStat);
	        this.recent = this.convertValues(source["recent"], Incident);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class LatencyPoint {
	    // Go type: time
	    timestamp: any;
	    latency?: number;
	    success: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LatencyPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.latency = source["latency"];
	        this.success = source["success"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MaintenanceWindow {
	    id: string;
	    name: string;
	    targetId: string;
	    groupId: string;
	    // Go type: time
	    startsAt: any;
	    // Go type: time
	    endsAt: any;
	    reason: string;
	    suppressChecks: boolean;
	    suppressNotifications: boolean;
	    enabled: boolean;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	    targetName: string;
	    groupName: string;
	    active: boolean;
	
	    static createFrom(source: any = {}) {
	        return new MaintenanceWindow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.targetId = source["targetId"];
	        this.groupId = source["groupId"];
	        this.startsAt = this.convertValues(source["startsAt"], null);
	        this.endsAt = this.convertValues(source["endsAt"], null);
	        this.reason = source["reason"];
	        this.suppressChecks = source["suppressChecks"];
	        this.suppressNotifications = source["suppressNotifications"];
	        this.enabled = source["enabled"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	        this.targetName = source["targetName"];
	        this.groupName = source["groupName"];
	        this.active = source["active"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MonitoringStatus {
	    running: boolean;
	    paused: boolean;
	    // Go type: time
	    startedAt?: any;
	
	    static createFrom(source: any = {}) {
	        return new MonitoringStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.running = source["running"];
	        this.paused = source["paused"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NotificationConfig {
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
	
	    static createFrom(source: any = {}) {
	        return new NotificationConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.provider = source["provider"];
	        this.enabled = source["enabled"];
	        this.apiUrl = source["apiUrl"];
	        this.apiKey = source["apiKey"];
	        this.apiKeySet = source["apiKeySet"];
	        this.sender = source["sender"];
	        this.recipient = source["recipient"];
	        this.httpMethod = source["httpMethod"];
	        this.customHeaders = source["customHeaders"];
	        this.bodyTemplate = source["bodyTemplate"];
	    }
	}
	
	export class PingTestResult {
	    host: string;
	    probeType: string;
	    success: boolean;
	    latencyMs?: number;
	    error: string;
	    attempts: number;
	    detail: string;
	
	    static createFrom(source: any = {}) {
	        return new PingTestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.probeType = source["probeType"];
	        this.success = source["success"];
	        this.latencyMs = source["latencyMs"];
	        this.error = source["error"];
	        this.attempts = source["attempts"];
	        this.detail = source["detail"];
	    }
	}
	export class ProbeTestInput {
	    probeType: string;
	    host: string;
	    timeout: number;
	    httpUrl: string;
	    httpMethod: string;
	    expectStatus: number;
	    tcpPort: number;
	
	    static createFrom(source: any = {}) {
	        return new ProbeTestInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.probeType = source["probeType"];
	        this.host = source["host"];
	        this.timeout = source["timeout"];
	        this.httpUrl = source["httpUrl"];
	        this.httpMethod = source["httpMethod"];
	        this.expectStatus = source["expectStatus"];
	        this.tcpPort = source["tcpPort"];
	    }
	}
	export class Settings {
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
	    theme: string;
	    logLevel: string;
	    mutedUntil: string;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startOnBoot = source["startOnBoot"];
	        this.minimizeToTray = source["minimizeToTray"];
	        this.startMonitoringAutomatically = source["startMonitoringAutomatically"];
	        this.defaultInterval = source["defaultInterval"];
	        this.defaultTimeout = source["defaultTimeout"];
	        this.defaultRetry = source["defaultRetry"];
	        this.defaultRetryDelay = source["defaultRetryDelay"];
	        this.failureThreshold = source["failureThreshold"];
	        this.recoveryThreshold = source["recoveryThreshold"];
	        this.smsEnabled = source["smsEnabled"];
	        this.desktopNotificationEnabled = source["desktopNotificationEnabled"];
	        this.webhookEnabled = source["webhookEnabled"];
	        this.telegramEnabled = source["telegramEnabled"];
	        this.notificationCooldownSeconds = source["notificationCooldownSeconds"];
	        this.highLatencyThresholdMs = source["highLatencyThresholdMs"];
	        this.notifyOnOffline = source["notifyOnOffline"];
	        this.notifyOnRecovery = source["notifyOnRecovery"];
	        this.notifyOnHighLatency = source["notifyOnHighLatency"];
	        this.notifyOnTimeout = source["notifyOnTimeout"];
	        this.theme = source["theme"];
	        this.logLevel = source["logLevel"];
	        this.mutedUntil = source["mutedUntil"];
	    }
	}
	export class Target {
	    id: string;
	    name: string;
	    host: string;
	    enabled: boolean;
	    interval: number;
	    timeout: number;
	    retryCount: number;
	    retryDelay: number;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	    lastStatus: string;
	    lastLatency?: number;
	    // Go type: time
	    lastCheckedAt?: any;
	    // Go type: time
	    lastSuccessAt?: any;
	    // Go type: time
	    lastFailureAt?: any;
	    consecutiveFailures: number;
	    consecutiveSuccesses: number;
	    groupId: string;
	    groupName: string;
	    groupColor: string;
	    mutedUntil: string;
	    probeType: string;
	    httpUrl: string;
	    httpMethod: string;
	    expectStatus: number;
	    tcpPort: number;
	
	    static createFrom(source: any = {}) {
	        return new Target(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.enabled = source["enabled"];
	        this.interval = source["interval"];
	        this.timeout = source["timeout"];
	        this.retryCount = source["retryCount"];
	        this.retryDelay = source["retryDelay"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	        this.lastStatus = source["lastStatus"];
	        this.lastLatency = source["lastLatency"];
	        this.lastCheckedAt = this.convertValues(source["lastCheckedAt"], null);
	        this.lastSuccessAt = this.convertValues(source["lastSuccessAt"], null);
	        this.lastFailureAt = this.convertValues(source["lastFailureAt"], null);
	        this.consecutiveFailures = source["consecutiveFailures"];
	        this.consecutiveSuccesses = source["consecutiveSuccesses"];
	        this.groupId = source["groupId"];
	        this.groupName = source["groupName"];
	        this.groupColor = source["groupColor"];
	        this.mutedUntil = source["mutedUntil"];
	        this.probeType = source["probeType"];
	        this.httpUrl = source["httpUrl"];
	        this.httpMethod = source["httpMethod"];
	        this.expectStatus = source["expectStatus"];
	        this.tcpPort = source["tcpPort"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TargetMetrics {
	    currentLatency?: number;
	    averageLatency?: number;
	    minLatency?: number;
	    maxLatency?: number;
	    uptimePercent: number;
	    totalChecks: number;
	    successful: number;
	    failed: number;
	
	    static createFrom(source: any = {}) {
	        return new TargetMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentLatency = source["currentLatency"];
	        this.averageLatency = source["averageLatency"];
	        this.minLatency = source["minLatency"];
	        this.maxLatency = source["maxLatency"];
	        this.uptimePercent = source["uptimePercent"];
	        this.totalChecks = source["totalChecks"];
	        this.successful = source["successful"];
	        this.failed = source["failed"];
	    }
	}
	export class TargetDetails {
	    target: Target;
	    metrics: TargetMetrics;
	    recentEvents: Event[];
	    recentResults: PingResult[];
	    latencySeries: LatencyPoint[];
	    availability: AvailabilityPoint[];
	    openIncident?: Incident;
	    inMaintenance: boolean;
	    maintenanceWindow?: MaintenanceWindow;
	
	    static createFrom(source: any = {}) {
	        return new TargetDetails(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.target = this.convertValues(source["target"], Target);
	        this.metrics = this.convertValues(source["metrics"], TargetMetrics);
	        this.recentEvents = this.convertValues(source["recentEvents"], Event);
	        this.recentResults = this.convertValues(source["recentResults"], PingResult);
	        this.latencySeries = this.convertValues(source["latencySeries"], LatencyPoint);
	        this.availability = this.convertValues(source["availability"], AvailabilityPoint);
	        this.openIncident = this.convertValues(source["openIncident"], Incident);
	        this.inMaintenance = source["inMaintenance"];
	        this.maintenanceWindow = this.convertValues(source["maintenanceWindow"], MaintenanceWindow);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TargetGroup {
	    id: string;
	    name: string;
	    color: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new TargetGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.color = source["color"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class UpdateMaintenanceInput {
	    name?: string;
	    targetId?: string;
	    groupId?: string;
	    startsAt?: string;
	    endsAt?: string;
	    reason?: string;
	    suppressChecks?: boolean;
	    suppressNotifications?: boolean;
	    enabled?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UpdateMaintenanceInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.targetId = source["targetId"];
	        this.groupId = source["groupId"];
	        this.startsAt = source["startsAt"];
	        this.endsAt = source["endsAt"];
	        this.reason = source["reason"];
	        this.suppressChecks = source["suppressChecks"];
	        this.suppressNotifications = source["suppressNotifications"];
	        this.enabled = source["enabled"];
	    }
	}
	export class UpdateTargetInput {
	    name?: string;
	    host?: string;
	    enabled?: boolean;
	    interval?: number;
	    timeout?: number;
	    retryCount?: number;
	    retryDelay?: number;
	    groupId?: string;
	    probeType?: string;
	    httpUrl?: string;
	    httpMethod?: string;
	    expectStatus?: number;
	    tcpPort?: number;
	
	    static createFrom(source: any = {}) {
	        return new UpdateTargetInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.host = source["host"];
	        this.enabled = source["enabled"];
	        this.interval = source["interval"];
	        this.timeout = source["timeout"];
	        this.retryCount = source["retryCount"];
	        this.retryDelay = source["retryDelay"];
	        this.groupId = source["groupId"];
	        this.probeType = source["probeType"];
	        this.httpUrl = source["httpUrl"];
	        this.httpMethod = source["httpMethod"];
	        this.expectStatus = source["expectStatus"];
	        this.tcpPort = source["tcpPort"];
	    }
	}

}

export namespace updater {
	
	export class Info {
	    currentVersion: string;
	    latestVersion: string;
	    releaseUrl: string;
	    notes: string;
	    assetName: string;
	    assetUrl: string;
	    available: boolean;
	    canInstall: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseUrl = source["releaseUrl"];
	        this.notes = source["notes"];
	        this.assetName = source["assetName"];
	        this.assetUrl = source["assetUrl"];
	        this.available = source["available"];
	        this.canInstall = source["canInstall"];
	    }
	}

}

