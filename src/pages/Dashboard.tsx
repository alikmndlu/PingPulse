import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Clock,
  Lock,
  Server,
  Signal,
  Siren,
  Sparkles,
  WifiOff,
  Wrench,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { GroupBadge, GroupFilter } from "@/components/GroupFilter";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { DashboardStats, Target, TargetGroup } from "@/types";
import { formatLatency, formatPercent, formatRelative, formatTime } from "@/lib/format";
import { countByGroup, filterTargets, GROUP_ALL } from "@/lib/groups";
import { isMuted } from "@/lib/mute";
import { endpointLabel, probeLabel } from "@/lib/probe";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function DashboardPage() {
  const navigate = useNavigate();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const setMonitoring = useAppStore((s) => s.setMonitoring);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [groups, setGroups] = useState<TargetGroup[]>([]);
  const [groupFilter, setGroupFilter] = useState(GROUP_ALL);

  async function load() {
    try {
      const [s, list, g] = await Promise.all([api.getDashboardStats(), api.getTargets(), api.listGroups()]);
      setStats(s);
      setTargets(list ?? []);
      setGroups(g ?? []);
      setMonitoring(s.monitoring, s.paused);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, [refreshKey]);

  const visible = useMemo(() => filterTargets(targets, groupFilter), [targets, groupFilter]);
  const overview = useMemo(() => {
    if (groupFilter === GROUP_ALL && stats) {
      return {
        total: stats.totalTargets,
        online: stats.online,
        offline: stats.offline,
        unknown: stats.unknown,
        disabled: stats.disabled,
        errors: stats.errorCount,
        uptime: stats.uptimePercent,
      };
    }
    const online = visible.filter((t) => t.enabled && t.lastStatus === "online").length;
    const offline = visible.filter((t) => t.enabled && t.lastStatus === "offline").length;
    const unknown = visible.filter((t) => t.enabled && t.lastStatus === "unknown").length;
    const disabled = visible.filter((t) => !t.enabled).length;
    return {
      total: visible.length,
      online,
      offline,
      unknown,
      disabled,
      errors: offline,
      uptime: stats?.uptimePercent ?? 0,
    };
  }, [groupFilter, stats, visible]);
  const groupRows = useMemo(() => countByGroup(targets, groups), [targets, groups]);

  const sslExpiringCount = targets.filter(
    (t) => t.ssl && t.ssl.daysRemaining !== undefined && t.ssl.daysRemaining <= 14,
  ).length;

  const anomalyCount = targets.filter((t) => t.isAnomaly).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time infrastructure pulse, SSL validity & anomaly alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/sla")} className="gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            SLA Compliance
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/status")} className="gap-1.5">
            <Radio className="h-4 w-4 text-sky-500" />
            Status Portal
          </Button>
        </div>
      </div>

      <GroupFilter groups={groups} targets={targets} value={groupFilter} onChange={setGroupFilter} />

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
        <MetricCard label="Targets" value={overview.total} icon={Server} />
        <MetricCard label="Online" value={overview.online} icon={Signal} tone="success" />
        <MetricCard label="Offline" value={overview.offline} icon={WifiOff} tone="danger" />
        <MetricCard
          label="SSL Warnings"
          value={sslExpiringCount}
          icon={Lock}
          tone={sslExpiringCount > 0 ? "warning" : undefined}
          hint={sslExpiringCount > 0 ? "Expires < 14 days" : "All certs valid"}
        />
        <MetricCard
          label="AI Anomalies"
          value={anomalyCount}
          icon={Sparkles}
          tone={anomalyCount > 0 ? "warning" : undefined}
          hint="Jitter / Spike detected"
        />
        <MetricCard
          label="Open incidents"
          value={stats?.openIncidents ?? 0}
          icon={Siren}
          tone={(stats?.openIncidents ?? 0) > 0 ? "danger" : undefined}
        />
        <MetricCard label="Maintenance" value={stats?.activeMaintenance ?? 0} icon={Wrench} tone="warning" />
        <MetricCard
          label="Uptime"
          value={formatPercent(overview.uptime)}
          icon={Clock}
          hint={`Last ${formatTime(stats?.lastCheck)}`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut online={overview.online} offline={overview.offline} unknown={overview.unknown} disabled={overview.disabled} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>By group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create groups on the Targets page to organize infrastructure.</p>
            ) : (
              groupRows.map((row) => {
                const pct = row.total ? Math.round((row.online / row.total) * 100) : 0;
                return (
                  <button key={row.id} type="button" className="w-full text-start" onClick={() => setGroupFilter(row.id)}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                        {row.name}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {row.online}/{row.total} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Monitored Endpoints & Health</CardTitle>
            <CardDescription>Click any target to view SSL certificates, deep assertions & AI diagnostics.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/targets")}>
            Manage All
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Probe</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>SSL / Health</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Last success</TableHead>
                <TableHead>Consecutive failures</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    {targets.length === 0 ? "No targets yet. Add a host to start monitoring." : "No targets in this group."}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/targets/${t.id}`)}>
                    <TableCell className="font-medium">
                      {t.name}
                      {isMuted(t.mutedUntil) ? <span className="ms-2 text-[10px] uppercase tracking-wide text-amber-400">muted</span> : null}
                    </TableCell>
                    <TableCell>
                      <GroupBadge name={t.groupName} color={t.groupColor} />
                    </TableCell>
                    <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">{probeLabel(t.probeType)}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs" title={endpointLabel(t)}>
                      {endpointLabel(t)}
                    </TableCell>
                    <TableCell>
                      {t.ssl ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${
                            (t.ssl.daysRemaining ?? 100) <= 14
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                              : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                          }`}
                        >
                          <Lock className="h-2.5 w-2.5" />
                          {t.ssl.daysRemaining}d
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.lastStatus} />
                    </TableCell>
                    <TableCell className="font-mono">{formatLatency(t.lastLatency)}</TableCell>
                    <TableCell>{formatRelative(t.lastSuccessAt)}</TableCell>
                    <TableCell className="font-mono">{t.consecutiveFailures}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
