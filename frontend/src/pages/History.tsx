import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { HistoryPage, Target } from "@/types";
import { formatDateTime, formatLatency } from "@/lib/format";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function HistoryPage() {
  const [params] = useSearchParams();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [targets, setTargets] = useState<Target[]>([]);
  const [page, setPage] = useState<HistoryPage | null>(null);
  const [targetId, setTargetId] = useState(params.get("target") ?? "all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filter = useMemo(
    () => ({
      targetId: targetId === "all" ? "" : targetId,
      status: status === "all" ? "" : status,
      search,
      from: from ? new Date(from).toISOString() : "",
      to: to ? new Date(to).toISOString() : "",
      limit: 100,
      offset: 0,
    }),
    [targetId, status, search, from, to],
  );

  async function load() {
    try {
      const [list, history] = await Promise.all([api.getTargets(), api.getHistory(filter)]);
      setTargets(list ?? []);
      setPage(history);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [refreshKey, filter.targetId, filter.status, filter.from, filter.to]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-muted-foreground">Every stored ping result, filterable by host and outcome.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
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
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Search host, name, error" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button onClick={() => void load()}>Search</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(page?.items ?? []).map((item) => {
                const target = targets.find((t) => t.id === item.targetId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{formatDateTime(item.timestamp)}</TableCell>
                    <TableCell>{target?.name ?? item.targetId}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.success ? "online" : "offline"} />
                    </TableCell>
                    <TableCell className="font-mono">{formatLatency(item.latencyMs)}</TableCell>
                    <TableCell className="font-mono">{item.durationMs}ms</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">{item.error ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">{page?.total ?? 0} results</p>
        </CardContent>
      </Card>
    </div>
  );
}
