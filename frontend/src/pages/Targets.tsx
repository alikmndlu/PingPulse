import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Plus, Upload } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { TargetForm } from "@/components/TargetForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { CreateTargetInput, Target } from "@/types";
import { formatLatency, formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function TargetsPage() {
  const navigate = useNavigate();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [targets, setTargets] = useState<Target[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState("json");

  async function load() {
    try {
      setTargets((await api.getTargets()) ?? []);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [refreshKey]);

  async function save(input: CreateTargetInput) {
    setBusy(true);
    try {
      if (editing) await api.updateTarget(editing.id, input);
      else await api.createTarget(input);
      toast.success(editing ? "Target updated" : "Target added");
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(wailsError(err));
    } finally {
      setBusy(false);
    }
  }

  async function testPing(t: Target) {
    try {
      const res = await api.testPing(t.host, t.timeout);
      if (res.success) toast.success(`${t.host} replied in ${res.latencyMs}ms`);
      else toast.error(res.error || `Unable to ping ${t.host}`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function exportList(format: string) {
    try {
      const data = await api.exportTargets(format);
      await navigator.clipboard.writeText(data);
      toast.success(`Exported ${format.toUpperCase()} copied to clipboard`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function runImport() {
    try {
      const res = await api.importTargets(importText, importFormat);
      toast.success(`Imported ${res.created} created, ${res.updated} updated, ${res.skipped} skipped`);
      if (res.errors?.length) toast.message(res.errors.slice(0, 3).join("\n"));
      setImportOpen(false);
      await load();
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Targets</h1>
          <p className="text-sm text-muted-foreground">Hosts PingPulse will probe on a schedule.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={() => void exportList("json")}>
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => void exportList("csv")}>
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add target
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{targets.length} configured</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Last check</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="cursor-pointer font-medium" onClick={() => navigate(`/targets/${t.id}`)}>
                    {t.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.host}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.lastStatus} />
                  </TableCell>
                  <TableCell className="font-mono">{formatLatency(t.lastLatency)}</TableCell>
                  <TableCell>{t.interval}s</TableCell>
                  <TableCell>{formatRelative(t.lastCheckedAt)}</TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/targets/${t.id}`)}>View details</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(t);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void testPing(t)}>Test ping</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void api.setTargetEnabled(t.id, !t.enabled).then(load)}>
                          {t.enabled ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-400"
                          onClick={() =>
                            void api
                              .deleteTarget(t.id)
                              .then(() => {
                                toast.success("Target deleted");
                                return load();
                              })
                              .catch((err) => toast.error(wailsError(err)))
                          }
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <TargetForm open={open} onOpenChange={setOpen} initial={editing} onSubmit={save} busy={busy} />
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import targets</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant={importFormat === "json" ? "default" : "outline"} size="sm" onClick={() => setImportFormat("json")}>
              JSON
            </Button>
            <Button variant={importFormat === "csv" ? "default" : "outline"} size="sm" onClick={() => setImportFormat("csv")}>
              CSV
            </Button>
          </div>
          <Textarea rows={10} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={importFormat === "json" ? '[{"name":"API","host":"10.10.10.20"}]' : "name,host,enabled,interval,timeout,retryCount,retryDelay"} />
          <div className="flex justify-end">
            <Button onClick={() => void runImport()}>Import</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
