import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bell, BellOff } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { GroupBadge } from "@/components/GroupFilter";
import { AvailabilityStrip } from "@/components/charts/AvailabilityStrip";
import { LatencyAreaChart } from "@/components/charts/LatencyAreaChart";
import { ResultsDonut } from "@/components/charts/ResultsDonut";
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
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function TargetDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [data, setData] = useState<TargetDetails | null>(null);

  async function load() {
    if (!id) return;
    try {
      setData(await api.getTargetDetails(id));
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [id, refreshKey]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading target…</p>;
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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate("/targets")}>
            ← Targets
          </button>
          <h1 className="mt-1 text-2xl font-semibold">{t.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{endpointLabel(t)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <GroupBadge name={t.groupName} color={t.groupColor} />
            <Badge variant="outline">{probeLabel(t.probeType)}</Badge>
            {data.inMaintenance ? <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/20">Maintenance</Badge> : null}
            {data.openIncident ? <Badge className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/20">Open incident</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={muted ? "default" : "outline"} size="sm" onClick={() => void toggleMute()}>
            {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {muted ? `Quiet ${formatMuteRemaining(t.mutedUntil)}` : "Mute 1 hour"}
          </Button>
          <StatusBadge status={t.lastStatus} />
        </div>
      </div>
      {data.openIncident || data.inMaintenance ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.openIncident ? (
            <Card className="border-rose-500/30">
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
            <Card className="border-amber-500/30">
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
        <Card>
          <CardHeader>
            <CardTitle>Current metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Current latency" value={formatLatency(data.metrics.currentLatency)} />
            <Row label="Average" value={formatLatency(data.metrics.averageLatency)} />
            <Row label="Min / Max" value={`${formatLatency(data.metrics.minLatency)} / ${formatLatency(data.metrics.maxLatency)}`} />
            <Row label="Uptime" value={formatPercent(data.metrics.uptimePercent)} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
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
                  <div key={e.id} className="rounded-md border border-border/70 p-3">
                    <p className="text-xs uppercase text-muted-foreground">{e.type.replaceAll("_", " ")}</p>
                    <p className="text-sm">{e.message}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
