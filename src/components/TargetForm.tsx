import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GROUP_NONE } from "@/lib/groups";
import { api } from "@/services/api";
import type { CreateTargetInput, ProbeType, Target, TargetGroup } from "@/types";
import { Lock, ShieldCheck, Zap, Sliders } from "lucide-react";

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
  // SSL & Assertions
  sslEnabled: true,
  sslAlertDays: 14,
  matchBody: "",
  matchJsonPath: "",
  matchJsonValue: "",
  maxLatencyMs: 500,
  customHeadersRaw: "",
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
  const [tab, setTab] = useState<"general" | "assertions" | "ssl">("general");

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
        sslEnabled: initial.ssl ? initial.ssl.enabled : true,
        sslAlertDays: initial.ssl?.alertThresholdDays || 14,
        matchBody: initial.assertions?.matchBody || "",
        matchJsonPath: initial.assertions?.matchJsonPath || "",
        matchJsonValue: initial.assertions?.matchJsonValue || "",
        maxLatencyMs: initial.assertions?.maxLatencyMs || 500,
        customHeadersRaw: initial.assertions?.customHeaders
          ? JSON.stringify(initial.assertions.customHeaders, null, 2)
          : "",
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
          <DialogDescription>
            Multi-protocol monitoring with SSL/TLS expiration checks and deep response assertions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(t) => setTab(t as any)} className="w-full">
          <TabsList className="grid grid-cols-3 mb-3">
            <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" />
              Probe & Timing
            </TabsTrigger>
            <TabsTrigger value="assertions" className="flex items-center gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              Assertions & SLA
            </TabsTrigger>
            <TabsTrigger value="ssl" className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" />
              SSL / TLS
            </TabsTrigger>
          </TabsList>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              let parsedHeaders: Record<string, string> | undefined = undefined;
              if (form.customHeadersRaw) {
                try {
                  parsedHeaders = JSON.parse(form.customHeadersRaw);
                } catch {
                  // Ignore parse error
                }
              }
              await onSubmit({
                ...form,
                groupId: form.groupId === GROUP_NONE ? "" : form.groupId,
                host: probe === "http" ? form.host || (form.httpUrl ? new URL(form.httpUrl).hostname : form.host) : form.host,
                customHeaders: parsedHeaders,
              });
            }}
          >
            <TabsContent value="general" className="space-y-3 m-0">
              <div className="grid gap-2">
                <Label htmlFor="name">Target Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Production API Gateway"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Probe Protocol</Label>
                <Select
                  value={form.probeType}
                  onValueChange={(probeType) => setForm({ ...form, probeType: probeType as ProbeType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icmp">ICMP Ping (Network Echo)</SelectItem>
                    <SelectItem value="http">HTTP(S) Endpoint Probe</SelectItem>
                    <SelectItem value="tcp">TCP Socket Port</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {probe === "http" ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="httpUrl">Endpoint URL</Label>
                    <Input
                      id="httpUrl"
                      value={form.httpUrl}
                      onChange={(e) => setForm({ ...form, httpUrl: e.target.value })}
                      placeholder="https://api.example.com/health"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>HTTP Method</Label>
                      <Select value={form.httpMethod} onValueChange={(httpMethod) => setForm({ ...form, httpMethod })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="expectStatus">Expected Status Code</Label>
                      <Input
                        id="expectStatus"
                        type="number"
                        min={100}
                        max={599}
                        value={form.expectStatus}
                        onChange={(e) => setForm({ ...form, expectStatus: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="host">IP Address or Hostname</Label>
                  <Input
                    id="host"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="1.1.1.1 or api.example.com"
                    required
                  />
                </div>
              )}

              {probe === "tcp" && (
                <div className="grid gap-2">
                  <Label htmlFor="tcpPort">TCP Port</Label>
                  <Input
                    id="tcpPort"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.tcpPort}
                    onChange={(e) => setForm({ ...form, tcpPort: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Group / Category</Label>
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
                <div className="grid gap-1.5">
                  <Label htmlFor="interval" className="text-xs">
                    Interval (sec)
                  </Label>
                  <Input
                    id="interval"
                    type="number"
                    min={5}
                    max={86400}
                    value={form.interval}
                    onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="timeout" className="text-xs">
                    Timeout (sec)
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1}
                    max={60}
                    value={form.timeout}
                    onChange={(e) => setForm({ ...form, timeout: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="retry" className="text-xs">
                    Retry Attempts
                  </Label>
                  <Input
                    id="retry"
                    type="number"
                    min={0}
                    max={10}
                    value={form.retryCount}
                    onChange={(e) => setForm({ ...form, retryCount: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="delay" className="text-xs">
                    Retry Delay (sec)
                  </Label>
                  <Input
                    id="delay"
                    type="number"
                    min={0}
                    max={60}
                    value={form.retryDelay}
                    onChange={(e) => setForm({ ...form, retryDelay: Number(e.target.value) })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assertions" className="space-y-3 m-0">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Deep Content Assertions
                </div>
                <p className="text-xs text-muted-foreground">
                  Validate that the target response contains correct business data before marking it healthy.
                </p>

                <div className="grid gap-2">
                  <Label htmlFor="matchBody" className="text-xs">
                    Response Body Contains (Keyword or Regex)
                  </Label>
                  <Input
                    id="matchBody"
                    value={form.matchBody}
                    onChange={(e) => setForm({ ...form, matchBody: e.target.value })}
                    placeholder="e.g. &quot;healthy&quot; or &quot;status&quot;: &quot;UP&quot;"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="matchJsonPath" className="text-xs">
                      JSON Key Path
                    </Label>
                    <Input
                      id="matchJsonPath"
                      value={form.matchJsonPath}
                      onChange={(e) => setForm({ ...form, matchJsonPath: e.target.value })}
                      placeholder="e.g. status or data.ok"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="matchJsonValue" className="text-xs">
                      Expected JSON Value
                    </Label>
                    <Input
                      id="matchJsonValue"
                      value={form.matchJsonValue}
                      onChange={(e) => setForm({ ...form, matchJsonValue: e.target.value })}
                      placeholder="e.g. true or ok"
                    />
                  </div>
                </div>

                <div className="grid gap-2 pt-1">
                  <Label htmlFor="maxLatencyMs" className="text-xs">
                    SLA Max Acceptable Latency (ms)
                  </Label>
                  <Input
                    id="maxLatencyMs"
                    type="number"
                    min={50}
                    max={10000}
                    value={form.maxLatencyMs}
                    onChange={(e) => setForm({ ...form, maxLatencyMs: Number(e.target.value) })}
                    placeholder="500"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    If latency exceeds this threshold, the target will be marked as degraded.
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ssl" className="space-y-3 m-0">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-sky-500" />
                    <div>
                      <p className="text-xs font-semibold">Track SSL / TLS Certificate</p>
                      <p className="text-[11px] text-muted-foreground">Alert before certificate expiry or validity failures</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.sslEnabled}
                    onCheckedChange={(sslEnabled) => setForm({ ...form, sslEnabled })}
                  />
                </div>

                {form.sslEnabled && (
                  <div className="grid gap-2 pt-2 border-t border-border/40">
                    <Label htmlFor="sslAlertDays" className="text-xs">
                      Expiration Warning Threshold (Days Before)
                    </Label>
                    <Input
                      id="sslAlertDays"
                      type="number"
                      min={1}
                      max={90}
                      value={form.sslAlertDays}
                      onChange={(e) => setForm({ ...form, sslAlertDays: Number(e.target.value) })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      An alert event will be broadcast when remaining validity is less than this value.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Monitoring Active</p>
                <p className="text-xs text-muted-foreground">Include this target in active polling</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {initial ? "Save changes" : "Add target"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
