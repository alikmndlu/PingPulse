import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Clock, Server, Signal, WifiOff } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { DashboardStats, Target } from "@/types";
import { formatLatency, formatPercent, formatRelative, formatTime } from "@/lib/format";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function DashboardPage() {
  const navigate = useNavigate();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const setMonitoring = useAppStore((s) => s.setMonitoring);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);

  async function load() {
    try {
      const [s, list] = await Promise.all([api.getDashboardStats(), api.getTargets()]);
      setStats(s);
      setTargets(list ?? []);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live view of every host PingPulse is watching.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Targets" value={stats?.totalTargets ?? 0} icon={Server} />
        <MetricCard label="Online" value={stats?.online ?? 0} icon={Signal} tone="success" />
        <MetricCard label="Offline" value={stats?.offline ?? 0} icon={WifiOff} tone="danger" />
        <MetricCard label="Unknown" value={stats?.unknown ?? 0} icon={Activity} tone="warning" />
        <MetricCard label="With errors" value={stats?.errorCount ?? 0} icon={AlertTriangle} tone="danger" />
        <MetricCard
          label="Uptime"
          value={formatPercent(stats?.uptimePercent)}
          icon={Clock}
          hint={`Last ${formatTime(stats?.lastCheck)} · Next ${formatTime(stats?.nextCheck)}`}
        />
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
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Last success</TableHead>
                <TableHead>Last failure</TableHead>
                <TableHead>Consecutive failures</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No targets yet. Add a host to start monitoring.
                  </TableCell>
                </TableRow>
              ) : (
                targets.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/targets/${t.id}`)}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.host}</TableCell>
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
