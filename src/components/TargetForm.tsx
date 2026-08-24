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
import type { CreateTargetInput, ProbeType, Target, TargetGroup, SyntheticStep } from "@/types";
import { Lock, Zap, Sliders, Layers, RefreshCcw, Network } from "lucide-react";

const empty = {
  name: "",
  host: "",
  enabled: true,
  interval: 10,
  timeout: 5,
  retryCount: 2,
  retryDelay: 1,
  groupId: GROUP_NONE,
  probeType: "icmp" as ProbeType,
  httpUrl: "",
  httpMethod: "GET",
  expectStatus: 200,
  tcpPort: 443,
  sslEnabled: true,
  sslAlertDays: 14,
  matchBody: "",
  matchJsonPath: "",
  matchJsonValue: "",
  maxLatencyMs: 500,
  customHeadersRaw: "",
  dnsRecordType: "A" as "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS",
  dnsExpectedValue: "",
  dnsNameserver: "1.1.1.1",
  autoHealingEnabled: false,
  autoHealingWebhook: "",
  heartbeatIntervalSec: 3600,
  syntheticStepUrl1: "",
  syntheticStepMethod1: "POST" as const,
  syntheticStepBody1: "",
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
  const [tab, setTab] = useState<"general" | "assertions" | "synthetic" | "ssl">("general");

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
        dnsRecordType: initial.dnsConfig?.recordType || "A",
        dnsExpectedValue: initial.dnsConfig?.expectedValue || "",
        dnsNameserver: initial.dnsConfig?.nameserver || "1.1.1.1",
        autoHealingEnabled: initial.autoHealing?.enabled || false,
        autoHealingWebhook: initial.autoHealing?.webhookUrl || "",
        heartbeatIntervalSec: initial.heartbeatIntervalSec || 3600,
        syntheticStepUrl1: initial.syntheticSteps?.[0]?.url || "",
        syntheticStepMethod1: initial.syntheticSteps?.[0]?.method || "POST",
        syntheticStepBody1: initial.syntheticSteps?.[0]?.body || "",
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  const probe = form.probeType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Prober Target" : "Add Prober Target"}</DialogTitle>
          <DialogDescription>
            Configure ICMP, HTTP/S, DNS, WebSockets, Dead Man Snitch or Multi-step Synthetic Probes.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(t) => setTab(t as any)} className="w-full">
          <TabsList className="grid grid-cols-4 mb-3">
            <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" />
              Probe & Protocol
            </TabsTrigger>
            <TabsTrigger value="assertions" className="flex items-center gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              Assertions & SLA
            </TabsTrigger>
            <TabsTrigger value="synthetic" className="flex items-center gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" />
              Synthetic & Healing
            </TabsTrigger>
            <TabsTrigger value="ssl" className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" />
              SSL & DNS
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
                  // Ignore
                }
              }

              const syntheticSteps: SyntheticStep[] | undefined = form.syntheticStepUrl1
                ? [
                    {
                      id: "step-1",
                      name: "Step 1: Auth & Handshake",
                      method: form.syntheticStepMethod1,
                      url: form.syntheticStepUrl1,
                      body: form.syntheticStepBody1,
                      expectedStatus: 200,
                    },
                  ]
                : undefined;

              await onSubmit({
                ...form,
                groupId: form.groupId === GROUP_NONE ? "" : form.groupId,
                host:
                  probe === "http"
                    ? form.host || (form.httpUrl ? new URL(form.httpUrl).hostname : form.host)
                    : form.host,
                customHeaders: parsedHeaders,
                syntheticSteps,
              });
            }}
          >
            {/* General Tab */}
            <TabsContent value="general" className="space-y-3 m-0">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-medium">Friendly Target Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Production Checkout API Gateway"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Probe Protocol</Label>
                  <Select
                    value={form.probeType}
                    onValueChange={(val) => setForm({ ...form, probeType: val as ProbeType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icmp">ICMP Ping (Network Layer 3)</SelectItem>
                      <SelectItem value="http">HTTP / HTTPS Endpoint (Layer 7)</SelectItem>
                      <SelectItem value="tcp">TCP Socket Port (Layer 4)</SelectItem>
                      <SelectItem value="websocket">WebSocket Stream (ws:// / wss://)</SelectItem>
                      <SelectItem value="dns">DNS Record Query</SelectItem>
                      <SelectItem value="heartbeat">Dead Man's Snitch (Cron Heartbeat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Infrastructure Group</Label>
                  <Select
                    value={form.groupId}
                    onValueChange={(val) => setForm({ ...form, groupId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GROUP_NONE}>No Group (General)</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                            {g.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {probe === "http" || probe === "websocket" ? (
                <div className="grid gap-2">
                  <Label htmlFor="httpUrl" className="text-xs font-medium">
                    {probe === "http" ? "Target HTTP/HTTPS URL" : "WebSocket Endpoint URL"}
                  </Label>
                  <Input
                    id="httpUrl"
                    value={form.httpUrl}
                    onChange={(e) => setForm({ ...form, httpUrl: e.target.value })}
                    placeholder={probe === "http" ? "https://api.example.com/healthz" : "wss://stream.example.com/v1"}
                    required
                  />
                </div>
              ) : probe === "heartbeat" ? (
                <div className="p-3 bg-muted/30 border rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-sky-400">Dead Man's Snitch Mode</p>
                  <p className="text-muted-foreground">
                    PingPulse creates a unique incoming webhook token. If your background cron worker stops calling the signal within the defined window, an incident alert is raised.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="host" className="text-xs font-medium">Destination Hostname or IP</Label>
                  <Input
                    id="host"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="1.1.1.1 or db.internal.net"
                    required
                  />
                </div>
              )}

              {probe === "tcp" && (
                <div className="grid gap-2">
                  <Label htmlFor="tcpPort" className="text-xs font-medium">TCP Port</Label>
                  <Input
                    id="tcpPort"
                    type="number"
                    value={form.tcpPort}
                    onChange={(e) => setForm({ ...form, tcpPort: Number(e.target.value) })}
                    placeholder="443"
                  />
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Interval (s)</Label>
                  <Input
                    type="number"
                    min={2}
                    value={form.interval}
                    onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Timeout (s)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.timeout}
                    onChange={(e) => setForm({ ...form, timeout: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Retries</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.retryCount}
                    onChange={(e) => setForm({ ...form, retryCount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Retry Delay (s)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.retryDelay}
                    onChange={(e) => setForm({ ...form, retryDelay: Number(e.target.value) })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Assertions & SLA Tab */}
            <TabsContent value="assertions" className="space-y-3 m-0">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Max Allowed SLA Latency (ms)</Label>
                <Input
                  type="number"
                  value={form.maxLatencyMs}
                  onChange={(e) => setForm({ ...form, maxLatencyMs: Number(e.target.value) })}
                  placeholder="300"
                />
                <p className="text-[11px] text-muted-foreground">
                  Responses taking longer than this threshold mark target status as <em>Degraded</em>.
                </p>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-medium">Body Keyword / Regex Assertion</Label>
                <Input
                  value={form.matchBody}
                  onChange={(e) => setForm({ ...form, matchBody: e.target.value })}
                  placeholder="e.g. status: OK or Database Connected"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">JSON Path</Label>
                  <Input
                    value={form.matchJsonPath}
                    onChange={(e) => setForm({ ...form, matchJsonPath: e.target.value })}
                    placeholder="data.health or status"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Expected Value</Label>
                  <Input
                    value={form.matchJsonValue}
                    onChange={(e) => setForm({ ...form, matchJsonValue: e.target.value })}
                    placeholder="ok or true"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-medium">Custom HTTP Headers (JSON)</Label>
                <Input
                  value={form.customHeadersRaw}
                  onChange={(e) => setForm({ ...form, customHeadersRaw: e.target.value })}
                  placeholder='{"Authorization": "Bearer xxxx", "X-Ping-Token": "secret"}'
                />
              </div>
            </TabsContent>

            {/* Synthetic & Self-Healing Tab */}
            <TabsContent value="synthetic" className="space-y-3 m-0">
              <div className="p-3 bg-muted/20 border border-border/70 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4 text-emerald-400" />
                    <Label className="text-xs font-semibold">Automated Self-Healing Webhook</Label>
                  </div>
                  <Switch
                    checked={form.autoHealingEnabled}
                    onCheckedChange={(checked) => setForm({ ...form, autoHealingEnabled: checked })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Trigger an automated remediation webhook (e.g. Docker container restart, Kubernetes Pod bounce, or cloud function) upon consecutive outages.
                </p>
                {form.autoHealingEnabled && (
                  <div className="grid gap-2 pt-2">
                    <Label className="text-[11px]">Remediation Webhook URL</Label>
                    <Input
                      value={form.autoHealingWebhook}
                      onChange={(e) => setForm({ ...form, autoHealingWebhook: e.target.value })}
                      placeholder="https://ops.example.com/api/v1/auto-heal/restart-pod"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-muted/20 border border-border/70 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-400" />
                  <Label className="text-xs font-semibold">Synthetic Flow Step 1 (Optional E2E)</Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      value={form.syntheticStepUrl1}
                      onChange={(e) => setForm({ ...form, syntheticStepUrl1: e.target.value })}
                      placeholder="https://api.example.com/v1/auth/token"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Select
                      value={form.syntheticStepMethod1}
                      onValueChange={(val: any) => setForm({ ...form, syntheticStepMethod1: val })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* SSL & DNS Tab */}
            <TabsContent value="ssl" className="space-y-3 m-0">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">SSL / TLS Expiration Monitoring</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Inspect certificate chains and alert prior to expiration.
                  </p>
                </div>
                <Switch
                  checked={form.sslEnabled}
                  onCheckedChange={(checked) => setForm({ ...form, sslEnabled: checked })}
                />
              </div>

              {probe === "dns" && (
                <div className="p-3 bg-muted/20 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-sky-400" />
                    <Label className="text-xs font-semibold">DNS Record Assertions</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Record Type</Label>
                      <Select
                        value={form.dnsRecordType}
                        onValueChange={(val: any) => setForm({ ...form, dnsRecordType: val })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A (IPv4)</SelectItem>
                          <SelectItem value="AAAA">AAAA (IPv6)</SelectItem>
                          <SelectItem value="CNAME">CNAME</SelectItem>
                          <SelectItem value="MX">MX</SelectItem>
                          <SelectItem value="TXT">TXT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px]">Expected IP / Host</Label>
                      <Input
                        value={form.dnsExpectedValue}
                        onChange={(e) => setForm({ ...form, dnsExpectedValue: e.target.value })}
                        placeholder="104.21.5.12"
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {initial ? "Save Changes" : "Create Target"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
