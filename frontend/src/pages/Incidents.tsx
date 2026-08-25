import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { Incident, IncidentReport, Target } from "@/types";
import { formatDateTime, formatPercent } from "@/lib/format";
import { formatDuration, fromLocalInputValue, probeLabel, toLocalInputValue } from "@/lib/probe";
import { Activity, AlertTriangle, Clock, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function IncidentsPage() {
  const navigate = useNavigate();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [targets, setTargets] = useState<Target[]>([]);
  const [page, setPage] = useState<{ items: Incident[]; total: number }>({ items: [], total: 0 });
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [status, setStatus] = useState("all");
  const [targetId, setTargetId] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(toLocalInputValue(new Date(Date.now() - 30 * 86400_000).toISOString()));
  const [to, setTo] = useState(toLocalInputValue(new Date().toISOString()));

  async function load() {
    try {
      const [list, incidents, rep] = await Promise.all([
        api.getTargets(),
        api.getIncidents({
          targetId: targetId === "all" ? "" : targetId,
          status: status === "all" ? "" : status,
          search,
          from: fromLocalInputValue(from),
          to: fromLocalInputValue(to),
          limit: 100,
        }),
        api.getIncidentReport(fromLocalInputValue(from), fromLocalInputValue(to)),
      ]);
      setTargets(list ?? []);
      setPage({ items: incidents.items ?? [], total: incidents.total ?? 0 });
      setReport(rep);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [refreshKey, status, targetId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <p className="text-sm text-muted-foreground">Outage lifecycle, downtime, and MTTR across your targets.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Incidents" value={report?.totalIncidents ?? 0} icon={Activity} />
        <MetricCard label="Open" value={report?.openIncidents ?? 0} icon={AlertTriangle} tone="danger" />
        <MetricCard label="Total downtime" value={formatDuration(report?.totalDowntimeSec ?? 0)} icon={Clock} tone="warning" />
        <MetricCard label="Average MTTR" value={formatDuration(report?.averageMttrSec ?? 0)} icon={TimerReset} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger>
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All targets</SelectItem>
              {targets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button onClick={() => void load()}>Apply</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By target</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Incidents</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Downtime</TableHead>
                  <TableHead>Uptime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.byTarget ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No outages in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  (report?.byTarget ?? []).map((row) => (
                    <TableRow key={row.targetId} className="cursor-pointer" onClick={() => navigate(`/targets/${row.targetId}`)}>
                      <TableCell>
                        <div className="font-medium">{row.targetName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{row.host}</div>
                      </TableCell>
                      <TableCell>{row.incidents}</TableCell>
                      <TableCell>{row.open}</TableCell>
                      <TableCell>{formatDuration(row.downtimeSec)}</TableCell>
                      <TableCell>{formatPercent(row.uptimePercent)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Incident list ({page.total})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Probe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((inc) => (
                  <TableRow key={inc.id} className="cursor-pointer" onClick={() => navigate(`/targets/${inc.targetId}`)}>
                    <TableCell>
                      <div className="font-medium">{inc.targetName}</div>
                      <div className="max-w-[180px] truncate text-xs text-muted-foreground">{inc.summary}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{probeLabel(inc.probeType)}</Badge>
                    </TableCell>
                    <TableCell>
                      {inc.status === "open" ? <Badge variant="danger">Open</Badge> : <Badge variant="success">Resolved</Badge>}
                    </TableCell>
                    <TableCell>{formatDateTime(inc.startedAt)}</TableCell>
                    <TableCell>{formatDuration(inc.durationSeconds)}</TableCell>
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
