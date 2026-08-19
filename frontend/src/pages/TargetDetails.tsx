import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { TargetDetails } from "@/types";
import { formatDateTime, formatLatency, formatPercent, formatTime } from "@/lib/format";
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
  const latencyData = (data.latencySeries ?? []).map((p) => ({
    time: formatTime(p.timestamp),
    latency: p.latency ?? 0,
    success: p.success ? 1 : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate("/targets")}>
            ← Targets
          </button>
          <h1 className="mt-1 text-2xl font-semibold">{t.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{t.host}</p>
        </div>
        <StatusBadge status={t.lastStatus} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Target information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
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
            <CardTitle>Latency over time</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Line type="monotone" dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Area type="step" dataKey="success" stroke="#34d399" fill="#34d39933" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ping success / failure</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Results", ok: data.metrics.successful, fail: data.metrics.failed }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" />
                <YAxis />
                <RTooltip />
                <Bar dataKey="ok" fill="#34d399" />
                <Bar dataKey="fail" fill="#fb7185" />
              </BarChart>
            </ResponsiveContainer>
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
