import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Clock, Server, Signal, Siren, WifiOff, Wrench } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { GroupBadge, GroupFilter } from "@/components/GroupFilter";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live view of every host PingPulse is watching.</p>
      </div>
      <GroupFilter groups={groups} targets={targets} value={groupFilter} onChange={setGroupFilter} />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
        <MetricCard label="Targets" value={overview.total} icon={Server} />
        <MetricCard label="Online" value={overview.online} icon={Signal} tone="success" />
        <MetricCard label="Offline" value={overview.offline} icon={WifiOff} tone="danger" />
        <MetricCard label="Unknown" value={overview.unknown} icon={Activity} tone="warning" />
        <MetricCard label="With errors" value={overview.errors} icon={AlertTriangle} tone="danger" />
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
          hint={`Last ${formatTime(stats?.lastCheck)} · Next ${formatTime(stats?.nextCheck)}`}
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
              <p className="text-sm text-muted-foreground">Create groups on the Targets page to slice Home, VPS, cameras, and work.</p>
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
          <CardTitle>Targets</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/targets")}>
            Manage
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
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Last success</TableHead>
                <TableHead>Last failure</TableHead>
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
                    <TableCell className="max-w-[200px] truncate font-mono text-xs" title={endpointLabel(t)}>
                      {endpointLabel(t)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.lastStatus} />
                    </TableCell>
                    <TableCell className="font-mono">{formatLatency(t.lastLatency)}</TableCell>
                    <TableCell>{formatRelative(t.lastSuccessAt)}</TableCell>
                    <TableCell>{formatRelative(t.lastFailureAt)}</TableCell>
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
