import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GROUP_NONE } from "@/lib/groups";
import { api } from "@/services/api";
import type { CreateTargetInput, ProbeType, Target, TargetGroup } from "@/types";

const empty = {
  name: "",
  host: "",
  enabled: true,
  interval: 120,
  timeout: 5,
  retryCount: 3,
  retryDelay: 2,
  groupId: GROUP_NONE,
  probeType: "icmp" as ProbeType,
  httpUrl: "",
  httpMethod: "GET",
  expectStatus: 200,
  tcpPort: 443,
};

export function TargetForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Target | null;
  onSubmit: (input: CreateTargetInput) => Promise<void>;
  busy?: boolean;
}) {
  const [form, setForm] = useState(empty);
  const [groups, setGroups] = useState<TargetGroup[]>([]);

  useEffect(() => {
    if (!open) return;
    void api
      .listGroups()
      .then((list) => setGroups(list ?? []))
      .catch(() => setGroups([]));
    if (initial) {
      setForm({
        name: initial.name,
        host: initial.host,
        enabled: initial.enabled,
        interval: initial.interval,
        timeout: initial.timeout,
        retryCount: initial.retryCount,
        retryDelay: initial.retryDelay,
        groupId: initial.groupId || GROUP_NONE,
        probeType: (initial.probeType || "icmp") as ProbeType,
        httpUrl: initial.httpUrl || "",
        httpMethod: initial.httpMethod || "GET",
        expectStatus: initial.expectStatus || 200,
        tcpPort: initial.tcpPort || 443,
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  const probe = form.probeType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit target" : "Add target"}</DialogTitle>
          <DialogDescription>ICMP, HTTP, and TCP probes run in the backend and never block the UI.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({
              ...form,
              groupId: form.groupId === GROUP_NONE ? "" : form.groupId,
              host: probe === "http" ? form.host || form.httpUrl : form.host,
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production API" required />
          </div>
          <div className="grid gap-2">
            <Label>Probe type</Label>
            <Select value={form.probeType} onValueChange={(probeType) => setForm({ ...form, probeType: probeType as ProbeType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icmp">ICMP ping</SelectItem>
                <SelectItem value="http">HTTP(S) check</SelectItem>
                <SelectItem value="tcp">TCP port</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {probe === "http" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="httpUrl">URL</Label>
                <Input id="httpUrl" value={form.httpUrl} onChange={(e) => setForm({ ...form, httpUrl: e.target.value })} placeholder="https://api.example.com/health" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Method</Label>
                  <Select value={form.httpMethod} onValueChange={(httpMethod) => setForm({ ...form, httpMethod })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectStatus">Expected status</Label>
                  <Input id="expectStatus" type="number" min={100} max={599} value={form.expectStatus} onChange={(e) => setForm({ ...form, expectStatus: Number(e.target.value) })} />
                </div>
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="host">IP / Hostname</Label>
              <Input id="host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="10.10.10.20" required />
            </div>
          )}
          {probe === "tcp" ? (
            <div className="grid gap-2">
              <Label htmlFor="tcpPort">TCP port</Label>
              <Input id="tcpPort" type="number" min={1} max={65535} value={form.tcpPort} onChange={(e) => setForm({ ...form, tcpPort: Number(e.target.value) })} />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label>Group</Label>
            <Select value={form.groupId} onValueChange={(groupId) => setForm({ ...form, groupId })}>
              <SelectTrigger>
                <SelectValue placeholder="Ungrouped" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GROUP_NONE}>Ungrouped</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="interval">Interval (seconds)</Label>
              <Input id="interval" type="number" min={5} max={86400} value={form.interval} onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeout">Timeout (seconds)</Label>
              <Input id="timeout" type="number" min={1} max={60} value={form.timeout} onChange={(e) => setForm({ ...form, timeout: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="retry">Retry</Label>
              <Input id="retry" type="number" min={0} max={10} value={form.retryCount} onChange={(e) => setForm({ ...form, retryCount: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delay">Retry delay (seconds)</Label>
              <Input id="delay" type="number" min={0} max={60} value={form.retryDelay} onChange={(e) => setForm({ ...form, retryDelay: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">Include this target in the scheduler</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {initial ? "Save changes" : "Add target"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
