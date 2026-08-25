import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { useAppStore } from "@/stores/app";
import type { CreateMaintenanceInput, MaintenanceWindow, Target, TargetGroup } from "@/types";
import { formatDateTime } from "@/lib/format";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/probe";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

const SCOPE_ALL = "__all__";

export function MaintenancePage() {
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [items, setItems] = useState<MaintenanceWindow[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [groups, setGroups] = useState<TargetGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    scope: SCOPE_ALL,
    startsAt: toLocalInputValue(new Date().toISOString()),
    endsAt: toLocalInputValue(new Date(Date.now() + 2 * 3600_000).toISOString()),
    reason: "",
    suppressChecks: true,
    suppressNotifications: true,
    enabled: true,
  });

  async function load() {
    try {
      const [windows, list, g] = await Promise.all([api.listMaintenanceWindows(), api.getTargets(), api.listGroups()]);
      setItems(windows ?? []);
      setTargets(list ?? []);
      setGroups(g ?? []);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [refreshKey]);

  const activeCount = useMemo(() => items.filter((w) => w.active).length, [items]);

  async function create() {
    setBusy(true);
    try {
      const input: CreateMaintenanceInput = {
        name: form.name,
        startsAt: fromLocalInputValue(form.startsAt),
        endsAt: fromLocalInputValue(form.endsAt),
        reason: form.reason,
        suppressChecks: form.suppressChecks,
        suppressNotifications: form.suppressNotifications,
        enabled: form.enabled,
      };
      if (form.scope.startsWith("t:")) input.targetId = form.scope.slice(2);
      else if (form.scope.startsWith("g:")) input.groupId = form.scope.slice(2);
      await api.createMaintenanceWindow(input);
      toast.success("Maintenance window created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(wailsError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Pause checks or silence alerts for planned work.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Schedule window
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Windows</CardTitle>
            <CardDescription>{items.length} configured</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active now</CardTitle>
            <CardDescription>{activeCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Default behavior</CardTitle>
            <CardDescription>Skip probes and suppress notifications while a covering window is active.</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No maintenance windows yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      <div>{w.name}</div>
                      {w.reason ? <div className="text-xs text-muted-foreground">{w.reason}</div> : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {w.targetId ? w.targetName || "Target" : w.groupId ? `Group: ${w.groupName || w.groupId}` : "All targets"}
                    </TableCell>
                    <TableCell>{formatDateTime(w.startsAt)}</TableCell>
                    <TableCell>{formatDateTime(w.endsAt)}</TableCell>
                    <TableCell className="space-x-1">
                      {w.suppressChecks ? <Badge variant="secondary">Skip checks</Badge> : null}
                      {w.suppressNotifications ? <Badge variant="outline">Quiet alerts</Badge> : null}
                    </TableCell>
                    <TableCell>
                      {!w.enabled ? <Badge variant="muted">Disabled</Badge> : w.active ? <Badge variant="warning">Active</Badge> : <Badge variant="outline">Scheduled</Badge>}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          void api
                            .deleteMaintenanceWindow(w.id)
                            .then(() => {
                              toast.success("Window deleted");
                              return load();
                            })
                            .catch((err) => toast.error(wailsError(err)))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule maintenance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="DB failover window" />
            </div>
            <div className="grid gap-2">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(scope) => setForm({ ...form, scope })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SCOPE_ALL}>All targets</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={`g:${g.id}`}>
                      Group: {g.name}
                    </SelectItem>
                  ))}
                  {targets.map((t) => (
                    <SelectItem key={t.id} value={`t:${t.id}`}>
                      Target: {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Starts</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Ends</Label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional note" />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">Suppress checks</span>
              <Switch checked={form.suppressChecks} onCheckedChange={(suppressChecks) => setForm({ ...form, suppressChecks })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">Suppress notifications</span>
              <Switch checked={form.suppressNotifications} onCheckedChange={(suppressNotifications) => setForm({ ...form, suppressNotifications })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={busy || !form.name} onClick={() => void create()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
