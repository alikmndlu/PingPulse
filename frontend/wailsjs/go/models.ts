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
	export class CreateTargetInput {
	    name: string;
	    host: string;
	    enabled?: boolean;
	    interval?: number;
	    timeout?: number;
	    retryCount?: number;
	    retryDelay?: number;
	    groupId?: string;
	
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
	    success: boolean;
	    latencyMs?: number;
	    error: string;
	    attempts: number;
	
	    static createFrom(source: any = {}) {
	        return new PingTestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.success = source["success"];
	        this.latencyMs = source["latencyMs"];
	        this.error = source["error"];
	        this.attempts = source["attempts"];
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
	
	export class UpdateTargetInput {
	    name?: string;
	    host?: string;
	    enabled?: boolean;
	    interval?: number;
	    timeout?: number;
	    retryCount?: number;
	    retryDelay?: number;
	    groupId?: string;
	
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
	    }
	}

}

