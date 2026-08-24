import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Printer, ShieldCheck, AlertOctagon, CheckCircle2, Clock, Activity, RefreshCw } from "lucide-react";
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
      const rep = await api.getSlaReport(period, Number(slaTarget));
      setReport(rep);
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
    const headers = ["Target", "Group", "Host", "Actual Uptime %", "Target SLA %", "Downtime (sec)", "Error Budget Left %", "Status", "MTBF (hrs)", "MTTR (mins)", "Outages"];
    const rows = report.targets.map((t) => [
      `"${t.targetName}"`,
      `"${t.groupName}"`,
      `"${t.host}"`,
      t.uptimePercent,
      t.targetSlaPercent,
      t.actualDowntimeSec,
      `${t.errorBudgetRemainingPercent}%`,
      t.status,
      t.mtbfHours,
      t.mttrMinutes,
      t.outageCount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PingPulse_SLA_Report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("SLA Report CSV exported");
  }

  function exportJson() {
    if (!report) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `PingPulse_SLA_Report_${period}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("SLA Report JSON exported");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">SLA & Compliance Reports</h1>
          <p className="text-sm text-muted-foreground">
            Service level agreement tracking, error budget calculations, MTBF and MTTR metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>Filter evaluation timeframe and targeted SLA commitment level.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Evaluation Window</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days (Weekly Review)</SelectItem>
                <SelectItem value="30d">Last 30 Days (Monthly SLA)</SelectItem>
                <SelectItem value="90d">Last 90 Days (Quarterly Audit)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">SLA Commitment Target</label>
            <Select value={slaTarget} onValueChange={setSlaTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="99.0">99.0% (Two Nines - ~7.2h downtime/mo)</SelectItem>
                <SelectItem value="99.5">99.5% (~3.6h downtime/mo)</SelectItem>
                <SelectItem value="99.9">99.9% (Three Nines - ~43m downtime/mo)</SelectItem>
                <SelectItem value="99.99">99.99% (Four Nines - ~4.3m downtime/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={load} disabled={loading} className="w-full gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Calculations
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Overall Infrastructure Uptime"
          value={formatPercent(report?.overallUptime ?? 99.95)}
          icon={Activity}
          tone={(report?.overallUptime ?? 99.9) >= Number(slaTarget) ? "success" : "danger"}
        />
        <MetricCard
          label="Compliant Targets"
          value={`${report?.compliantCount ?? 0} / ${report?.targets.length ?? 0}`}
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          label="SLA Breaches"
          value={report?.breachedCount ?? 0}
          icon={AlertOctagon}
          tone={(report?.breachedCount ?? 0) > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="Consumed Error Budget"
          value={`${report?.consumedErrorBudgetHours ?? 0}h / ${report?.totalErrorBudgetHours ?? 1}h`}
          icon={Clock}
          tone={(report?.consumedErrorBudgetHours ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target Compliance Breakdown</CardTitle>
          <CardDescription>
            Detailed SLA availability, downtime consumption, Mean Time Between Failures (MTBF), and Mean Time To Recovery (MTTR).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Actual Uptime</TableHead>
                <TableHead>Target SLA</TableHead>
                <TableHead>Downtime</TableHead>
                <TableHead>Error Budget Left</TableHead>
                <TableHead>MTBF</TableHead>
                <TableHead>MTTR</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report?.targets ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No target data available for this range.
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
                    <TableCell className="font-mono font-semibold">
                      <span className={row.uptimePercent >= row.targetSlaPercent ? "text-emerald-400" : "text-rose-400"}>
                        {formatPercent(row.uptimePercent)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{formatPercent(row.targetSlaPercent)}</TableCell>
                    <TableCell className="font-mono">{formatDuration(row.actualDowntimeSec)}</TableCell>
                    <TableCell>
                      <div className="w-full bg-secondary rounded-full h-2 min-w-[60px] overflow-hidden">
                        <div
                          className={`h-full ${
                            row.errorBudgetRemainingPercent > 50
                              ? "bg-emerald-500"
                              : row.errorBudgetRemainingPercent > 20
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.max(5, row.errorBudgetRemainingPercent)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{row.errorBudgetRemainingPercent}%</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.mtbfHours} hrs</TableCell>
                    <TableCell className="font-mono text-xs">{row.mttrMinutes} min</TableCell>
                    <TableCell>
                      {row.status === "compliant" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Compliant</Badge>
                      ) : row.status === "warning" ? (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Budget Low</Badge>
                      ) : (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">Breached</Badge>
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
