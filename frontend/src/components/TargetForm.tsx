import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CreateTargetInput, Target } from "@/types";

const empty = {
  name: "",
  host: "",
  enabled: true,
  interval: 120,
  timeout: 5,
  retryCount: 3,
  retryDelay: 2,
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

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        host: initial.host,
        enabled: initial.enabled,
        interval: initial.interval,
        timeout: initial.timeout,
        retryCount: initial.retryCount,
        retryDelay: initial.retryDelay,
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit target" : "Add target"}</DialogTitle>
          <DialogDescription>ICMP checks run in the backend and never block the UI.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(form);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production API" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="host">IP / Hostname</Label>
            <Input id="host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="10.10.10.20" required />
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
