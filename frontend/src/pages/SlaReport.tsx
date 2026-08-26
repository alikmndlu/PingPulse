import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Printer, AlertOctagon, CheckCircle2, Clock, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/MetricCard";
import { api } from "@/services/api";
import type { SlaReport } from "@/types";
import { formatDuration } from "@/lib/probe";
import { formatPercent } from "@/lib/format";
import { downloadText, printHtml } from "@/lib/reportExport";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function SlaReportPage() {
  const [period, setPeriod] = useState("30d");
  const [slaTarget, setSlaTarget] = useState("99.9");
  const [report, setReport] = useState<SlaReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setReport(await api.getSlaReport(period, Number(slaTarget)));
    } catch (err) {
      toast.error(wailsError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [period, slaTarget]);

  function exportCsv() {
    if (!report) return;
    const headers = ["Target", "Group", "Host", "Uptime %", "SLA %", "Downtime sec", "Budget left %", "Status", "MTBF hours", "MTTR minutes", "Outages"];
    const rows = report.targets.map((t) =>
      [csv(t.targetName), csv(t.groupName), csv(t.host), t.uptimePercent, t.targetSlaPercent, t.actualDowntimeSec, t.errorBudgetRemainingPercent, t.status, t.mtbfHours, t.mttrMinutes, t.outageCount].join(","),
    );
    downloadText(`PingPulse_SLA_${period}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv");
    toast.success("SLA report CSV exported");
  }

  function exportJson() {
    if (!report) return;
    downloadText(`PingPulse_SLA_${period}.json`, JSON.stringify(report, null, 2), "application/json");
    toast.success("SLA report JSON exported");
  }

  function printReport() {
    if (!report) return;
    const rows = report.targets
      .map(
        (t) => `<tr>
          <td><strong>${escapeHtml(t.targetName)}</strong><br><small>${escapeHtml(t.host)}</small></td>
          <td>${escapeHtml(t.groupName)}</td>
          <td class="${t.uptimePercent >= t.targetSlaPercent ? "ok" : "bad"}">${t.uptimePercent}%</td>
          <td>${t.targetSlaPercent}%</td>
          <td>${formatDuration(t.actualDowntimeSec)}</td>
          <td>${t.errorBudgetRemainingPercent}%</td>
          <td>${t.mtbfHours} h</td>
          <td>${t.mttrMinutes} min</td>
          <td>${escapeHtml(t.status)}</td>
        </tr>`,
      )
      .join("");
    printHtml(
      `PingPulse SLA ${report.period}`,
      `<h1>PingPulse SLA report</h1>
       <div class="meta">Period ${escapeHtml(report.period)} · Target ${report.slaTarget}% · Generated ${new Date().toLocaleString()}</div>
       <p>Overall uptime <strong>${report.overallUptime}%</strong> · Compliant ${report.compliantCount} · Breached ${report.breachedCount} · Error budget ${report.consumedErrorBudgetHours}h / ${report.totalErrorBudgetHours}h</p>
       <table><thead><tr><th>Target</th><th>Group</th><th>Uptime</th><th>SLA</th><th>Outage</th><th>Budget left</th><th>MTBF</th><th>MTTR</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SLA reports</h1>
          <p className="text-sm text-muted-foreground">Uptime against a chosen SLA, error budget, MTBF, and MTTR from recorded incidents.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!report}>
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson} disabled={!report}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={printReport} disabled={!report}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Parameters</CardTitle>
          <CardDescription>Window and SLA commitment used for the error-budget math.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={slaTarget} onValueChange={setSlaTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="99">99.0%</SelectItem>
              <SelectItem value="99.5">99.5%</SelectItem>
              <SelectItem value="99.9">99.9%</SelectItem>
              <SelectItem value="99.99">99.99%</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Overall uptime" value={formatPercent(report?.overallUptime ?? 0)} icon={Activity} tone={(report?.overallUptime ?? 0) >= Number(slaTarget) ? "success" : "danger"} />
        <MetricCard label="Compliant" value={`${report?.compliantCount ?? 0} / ${report?.targets.length ?? 0}`} icon={CheckCircle2} tone="success" />
        <MetricCard label="SLA breaches" value={report?.breachedCount ?? 0} icon={AlertOctagon} tone={(report?.breachedCount ?? 0) > 0 ? "danger" : "default"} />
        <MetricCard label="Error budget used" value={`${report?.consumedErrorBudgetHours ?? 0}h / ${report?.totalErrorBudgetHours ?? 0}h`} icon={Clock} tone={(report?.consumedErrorBudgetHours ?? 0) > 0 ? "warning" : "default"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>By target</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Downtime</TableHead>
                <TableHead>Budget left</TableHead>
                <TableHead>MTBF</TableHead>
                <TableHead>MTTR</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report?.targets ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No targets yet.
                  </TableCell>
                </TableRow>
              ) : (
                (report?.targets ?? []).map((row) => (
                  <TableRow key={row.targetId}>
                    <TableCell>
                      <div className="font-medium">{row.targetName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.host}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.groupName}</TableCell>
                    <TableCell className={row.uptimePercent >= row.targetSlaPercent ? "font-mono text-emerald-400" : "font-mono text-rose-400"}>{formatPercent(row.uptimePercent)}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{formatPercent(row.targetSlaPercent)}</TableCell>
                    <TableCell className="font-mono">{formatDuration(row.actualDowntimeSec)}</TableCell>
                    <TableCell>
                      <div className="h-2 min-w-[60px] overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full ${row.errorBudgetRemainingPercent > 50 ? "bg-emerald-500" : row.errorBudgetRemainingPercent > 20 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${Math.max(4, Math.min(100, row.errorBudgetRemainingPercent))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{row.errorBudgetRemainingPercent}%</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.mtbfHours} h</TableCell>
                    <TableCell className="font-mono text-xs">{row.mttrMinutes} min</TableCell>
                    <TableCell>
                      {row.status === "compliant" ? (
                        <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-300">Compliant</Badge>
                      ) : row.status === "warning" ? (
                        <Badge className="border-amber-500/30 bg-amber-500/20 text-amber-300">Budget low</Badge>
                      ) : (
                        <Badge className="border-rose-500/30 bg-rose-500/20 text-rose-300">Breached</Badge>
                      )}
                    </TableCell>
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

function csv(v: string) {
  return `"${(v ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(v: string) {
  return (v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}