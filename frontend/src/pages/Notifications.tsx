import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/services/api";
import type { NotificationConfig, Settings } from "@/types";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

const emptyConfig = (provider: string): NotificationConfig => ({
  id: provider,
  provider,
  enabled: false,
  apiUrl: "",
  apiKey: "",
  apiKeySet: false,
  sender: "",
  recipient: "",
  httpMethod: "POST",
  customHeaders: {},
  bodyTemplate: "",
});

export function NotificationsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sms, setSms] = useState<NotificationConfig>(emptyConfig("sms"));
  const [webhook, setWebhook] = useState<NotificationConfig>(emptyConfig("webhook"));
  const [telegram, setTelegram] = useState<NotificationConfig>(emptyConfig("telegram"));
  const [smsKey, setSmsKey] = useState("");
  const [webhookKey, setWebhookKey] = useState("");
  const [telegramKey, setTelegramKey] = useState("");
  const [smsHeaders, setSmsHeaders] = useState("{}");
  const [webhookHeaders, setWebhookHeaders] = useState("{}");

  async function load() {
    try {
      const [s, smsCfg, hookCfg, tgCfg] = await Promise.all([
        api.getSettings(),
        api.getNotificationConfig("sms"),
        api.getNotificationConfig("webhook"),
        api.getNotificationConfig("telegram"),
      ]);
      setSettings(s);
      setSms(smsCfg);
      setWebhook(hookCfg);
      setTelegram(tgCfg);
      setSmsHeaders(JSON.stringify(smsCfg.customHeaders ?? {}, null, 2));
      setWebhookHeaders(JSON.stringify(hookCfg.customHeaders ?? {}, null, 2));
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings(next: Settings) {
    try {
      setSettings(await api.updateSettings(next));
      toast.success("Notification rules saved");
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function saveProvider(cfg: NotificationConfig, key: string, headersRaw: string) {
    try {
      const headers = JSON.parse(headersRaw || "{}") as Record<string, string>;
      const saved = await api.updateNotificationConfig({ ...cfg, apiKey: key, customHeaders: headers });
      if (cfg.provider === "sms") setSms(saved);
      else if (cfg.provider === "telegram") setTelegram(saved);
      else setWebhook(saved);
      toast.success(`${cfg.provider.toUpperCase()} settings saved`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function test(provider: string) {
    try {
      await api.testNotification(provider);
      toast.success(`Test ${provider} notification sent`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Choose when PingPulse should speak up, and how.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Enable providers independently. Secrets are stored locally and never shown again.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Toggle label="SMS (Melipayamak)" checked={settings.smsEnabled} onChange={(v) => void saveSettings({ ...settings, smsEnabled: v })} />
          <Toggle label="Telegram" checked={settings.telegramEnabled} onChange={(v) => void saveSettings({ ...settings, telegramEnabled: v })} />
          <Toggle label="Desktop" checked={settings.desktopNotificationEnabled} onChange={(v) => void saveSettings({ ...settings, desktopNotificationEnabled: v })} />
          <Toggle label="Webhook" checked={settings.webhookEnabled} onChange={(v) => void saveSettings({ ...settings, webhookEnabled: v })} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Toggle label="Target offline" checked={settings.notifyOnOffline} onChange={(v) => void saveSettings({ ...settings, notifyOnOffline: v })} />
          <Toggle label="Target recovery" checked={settings.notifyOnRecovery} onChange={(v) => void saveSettings({ ...settings, notifyOnRecovery: v })} />
          <Toggle label="High latency" checked={settings.notifyOnHighLatency} onChange={(v) => void saveSettings({ ...settings, notifyOnHighLatency: v })} />
          <Toggle label="Ping timeout" checked={settings.notifyOnTimeout} onChange={(v) => void saveSettings({ ...settings, notifyOnTimeout: v })} />
          <Field label="High latency threshold (ms)" type="number" value={settings.highLatencyThresholdMs} onChange={(v) => void saveSettings({ ...settings, highLatencyThresholdMs: Number(v) })} />
          <Field label="Cooldown (seconds)" type="number" value={settings.notificationCooldownSeconds} onChange={(v) => void saveSettings({ ...settings, notificationCooldownSeconds: Number(v) })} />
        </CardContent>
      </Card>
      <Tabs defaultValue="telegram">
        <TabsList>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="sms">Melipayamak SMS</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
        </TabsList>
        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle>Telegram bot</CardTitle>
              <CardDescription>
                Create a bot with BotFather, paste the token here, then send the bot a message and put that chat ID below. For a group, add the bot and use the group chat ID (often starts with -100).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2">
                <Label>Bot token</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={telegram.apiKeySet ? "••••••••  (set, hidden)" : "123456:ABC-token-from-BotFather"}
                  value={telegramKey}
                  onChange={(e) => setTelegramKey(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Chat ID</Label>
                <Input value={telegram.recipient} placeholder="123456789 or -1001234567890" onChange={(e) => setTelegram({ ...telegram, recipient: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Message template</Label>
                <Textarea rows={8} value={telegram.bodyTemplate} onChange={(e) => setTelegram({ ...telegram, bodyTemplate: e.target.value })} />
                <p className="text-xs text-muted-foreground">Placeholders: {"{{name}} {{host}} {{status}} {{failures}} {{latency}} {{lastSuccess}} {{time}}"}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => void test("telegram")}>
                  Send test
                </Button>
                <Button onClick={() => void saveProvider(telegram, telegramKey, "{}")}>Save Telegram</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sms">
          <ProviderForm
            title="Melipayamak SMS"
            description="When SMS is enabled, PingPulse POSTs JSON {from, to, text} to the Melipayamak console API. Store the token as the API key and keep {{apiKey}} in the URL."
            cfg={sms}
            setCfg={setSms}
            apiKey={smsKey}
            setApiKey={setSmsKey}
            headers={smsHeaders}
            setHeaders={setSmsHeaders}
            urlPlaceholder="https://console.melipayamak.com/api/send/simple/{{apiKey}}"
            senderLabel="Sender (from)"
            recipientLabel="Recipient (to)"
            onSave={() => saveProvider(sms, smsKey, smsHeaders)}
            onTest={() => test("sms")}
          />
        </TabsContent>
        <TabsContent value="webhook">
          <ProviderForm
            title="Webhook provider"
            description="Generic HTTP integration. Leave the API key blank to keep the stored secret."
            cfg={webhook}
            setCfg={setWebhook}
            apiKey={webhookKey}
            setApiKey={setWebhookKey}
            headers={webhookHeaders}
            setHeaders={setWebhookHeaders}
            onSave={() => saveProvider(webhook, webhookKey, webhookHeaders)}
            onTest={() => test("webhook")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, value, type, onChange }: { label: string; value: string | number; type?: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ProviderForm({
  title,
  description,
  cfg,
  setCfg,
  apiKey,
  setApiKey,
  headers,
  setHeaders,
  urlPlaceholder,
  senderLabel = "Sender",
  recipientLabel = "Recipient",
  onSave,
  onTest,
}: {
  title: string;
  description: string;
  cfg: NotificationConfig;
  setCfg: (c: NotificationConfig) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  headers: string;
  setHeaders: (v: string) => void;
  urlPlaceholder?: string;
  senderLabel?: string;
  recipientLabel?: string;
  onSave: () => void;
  onTest: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <Label>API URL</Label>
          <Input value={cfg.apiUrl} placeholder={urlPlaceholder} onChange={(e) => setCfg({ ...cfg, apiUrl: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>API key</Label>
          <Input type="password" autoComplete="new-password" placeholder={cfg.apiKeySet ? "••••••••  (set, hidden)" : "Enter API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={senderLabel} value={cfg.sender} onChange={(sender) => setCfg({ ...cfg, sender })} />
          <Field label={recipientLabel} value={cfg.recipient} onChange={(recipient) => setCfg({ ...cfg, recipient })} />
        </div>
        <Field label="HTTP method" value={cfg.httpMethod} onChange={(httpMethod) => setCfg({ ...cfg, httpMethod })} />
        <div className="grid gap-2">
          <Label>Custom headers (JSON)</Label>
          <Textarea value={headers} onChange={(e) => setHeaders(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Body template</Label>
          <Textarea rows={8} value={cfg.bodyTemplate} onChange={(e) => setCfg({ ...cfg, bodyTemplate: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onTest}>
            Send test
          </Button>
          <Button onClick={onSave}>Save provider</Button>
        </div>
      </CardContent>
    </Card>
  );
}
