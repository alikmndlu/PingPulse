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
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

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
  const [providers, setProviders] = useState<Record<string, NotificationConfig>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>({});

  const providerList = ["discord", "slack", "teams", "pagerduty", "webhook", "telegram", "sms"];

  async function load() {
    try {
      const s = await api.getSettings();
      setSettings(s);
      const confs: Record<string, NotificationConfig> = {};
      const hdrs: Record<string, string> = {};

      for (const p of providerList) {
        const cfg = await api.getNotificationConfig(p);
        confs[p] = cfg;
        hdrs[p] = JSON.stringify(cfg.customHeaders ?? {}, null, 2);
      }
      setProviders(confs);
      setHeaders(hdrs);
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

  async function saveProvider(provider: string) {
    try {
      const cfg = providers[provider];
      const key = keys[provider] || "";
      const parsedHeaders = JSON.parse(headers[provider] || "{}") as Record<string, string>;
      const saved = await api.updateNotificationConfig({ ...cfg, apiKey: key, customHeaders: parsedHeaders });
      setProviders((prev) => ({ ...prev, [provider]: saved }));
      toast.success(`${provider.toUpperCase()} integration saved`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function test(provider: string) {
    try {
      await api.testNotification(provider);
      toast.success(`Test alert broadcast to ${provider.toUpperCase()}`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications & Incident Alerting</h1>
        <p className="text-sm text-muted-foreground">
          Integrate Slack, Discord, Microsoft Teams, PagerDuty, Telegram, SMS, and custom Webhooks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enabled Channels</CardTitle>
          <CardDescription>Toggle which dispatchers should trigger on state changes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Toggle
            label="Discord Webhooks"
            checked={settings.discordEnabled ?? true}
            onChange={(v) => void saveSettings({ ...settings, discordEnabled: v })}
          />
          <Toggle
            label="Slack Channels"
            checked={settings.slackEnabled ?? true}
            onChange={(v) => void saveSettings({ ...settings, slackEnabled: v })}
          />
          <Toggle
            label="Microsoft Teams"
            checked={settings.teamsEnabled ?? false}
            onChange={(v) => void saveSettings({ ...settings, teamsEnabled: v })}
          />
          <Toggle
            label="PagerDuty Incident"
            checked={settings.pagerDutyEnabled ?? false}
            onChange={(v) => void saveSettings({ ...settings, pagerDutyEnabled: v })}
          />
          <Toggle
            label="Generic Webhooks"
            checked={settings.webhookEnabled}
            onChange={(v) => void saveSettings({ ...settings, webhookEnabled: v })}
          />
          <Toggle
            label="Telegram Bot"
            checked={settings.telegramEnabled}
            onChange={(v) => void saveSettings({ ...settings, telegramEnabled: v })}
          />
          <Toggle
            label="Desktop Banner"
            checked={settings.desktopNotificationEnabled}
            onChange={(v) => void saveSettings({ ...settings, desktopNotificationEnabled: v })}
          />
          <Toggle
            label="Melipayamak SMS"
            checked={settings.smsEnabled}
            onChange={(v) => void saveSettings({ ...settings, smsEnabled: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Conditions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Toggle
            label="Target goes offline / Unreachable"
            checked={settings.notifyOnOffline}
            onChange={(v) => void saveSettings({ ...settings, notifyOnOffline: v })}
          />
          <Toggle
            label="Target recovery confirmed"
            checked={settings.notifyOnRecovery}
            onChange={(v) => void saveSettings({ ...settings, notifyOnRecovery: v })}
          />
          <Toggle
            label="High latency warning"
            checked={settings.notifyOnHighLatency}
            onChange={(v) => void saveSettings({ ...settings, notifyOnHighLatency: v })}
          />
          <Toggle
            label="Probe timeout breached"
            checked={settings.notifyOnTimeout}
            onChange={(v) => void saveSettings({ ...settings, notifyOnTimeout: v })}
          />
          <Toggle
            label="SSL certificate expiry warning (<14 days)"
            checked={settings.notifyOnSslExpiry ?? true}
            onChange={(v) => void saveSettings({ ...settings, notifyOnSslExpiry: v })}
          />
          <Toggle
            label="AI Latency Anomaly detected"
            checked={settings.notifyOnAnomaly ?? true}
            onChange={(v) => void saveSettings({ ...settings, notifyOnAnomaly: v })}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="discord">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto p-1 gap-1">
          <TabsTrigger value="discord" className="text-xs">Discord</TabsTrigger>
          <TabsTrigger value="slack" className="text-xs">Slack</TabsTrigger>
          <TabsTrigger value="teams" className="text-xs">MS Teams</TabsTrigger>
          <TabsTrigger value="pagerduty" className="text-xs">PagerDuty</TabsTrigger>
          <TabsTrigger value="webhook" className="text-xs">Webhook</TabsTrigger>
          <TabsTrigger value="telegram" className="text-xs">Telegram</TabsTrigger>
          <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
        </TabsList>

        {/* Discord Tab */}
        <TabsContent value="discord">
          {renderChannelCard(
            "discord",
            "Discord Webhook Integration",
            "Send rich formatted embeds with color-coded status alerts to your Discord channels.",
            "Webhook URL (https://discord.com/api/webhooks/...)",
            "#channel or Bot Display Name",
            providers["discord"] || emptyConfig("discord"),
            (val) => setProviders((prev) => ({ ...prev, discord: { ...prev.discord, ...val } })),
            headers["discord"] || "{}",
            (val) => setHeaders((prev) => ({ ...prev, discord: val })),
            saveProvider,
            test
          )}
        </TabsContent>

        {/* Slack Tab */}
        <TabsContent value="slack">
          {renderChannelCard(
            "slack",
            "Slack Incoming Webhook",
            "Post interactive block-kit status updates to any Slack channel or #devops group.",
            "Slack Incoming Webhook URL",
            "Channel Name (e.g. #alerts)",
            providers["slack"] || emptyConfig("slack"),
            (val) => setProviders((prev) => ({ ...prev, slack: { ...prev.slack, ...val } })),
            headers["slack"] || "{}",
            (val) => setHeaders((prev) => ({ ...prev, slack: val })),
            saveProvider,
            test
          )}
        </TabsContent>

        {/* MS Teams Tab */}
        <TabsContent value="teams">
          {renderChannelCard(
            "teams",
            "Microsoft Teams Connector",
            "Dispatch adaptive card notifications to Microsoft Teams channels.",
            "Teams Connector Webhook URL",
            "Channel / Team Name",
            providers["teams"] || emptyConfig("teams"),
            (val) => setProviders((prev) => ({ ...prev, teams: { ...prev.teams, ...val } })),
            headers["teams"] || "{}",
            (val) => setHeaders((prev) => ({ ...prev, teams: val })),
            saveProvider,
            test
          )}
        </TabsContent>

        {/* PagerDuty Tab */}
        <TabsContent value="pagerduty">
          {renderChannelCard(
            "pagerduty",
            "PagerDuty Events v2",
            "Trigger high-urgency on-call incidents when mission-critical targets fail.",
            "PagerDuty Events URL (https://events.pagerduty.com/v2/enqueue)",
            "Integration / Routing Key",
            providers["pagerduty"] || emptyConfig("pagerduty"),
            (val) => setProviders((prev) => ({ ...prev, pagerduty: { ...prev.pagerduty, ...val } })),
            headers["pagerduty"] || "{}",
            (val) => setHeaders((prev) => ({ ...prev, pagerduty: val })),
            saveProvider,
            test
          )}
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook">
          {renderChannelCard(
            "webhook",
            "Custom REST Webhook",
            "Send raw JSON HTTP POST requests to any internal API or lambda function.",
            "Target Endpoint URL",
            "Recipient / Endpoint Name",
            providers["webhook"] || emptyConfig("webhook"),
            (val) => setProviders((prev) => ({ ...prev, webhook: { ...prev.webhook, ...val } })),
            headers["webhook"] || "{}",
            (val) => setHeaders((prev) => ({ ...prev, webhook: val })),
            saveProvider,
            test
          )}
        </TabsContent>

        {/* Telegram Tab */}
        <TabsContent value="telegram">
          {renderChannelCard(
            "telegram",
            "Telegram Bot API",
            "Send Markdown-formatted alerts to Telegram channels or private bots.",
            "Telegram Bot API Base URL",
            "Chat ID (e.g. -100xxxxxxxx or @channel)",
            providers["telegram"] || emptyConfig("telegram"),
            (val) => setProviders((prev) => ({ ...prev, telegram: { ...prev.telegram, ...val } })),
            headers["telegram"] || "{}",
            (val) => setHeaders((prev) => ({ ...prev, telegram: val })),
            saveProvider,
            test
          )}
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms">
          {renderChannelCard(
            "sms",
            "Melipayamak SMS Gateway",
            "Send critical emergency SMS messages directly to engineer mobile numbers.",
            "API URL (https://api.melipayamak.com/v1/sms/send)",
            "Mobile Phone Number (+98...)",
            providers["sms"] || emptyConfig("sms"),
            (val) => setProviders((prev) => ({ ...prev, sms: { ...prev.sms, ...val } })),
            headers["sms"] || "{}",
            (val) => setHeaders((prev) => ({ ...prev, sms: val })),
            saveProvider,
            test
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function renderChannelCard(
  provider: string,
  title: string,
  desc: string,
  urlLabel: string,
  recipLabel: string,
  cfg: NotificationConfig,
  updateCfg: (val: Partial<NotificationConfig>) => void,
  headerRaw: string,
  updateHeaderRaw: (val: string) => void,
  onSave: (p: string) => void,
  onTest: (p: string) => void
) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>{urlLabel}</Label>
          <Input
            value={cfg.apiUrl || ""}
            onChange={(e) => updateCfg({ apiUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="grid gap-2">
          <Label>{recipLabel}</Label>
          <Input
            value={cfg.recipient || ""}
            onChange={(e) => updateCfg({ recipient: e.target.value })}
            placeholder="#alerts"
          />
        </div>
        <div className="grid gap-2">
          <Label>Payload Body Template (JSON with Mustache variables)</Label>
          <Textarea
            rows={5}
            className="font-mono text-xs"
            value={cfg.bodyTemplate || ""}
            onChange={(e) => updateCfg({ bodyTemplate: e.target.value })}
          />
          <span className="text-[11px] text-muted-foreground">
            Variables: <code>{"{{target.name}}"}</code>, <code>{"{{target.host}}"}</code>,{" "}
            <code>{"{{target.status}}"}</code>, <code>{"{{target.latency}}"}</code>, <code>{"{{timestamp}}"}</code>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={() => onTest(provider)} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Send Test Message
          </Button>
          <Button size="sm" onClick={() => onSave(provider)}>
            Save {provider.toUpperCase()} Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
