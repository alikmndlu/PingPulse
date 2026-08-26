import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bell, BellOff, Gauge, Activity, Timer, TrendingUp } from "lucide-react";
import { Page, PageHeader } from "@/components/app/Page";
import { DetailsSkeleton } from "@/components/app/Skeleton";
import { Stagger, StaggerItem } from "@/components/app/Motion";
import { StatusBadge } from "@/components/StatusBadge";
import { GroupBadge } from "@/components/GroupFilter";
import { AvailabilityStrip } from "@/components/charts/AvailabilityStrip";
import { LatencyAreaChart } from "@/components/charts/LatencyAreaChart";
import { ResultsDonut } from "@/components/charts/ResultsDonut";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { TargetDetails } from "@/types";
import { formatDateTime, formatLatency, formatPercent, formatTime } from "@/lib/format";
import { formatMuteRemaining, isMuted } from "@/lib/mute";
import { endpointLabel, formatDuration, probeLabel } from "@/lib/probe";
import { Badge } from "@/components/ui/badge";
import { peekCache, putCache } from "@/lib/queryCache";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function TargetDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [data, setData] = useState<TargetDetails | null>(() => (id ? peekCache<TargetDetails>(`target:${id}`) ?? null : null));

  async function load() {
    if (!id) return;
    try {
      const next = await api.getTargetDetails(id);
      putCache(`target:${id}`, next);
      setData(next);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    if (!id) return;
    setData(peekCache<TargetDetails>(`target:${id}`) ?? null);
    void load();
  }, [id, refreshKey]);

  if (!data) {
    return (
      <Page>
        <DetailsSkeleton />
      </Page>
    );
  }
  const t = data.target;
  const muted = isMuted(t.mutedUntil);
  const latencyData = (data.latencySeries ?? []).map((p) => ({
    time: formatTime(p.timestamp),
    latency: p.latency ?? 0,
    success: p.success ? 1 : 0,
  }));
  const availability = (data.availability?.length ? data.availability : data.latencySeries ?? []).map((p) => ({
    time: formatTime(p.timestamp),
    up: "up" in p ? p.up : p.success,
  }));

  async function toggleMute() {
    try {
      const updated = await api.muteTarget(t.id, muted ? 0 : 3600);
      setData((prev) => (prev ? { ...prev, target: updated } : prev));
      toast.success(updated.mutedUntil ? "This target is quiet for 1 hour" : "Target unmuted");
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  return (
    <Page>
      <PageHeader
        kicker="Target"
        title={t.name}
        description={
          <span className="block font-mono text-sm">{endpointLabel(t)}</span>
        }
      >
        <Button variant="outline" size="sm" onClick={() => navigate("/targets")}>
          ← Targets
        </Button>
        <Button variant={muted ? "secondary" : "outline"} size="sm" onClick={() => void toggleMute()}>
          {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {muted ? `Quiet ${formatMuteRemaining(t.mutedUntil)}` : "Mute 1 hour"}
        </Button>
        <StatusBadge status={t.lastStatus} />
      </PageHeader>
      <div className="flex flex-wrap items-center gap-1.5">
        <GroupBadge name={t.groupName} color={t.groupColor} />
        <Badge variant="outline">{probeLabel(t.probeType)}</Badge>
        {data.inMaintenance ? <Badge variant="warning">Maintenance</Badge> : null}
        {data.openIncident ? <Badge variant="danger">Open incident</Badge> : null}
      </div>
      {data.openIncident || data.inMaintenance ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.openIncident ? (
            <Card className="border-rose-500/25">
              <CardHeader>
                <CardTitle>Open incident</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{data.openIncident.summary || "Target is currently offline."}</p>
                <Row label="Started" value={formatDateTime(data.openIncident.startedAt)} />
                <Row label="Duration" value={formatDuration(data.openIncident.durationSeconds)} />
                <Row label="Failures" value={String(data.openIncident.failureCount)} />
                <Button variant="outline" size="sm" onClick={() => navigate("/incidents")}>
                  View incidents
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {data.inMaintenance && data.maintenanceWindow ? (
            <Card className="border-amber-500/25">
              <CardHeader>
                <CardTitle>Active maintenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{data.maintenanceWindow.name}</p>
                {data.maintenanceWindow.reason ? <p className="text-muted-foreground">{data.maintenanceWindow.reason}</p> : null}
                <Row label="Until" value={formatDateTime(data.maintenanceWindow.endsAt)} />
                <Button variant="outline" size="sm" onClick={() => navigate("/maintenance")}>
                  Manage windows
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
      <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <MetricCard label="Latency" value={formatLatency(data.metrics.currentLatency)} icon={Timer} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Average" value={formatLatency(data.metrics.averageLatency)} icon={Activity} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Range" value={`${formatLatency(data.metrics.minLatency)} / ${formatLatency(data.metrics.maxLatency)}`} icon={TrendingUp} />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Uptime" value={formatPercent(data.metrics.uptimePercent)} icon={Gauge} tone="success" />
        </StaggerItem>
      </Stagger>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Target information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Probe" value={probeLabel(t.probeType)} />
            <Row label="Endpoint" value={endpointLabel(t)} />
            {(t.probeType || "icmp") === "http" ? <Row label="Expect status" value={String(t.expectStatus || 200)} /> : null}
            <Row label="Interval" value={`${t.interval}s`} />
            <Row label="Timeout" value={`${t.timeout}s`} />
            <Row label="Retry" value={`${t.retryCount} × ${t.retryDelay}s`} />
            <Row label="Status" value={t.lastStatus} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Latency</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <LatencyAreaChart data={latencyData} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <AvailabilityStrip points={availability} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ping mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ResultsDonut successful={data.metrics.successful} failed={data.metrics.failed} uptimePercent={data.metrics.uptimePercent} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.recentEvents ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                data.recentEvents.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/40">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{e.type.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm">{e.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent ping results</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate(`/history?target=${t.id}`)}>
              Full history
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recentResults ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDateTime(r.timestamp)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.success ? "online" : "offline"} />
                    </TableCell>
                    <TableCell className="font-mono">{formatLatency(r.latencyMs)}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{r.error ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs">{value}</span>
    </div>
  );
}
