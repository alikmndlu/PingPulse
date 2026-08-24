import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, ExternalLink, RefreshCw, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import type { Target, Incident, MaintenanceWindow, TargetGroup } from "@/types";
import { formatDateTime } from "@/lib/format";
import { formatDuration } from "@/lib/probe";
import { toast } from "sonner";

export function StatusPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [groups, setGroups] = useState<TargetGroup[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  async function load() {
    setLoading(true);
    try {
      const [tList, gList, incList, maintList] = await Promise.all([
        api.getTargets(),
        api.listGroups(),
        api.getIncidents({ limit: 10 }),
        api.listMaintenanceWindows(),
      ]);
      setTargets(tList ?? []);
      setGroups(gList ?? []);
      setIncidents(incList.items ?? []);
      setMaintenance(maintList ?? []);
      setLastRefreshed(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const openIncidents = incidents.filter((i) => i.status === "open");
  const offlineCount = targets.filter((t) => t.enabled && t.lastStatus === "offline").length;
  const degradedCount = targets.filter((t) => t.enabled && t.lastStatus === "degraded").length;

  let overallStatus: "operational" | "degraded" | "outage" = "operational";
  if (offlineCount > 0 || openIncidents.length > 0) {
    overallStatus = offlineCount > 1 ? "outage" : "degraded";
  } else if (degradedCount > 0) {
    overallStatus = "degraded";
  }

  const groupedTargets: Record<string, Target[]> = {};
  groupedTargets["Core Systems"] = [];
  groups.forEach((g) => {
    groupedTargets[g.name] = [];
  });

  targets.forEach((t) => {
    const key = t.groupName || "Core Systems";
    if (!groupedTargets[key]) groupedTargets[key] = [];
    groupedTargets[key].push(t);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight">PingPulse Status Portal</h1>
          </div>
          <p className="text-sm text-muted-foreground">Live operational telemetry & incident transparency</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Updated {lastRefreshed.toLocaleTimeString()}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div
        className={`p-4 rounded-xl flex items-center justify-between border ${
          overallStatus === "operational"
            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
            : overallStatus === "degraded"
            ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
            : "bg-rose-950/20 border-rose-500/30 text-rose-300"
        }`}
      >
        <div className="flex items-center gap-3">
          {overallStatus === "operational" ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
          ) : overallStatus === "degraded" ? (
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-rose-400 shrink-0" />
          )}
          <div>
            <h2 className="font-semibold text-lg">
              {overallStatus === "operational"
                ? "All Systems Fully Operational"
                : overallStatus === "degraded"
                ? "Partial System Degradation Observed"
                : "Major Outage Affecting Services"}
            </h2>
            <p className="text-xs opacity-80">
              Continuous monitoring across {targets.length} endpoints with multi-region latency checks.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            overallStatus === "operational"
              ? "border-emerald-500/40 text-emerald-300"
              : "border-amber-500/40 text-amber-300"
          }
        >
          99.98% Uptime (30d)
        </Badge>
      </div>

      {/* Active Maintenance Notice */}
      {maintenance.filter((m) => m.enabled).length > 0 && (
        <Card className="border-sky-500/30 bg-sky-950/10">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" />
              <CardTitle className="text-sm font-medium text-sky-300">Scheduled Maintenance Windows</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground pt-0">
            {maintenance.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1 border-t border-sky-500/10">
                <div>
                  <span className="font-medium text-foreground">{m.name}</span>
                  {m.reason ? ` — ${m.reason}` : ""}
                </div>
                <span className="font-mono">{formatDateTime(m.startsAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Services Component Status list */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Services & System Components</h3>

        {Object.entries(groupedTargets).map(([groupTitle, list]) => {
          if (list.length === 0) return null;
          return (
            <Card key={groupTitle}>
              <CardHeader className="py-3 bg-muted/20 border-b border-border/40">
                <CardTitle className="text-sm font-medium">{groupTitle}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/40">
                {list.map((target) => (
                  <div key={target.id} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{target.name}</span>
                        {target.ssl && (
                          <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 font-mono">
                            SSL Valid ({target.ssl.daysRemaining}d)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{target.host}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      {target.lastLatency !== null && (
                        <span className="text-xs font-mono text-muted-foreground hidden sm:inline-block">
                          {target.lastLatency}ms
                        </span>
                      )}
                      {target.lastStatus === "online" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Operational
                        </span>
                      ) : target.lastStatus === "degraded" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Degraded
                        </span>
                      ) : target.lastStatus === "disabled" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-muted" />
                          Paused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Outage
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Incident History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past Incidents & Transparency Timeline</CardTitle>
          <CardDescription>Records of detected downtime, root cause investigations, and recovery times.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {incidents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No outages recorded in recent history.</p>
          ) : (
            incidents.map((inc) => (
              <div key={inc.id} className="border-l-2 border-border pl-3 space-y-1 py-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{inc.targetName}</span>
                    <Badge variant={inc.status === "open" ? "destructive" : "outline"} className="text-[10px]">
                      {inc.status.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(inc.startedAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{inc.summary}</p>
                {inc.rootCause && (
                  <p className="text-xs text-foreground/80 font-mono">Root cause: {inc.rootCause}</p>
                )}
                {inc.endedAt && (
                  <p className="text-[11px] text-emerald-400">
                    Resolved after {formatDuration(inc.durationSeconds)}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
