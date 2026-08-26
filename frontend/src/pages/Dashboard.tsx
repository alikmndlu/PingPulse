import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Clock, Server, Signal, Siren, WifiOff, Wrench } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { GroupBadge, GroupFilter } from "@/components/GroupFilter";
import { EmptyState, Page, PageHeader } from "@/components/app/Page";
import { Bone, ChartSkeleton, FilterSkeleton, HeroSkeleton, MetricSkeletonGrid, TableSkeleton } from "@/components/app/Skeleton";
import { Crossfade, MotionTableRow, Stagger, StaggerItem } from "@/components/app/Motion";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { motion, useReducedMotion } from "motion/react";
import { appleEase } from "@/lib/motion";
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
import { useCachedState } from "@/lib/queryCache";
import { toast } from "sonner";
import { cn, wailsError } from "@/lib/utils";

export function DashboardPage() {
  const navigate = useNavigate();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const setMonitoring = useAppStore((s) => s.setMonitoring);
  const [stats, setStats, hasStats] = useCachedState<DashboardStats | null>("dashboard", null);
  const [targets, setTargets, hasTargets] = useCachedState<Target[]>("targets", []);
  const [groups, setGroups] = useCachedState<TargetGroup[]>("groups", []);
  const [groupFilter, setGroupFilter] = useState(GROUP_ALL);
  const ready = hasStats && hasTargets;

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

  const reduce = useReducedMotion();

  return (
    <Page>
      <PageHeader kicker="Live" title="Dashboard" description="Every host PingPulse is watching, right now." />
      <Crossfade ready={ready} skeleton={<HeroSkeleton />}>
        <FleetStrip targets={visible} reduce={Boolean(reduce)} onOpen={(id) => navigate(`/targets/${id}`)} />
      </Crossfade>
      <Crossfade ready={ready} skeleton={<FilterSkeleton />}>
        <GroupFilter groups={groups} targets={targets} value={groupFilter} onChange={setGroupFilter} />
      </Crossfade>
      <Crossfade ready={ready} skeleton={<MetricSkeletonGrid count={8} />}>
      <Stagger className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <MetricCard label="Targets" value={overview.total} icon={Server} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Online" value={overview.online} icon={Signal} tone="success" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Offline" value={overview.offline} icon={WifiOff} tone="danger" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Unknown" value={overview.unknown} icon={Activity} tone="warning" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="With errors" value={overview.errors} icon={AlertTriangle} tone="danger" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Open incidents"
            value={stats?.openIncidents ?? 0}
            icon={Siren}
            tone={(stats?.openIncidents ?? 0) > 0 ? "danger" : undefined}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Maintenance" value={stats?.activeMaintenance ?? 0} icon={Wrench} tone="warning" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Uptime"
            value={formatPercent(overview.uptime)}
            icon={Clock}
            hint={`Last ${formatTime(stats?.lastCheck)} · Next ${formatTime(stats?.nextCheck)}`}
          />
        </StaggerItem>
      </Stagger>
      </Crossfade>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
          </CardHeader>
          <CardContent>
            <Crossfade ready={ready} skeleton={<ChartSkeleton />}>
              <StatusDonut online={overview.online} offline={overview.offline} unknown={overview.unknown} disabled={overview.disabled} />
            </Crossfade>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>By group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Crossfade
              ready={ready}
              skeleton={
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Bone className="h-3 w-24" />
                        <Bone className="h-3 w-16" />
                      </div>
                      <Bone className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              }
            >
              {groupRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create groups on the Targets page to slice Home, VPS, cameras, and work.</p>
            ) : (
              groupRows.map((row) => {
                const pct = row.total ? Math.round((row.online / row.total) * 100) : 0;
                return (
                  <motion.button
                    key={row.id}
                    type="button"
                    className="w-full rounded-xl p-1.5 text-start transition-colors hover:bg-muted/40"
                    whileHover={reduce ? undefined : { x: 2 }}
                    onClick={() => setGroupFilter(row.id)}
                  >
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: row.color, color: row.color }} />
                        {row.name}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {row.online}/{row.total} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full"
                        initial={false}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: appleEase }}
                        style={{ background: row.color }}
                      />
                    </div>
                  </motion.button>
                );
              })
            )}
            </Crossfade>
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
              {!ready ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <TableSkeleton rows={6} />
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      title={targets.length === 0 ? "No targets yet" : "No targets in this group"}
                      hint={targets.length === 0 ? "Add a host on the Targets page to start monitoring." : "Pick another group or add hosts to this one."}
                      action={
                        targets.length === 0 ? (
                          <Button size="sm" onClick={() => navigate("/targets")}>
                            Add a target
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((t, i) => (
                  <MotionTableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/targets/${t.id}`)}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 14) * 0.04, duration: 0.48, ease: appleEase }}
                  >
                    <TableCell className="font-medium">
                      {t.name}
                      {isMuted(t.mutedUntil) ? <span className="ms-2 text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">muted</span> : null}
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
                  </MotionTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Page>
  );
}

function FleetStrip({
  targets,
  reduce,
  onOpen,
}: {
  targets: Target[];
  reduce: boolean;
  onOpen: (id: string) => void;
}) {
  const shown = targets.slice(0, 10);
  const online = targets.filter((t) => t.enabled && t.lastStatus === "online").length;
  const offline = targets.filter((t) => t.enabled && t.lastStatus === "offline").length;
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-primary/12 via-card to-card px-6 py-5">
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.08, 0.92] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">Fleet pulse</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {targets.length === 0
              ? "Nothing on the wire yet."
              : `${online} answering · ${offline} silent · ${targets.length} watched`}
          </p>
        </div>
        {shown.length ? (
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            {shown.map((t, i) => (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => onOpen(t.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur"
                animate={reduce ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 3.2 + i * 0.18, repeat: Infinity, ease: "easeInOut" }}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    t.lastStatus === "online" && "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
                    t.lastStatus === "offline" && "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]",
                    t.lastStatus === "unknown" && "bg-amber-400",
                    t.lastStatus === "disabled" && "bg-zinc-400",
                  )}
                />
                {t.name}
              </motion.button>
            ))}
            {targets.length > shown.length ? (
              <span className="inline-flex items-center rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground">
                +{targets.length - shown.length}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
