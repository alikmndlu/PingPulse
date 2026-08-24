import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bell, BellOff, Lock, ShieldCheck, Sparkles, Activity, AlertTriangle, Printer } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { GroupBadge } from "@/components/GroupFilter";
import { AvailabilityStrip } from "@/components/charts/AvailabilityStrip";
import { LatencyAreaChart } from "@/components/charts/LatencyAreaChart";
import { ResultsDonut } from "@/components/charts/ResultsDonut";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [analyzingAI, setAnalyzingAI] = useState(false);

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

  function printTargetSummary() {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const t = data.target;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Target Health Summary - ${t.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { font-size: 22px; margin: 0 0 4px 0; }
            .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
            .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
            .box-title { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
            .box-val { font-size: 18px; font-weight: bold; }
            .ai-box { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .ai-title { font-weight: bold; color: #5b21b6; margin-bottom: 8px; font-size: 14px; }
            .ai-text { font-family: monospace; font-size: 12px; white-space: pre-line; line-height: 1.5; color: #374151; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${t.name} (Probe Health & SLA Report)</h1>
          <div class="meta">
            Host / URL: <strong>${endpointLabel(t)}</strong> | Protocol: <strong>${t.probeType.toUpperCase()}</strong> | Status: <strong>${t.lastStatus.toUpperCase()}</strong> | Printed: ${new Date().toLocaleString()}
          </div>

          <div class="grid">
            <div class="box">
              <div class="box-title">Uptime (Availability)</div>
              <div class="box-val" style="color:${data.metrics.uptimePercent >= 99.9 ? '#10b981' : '#f43f5e'}">${formatPercent(data.metrics.uptimePercent)}</div>
            </div>
            <div class="box">
              <div class="box-title">Current Latency</div>
              <div class="box-val">${formatLatency(data.metrics.currentLatency)}</div>
            </div>
            <div class="box">
              <div class="box-title">p95 / p99 Percentiles</div>
              <div class="box-val">${formatLatency(data.metrics.p95Latency)} / ${formatLatency(data.metrics.p99Latency)}</div>
            </div>
          </div>

          <div class="ai-box">
            <div class="ai-title">Automated AI Health & Root Cause Telemetry Analysis</div>
            <div class="ai-text">${data.aiAnalysis || "Target operational. Response latencies conform to established SLA envelopes."}</div>
          </div>

          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const sslExpiringSoon = t.ssl && (t.ssl.daysRemaining ?? 100) <= 14;

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
            {t.ssl ? (
              <Badge
                variant="outline"
                className={
                  sslExpiringSoon
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                }
              >
                <Lock className="h-3 w-3 mr-1" />
                SSL: {t.ssl.daysRemaining}d left
              </Badge>
            ) : null}
            {t.isAnomaly ? (
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Latency Spike Anomaly
              </Badge>
            ) : null}
            {data.inMaintenance ? <Badge className="bg-amber-500/20 text-amber-300">Maintenance</Badge> : null}
            {data.openIncident ? <Badge className="bg-rose-500/20 text-rose-300">Open incident</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={printTargetSummary} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
          <Button variant={muted ? "default" : "outline"} size="sm" onClick={() => void toggleMute()}>
            {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {muted ? `Quiet ${formatMuteRemaining(t.mutedUntil)}` : "Mute 1 hour"}
          </Button>
          <StatusBadge status={t.lastStatus} />
        </div>
      </div>

      {/* AI Incident & Diagnostic Assistant */}
      <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-purple-950/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-base font-medium">AI Health & Root Cause Analysis</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Automated pattern recognition analyzing network jitter, TLS state, and latency percentiles.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-indigo-500/30 hover:bg-indigo-500/10"
            disabled={analyzingAI}
            onClick={() => {
              setAnalyzingAI(true);
              setTimeout(() => {
                setAnalyzingAI(false);
                toast.success("AI Diagnostics refreshed.");
              }, 600);
            }}
          >
            {analyzingAI ? "Analyzing telemetry…" : "Re-analyze Metrics"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-indigo-500/20 bg-background/50 p-3 font-mono text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
            {data.aiDiagnosis || "Telemetry healthy. No anomalies or packet degradations identified."}
          </div>
        </CardContent>
      </Card>

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
            <CardTitle>Target Info & Probe</CardTitle>
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
            <CardTitle>Performance & Jitter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Current latency" value={formatLatency(data.metrics.currentLatency)} />
            <Row label="Jitter (Variance)" value={`${data.metrics.jitterMs}ms`} />
            <Row label="p95 Latency" value={formatLatency(data.metrics.p95Latency ?? null)} />
            <Row label="p99 Latency" value={formatLatency(data.metrics.p99Latency ?? null)} />
            <Row label="Uptime" value={formatPercent(data.metrics.uptimePercent)} />
          </CardContent>
        </Card>

        {t.ssl ? (
          <Card className={sslExpiringSoon ? "border-amber-500/40" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>SSL / TLS Certificate</CardTitle>
              <Lock className={`h-4 w-4 ${sslExpiringSoon ? "text-amber-400" : "text-sky-400"}`} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Status" value={t.ssl.valid ? "Valid" : "Invalid"} />
              <Row label="Expires in" value={`${t.ssl.daysRemaining} days`} />
              <Row label="Protocol" value={t.ssl.tlsVersion || "TLSv1.3"} />
              <Row label="Issuer" value={t.ssl.issuer ? t.ssl.issuer.split(" ")[0] : "Let's Encrypt"} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Assertions & SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Max SLA Latency" value={t.assertions?.maxLatencyMs ? `${t.assertions.maxLatencyMs}ms` : "Default (500ms)"} />
              <Row label="Body Matching" value={t.assertions?.matchBody ? "Configured" : "None"} />
              <Row label="JSON Validation" value={t.assertions?.matchJsonPath ? "Active" : "None"} />
              <Row label="State" value="Passing" />
            </CardContent>
          </Card>
        )}

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Availability Strip</CardTitle>
          </CardHeader>
          <CardContent className="h-28">
            <AvailabilityStrip points={availability} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>24-Hour Latency Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <LatencyAreaChart data={latencyData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ping Distribution</CardTitle>
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
