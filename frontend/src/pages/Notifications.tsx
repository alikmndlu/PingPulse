import { useEffect, useState, type ReactNode } from "react";
import { Monitor, Send, Smartphone, Webhook } from "lucide-react";
import { Page, PageHeader, ToggleRow } from "@/components/app/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";
import type { NotificationConfig, Settings } from "@/types";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

type ProviderId = "discord" | "slack" | "teams" | "telegram" | "sms" | "webhook";

type ChannelDraft = {
  cfg: NotificationConfig;
  secret: string;
  headers: string;
};

const PLACEHOLDERS = "{{name}} {{host}} {{status}} {{kind}} {{failures}} {{latency}} {{lastSuccess}} {{time}}";

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

function emptyDraft(provider: string): ChannelDraft {
  return { cfg: emptyConfig(provider), secret: "", headers: "{}" };
}

function fromConfig(cfg: NotificationConfig): ChannelDraft {
  return {
    cfg,
    secret: "",
    headers: JSON.stringify(cfg.customHeaders ?? {}, null, 2),
  };
}

export function NotificationsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [channels, setChannels] = useState<Record<ProviderId, ChannelDraft>>({
    discord: emptyDraft("discord"),
    slack: emptyDraft("slack"),
    teams: emptyDraft("teams"),
    telegram: emptyDraft("telegram"),
    sms: emptyDraft("sms"),
    webhook: emptyDraft("webhook"),
  });

  async function load() {
    try {
      const [s, discord, slack, teams, telegram, sms, webhook] = await Promise.all([
        api.getSettings(),
        api.getNotificationConfig("discord"),
        api.getNotificationConfig("slack"),
        api.getNotificationConfig("teams"),
        api.getNotificationConfig("telegram"),
        api.getNotificationConfig("sms"),
        api.getNotificationConfig("webhook"),
      ]);
      setSettings(s);
      setChannels({
        discord: fromConfig(discord),
        slack: fromConfig(slack),
        teams: fromConfig(teams),
        telegram: fromConfig(telegram),
        sms: fromConfig(sms),
        webhook: fromConfig(webhook),
      });
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
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  function patchChannel(id: ProviderId, patch: Partial<ChannelDraft> | ((current: ChannelDraft) => ChannelDraft)) {
    setChannels((prev) => {
      const next = typeof patch === "function" ? patch(prev[id]) : { ...prev[id], ...patch };
      return { ...prev, [id]: next };
    });
  }

  function patchCfg(id: ProviderId, patch: Partial<NotificationConfig>) {
    patchChannel(id, (current) => ({ ...current, cfg: { ...current.cfg, ...patch } }));
  }

  async function saveChannel(id: ProviderId) {
    const draft = channels[id];
    try {
      const headers = JSON.parse(draft.headers || "{}") as Record<string, string>;
      const saved = await api.updateNotificationConfig({ ...draft.cfg, apiKey: draft.secret, customHeaders: headers });
      patchChannel(id, fromConfig(saved));
      toast.success(`${labelFor(id)} saved`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function testChannel(id: ProviderId) {
    try {
      await api.testNotification(id);
      toast.success(`Test ${labelFor(id)} notification sent`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  if (!settings) {
    return (
      <Page>
        <p className="text-sm text-muted-foreground">Loading notifications…</p>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Notifications" description="Choose when PingPulse should alert you, then configure each channel on its own." />

      <Card>
        <CardHeader>
          <CardTitle>When to alert</CardTitle>
          <CardDescription>These rules apply to every enabled channel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <ToggleRow label="Target offline" description="After consecutive failures pass the threshold." checked={settings.notifyOnOffline} onChange={(v) => void saveSettings({ ...settings, notifyOnOffline: v })} />
          <ToggleRow label="Target recovery" description="When a host comes back online." checked={settings.notifyOnRecovery} onChange={(v) => void saveSettings({ ...settings, notifyOnRecovery: v })} />
          <ToggleRow label="High latency" description="When a successful check is slower than the threshold." checked={settings.notifyOnHighLatency} onChange={(v) => void saveSettings({ ...settings, notifyOnHighLatency: v })} />
          <ToggleRow label="Ping timeout" description="When a probe times out." checked={settings.notifyOnTimeout} onChange={(v) => void saveSettings({ ...settings, notifyOnTimeout: v })} />
          <NumberField label="High latency threshold (ms)" value={settings.highLatencyThresholdMs} onCommit={(highLatencyThresholdMs) => void saveSettings({ ...settings, highLatencyThresholdMs })} />
          <NumberField label="Cooldown (seconds)" value={settings.notificationCooldownSeconds} onCommit={(notificationCooldownSeconds) => void saveSettings({ ...settings, notificationCooldownSeconds })} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Channels</h2>
          <p className="mt-1 text-sm text-muted-foreground">Each channel has its own credentials and message. Secrets stay on this machine and are never shown again after save.</p>
        </div>

        <ChannelCard
          title="Desktop"
          description="Native OS notifications on this computer. No extra setup."
          icon={Monitor}
          enabled={settings.desktopNotificationEnabled}
          onEnabledChange={(v) => void saveSettings({ ...settings, desktopNotificationEnabled: v })}
        />

        <ChannelCard
          title="Telegram"
          description="Use a BotFather bot. Send it a message once, then paste the chat ID here."
          icon={Send}
          enabled={settings.telegramEnabled}
          onEnabledChange={(v) => void saveSettings({ ...settings, telegramEnabled: v })}
          onSave={() => void saveChannel("telegram")}
          onTest={() => void testChannel("telegram")}
        >
          <Field label="Bot token">
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={channels.telegram.cfg.apiKeySet ? "••••••••  (set, hidden)" : "123456:ABC-token-from-BotFather"}
              value={channels.telegram.secret}
              onChange={(e) => patchChannel("telegram", { secret: e.target.value })}
            />
          </Field>
          <Field label="Chat ID" hint="Personal chats are numeric. Groups often start with -100.">
            <Input value={channels.telegram.cfg.recipient} placeholder="123456789 or -1001234567890" onChange={(e) => patchCfg("telegram", { recipient: e.target.value })} />
          </Field>
          <Advanced>
            <TemplateField value={channels.telegram.cfg.bodyTemplate} onChange={(bodyTemplate) => patchCfg("telegram", { bodyTemplate })} />
          </Advanced>
        </ChannelCard>

        <ChannelCard
          title="Melipayamak SMS"
          description="Sends JSON {from, to, text} to the Melipayamak console API. Keep {{apiKey}} in the URL."
          icon={Smartphone}
          enabled={settings.smsEnabled}
          onEnabledChange={(v) => void saveSettings({ ...settings, smsEnabled: v })}
          onSave={() => void saveChannel("sms")}
          onTest={() => void testChannel("sms")}
        >
          <Field label="API key">
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={channels.sms.cfg.apiKeySet ? "••••••••  (set, hidden)" : "Melipayamak token"}
              value={channels.sms.secret}
              onChange={(e) => patchChannel("sms", { secret: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sender (from)">
              <Input value={channels.sms.cfg.sender} onChange={(e) => patchCfg("sms", { sender: e.target.value })} />
            </Field>
            <Field label="Recipient (to)">
              <Input value={channels.sms.cfg.recipient} onChange={(e) => patchCfg("sms", { recipient: e.target.value })} />
            </Field>
          </div>
          <Advanced>
            <Field label="API URL">
              <Input value={channels.sms.cfg.apiUrl} placeholder="https://console.melipayamak.com/api/send/simple/{{apiKey}}" onChange={(e) => patchCfg("sms", { apiUrl: e.target.value })} />
            </Field>
            <TemplateField value={channels.sms.cfg.bodyTemplate} onChange={(bodyTemplate) => patchCfg("sms", { bodyTemplate })} />
            <Field label="Custom headers (JSON)">
              <Textarea rows={4} value={channels.sms.headers} onChange={(e) => patchChannel("sms", { headers: e.target.value })} />
            </Field>
          </Advanced>
        </ChannelCard>

        <ChannelCard
          title="Discord"
          description="Post alerts to a Discord channel with an incoming webhook."
          enabled={Boolean(settings.discordEnabled)}
          onEnabledChange={(v) => void saveSettings({ ...settings, discordEnabled: v })}
          onSave={() => void saveChannel("discord")}
          onTest={() => void testChannel("discord")}
        >
          <Field label="Webhook URL">
            <Input value={channels.discord.cfg.apiUrl} placeholder="https://discord.com/api/webhooks/..." onChange={(e) => patchCfg("discord", { apiUrl: e.target.value })} />
          </Field>
          <Advanced>
            <TemplateField value={channels.discord.cfg.bodyTemplate} onChange={(bodyTemplate) => patchCfg("discord", { bodyTemplate })} hint="JSON body Discord expects, usually {&quot;content&quot;:&quot;...&quot;}." />
          </Advanced>
        </ChannelCard>

        <ChannelCard
          title="Slack"
          description="Send alerts to a Slack channel with an incoming webhook."
          enabled={Boolean(settings.slackEnabled)}
          onEnabledChange={(v) => void saveSettings({ ...settings, slackEnabled: v })}
          onSave={() => void saveChannel("slack")}
          onTest={() => void testChannel("slack")}
        >
          <Field label="Webhook URL">
            <Input value={channels.slack.cfg.apiUrl} placeholder="https://hooks.slack.com/services/..." onChange={(e) => patchCfg("slack", { apiUrl: e.target.value })} />
          </Field>
          <Advanced>
            <TemplateField value={channels.slack.cfg.bodyTemplate} onChange={(bodyTemplate) => patchCfg("slack", { bodyTemplate })} hint="JSON body Slack expects, usually {&quot;text&quot;:&quot;...&quot;}." />
          </Advanced>
        </ChannelCard>

        <ChannelCard
          title="Microsoft Teams"
          description="Deliver alerts to a Teams channel with an incoming webhook."
          enabled={Boolean(settings.teamsEnabled)}
          onEnabledChange={(v) => void saveSettings({ ...settings, teamsEnabled: v })}
          onSave={() => void saveChannel("teams")}
          onTest={() => void testChannel("teams")}
        >
          <Field label="Webhook URL">
            <Input value={channels.teams.cfg.apiUrl} placeholder="https://outlook.office.com/webhook/..." onChange={(e) => patchCfg("teams", { apiUrl: e.target.value })} />
          </Field>
          <Advanced>
            <TemplateField value={channels.teams.cfg.bodyTemplate} onChange={(bodyTemplate) => patchCfg("teams", { bodyTemplate })} hint="JSON body Teams expects, usually {&quot;text&quot;:&quot;...&quot;}." />
          </Advanced>
        </ChannelCard>

        <ChannelCard
          title="Webhook"
          description="Generic HTTP integration for anything else. Leave the API key blank to keep the stored secret."
          icon={Webhook}
          enabled={settings.webhookEnabled}
          onEnabledChange={(v) => void saveSettings({ ...settings, webhookEnabled: v })}
          onSave={() => void saveChannel("webhook")}
          onTest={() => void testChannel("webhook")}
        >
          <Field label="Endpoint URL">
            <Input value={channels.webhook.cfg.apiUrl} placeholder="https://example.com/hooks/pingpulse" onChange={(e) => patchCfg("webhook", { apiUrl: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="HTTP method">
              <Input value={channels.webhook.cfg.httpMethod} onChange={(e) => patchCfg("webhook", { httpMethod: e.target.value })} />
            </Field>
            <Field label="API key">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={channels.webhook.cfg.apiKeySet ? "••••••••  (set, hidden)" : "Optional"}
                value={channels.webhook.secret}
                onChange={(e) => patchChannel("webhook", { secret: e.target.value })}
              />
            </Field>
          </div>
          <TemplateField value={channels.webhook.cfg.bodyTemplate} onChange={(bodyTemplate) => patchCfg("webhook", { bodyTemplate })} hint="Request body. JSON is typical." />
          <Advanced>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sender header">
                <Input value={channels.webhook.cfg.sender} onChange={(e) => patchCfg("webhook", { sender: e.target.value })} />
              </Field>
              <Field label="Recipient">
                <Input value={channels.webhook.cfg.recipient} onChange={(e) => patchCfg("webhook", { recipient: e.target.value })} />
              </Field>
            </div>
            <Field label="Custom headers (JSON)">
              <Textarea rows={4} value={channels.webhook.headers} onChange={(e) => patchChannel("webhook", { headers: e.target.value })} />
            </Field>
          </Advanced>
        </ChannelCard>
      </div>
    </Page>
  );
}

function labelFor(id: ProviderId) {
  const labels: Record<ProviderId, string> = {
    discord: "Discord",
    slack: "Slack",
    teams: "Teams",
    telegram: "Telegram",
    sms: "SMS",
    webhook: "Webhook",
  };
  return labels[id];
}

function ChannelCard({
  title,
  description,
  icon: Icon,
  enabled,
  onEnabledChange,
  onSave,
  onTest,
  children,
}: {
  title: string;
  description: string;
  icon?: typeof Monitor;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  onSave?: () => void;
  onTest?: () => void;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className={`flex-row items-start justify-between gap-4 space-y-0 ${enabled && children ? "" : "pb-5"}`}>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
            <CardTitle>{title}</CardTitle>
            <Badge variant={enabled ? "success" : "muted"}>{enabled ? "On" : "Off"}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </CardHeader>
      {enabled && children ? (
        <CardContent className="grid gap-4">
          {children}
          {onSave || onTest ? (
            <div className="flex justify-end gap-2">
              {onTest ? (
                <Button variant="outline" onClick={onTest}>
                  Send test
                </Button>
              ) : null}
              {onSave ? <Button onClick={onSave}>Save</Button> : null}
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TemplateField({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label="Message template" hint={hint ? `${hint} Placeholders: ${PLACEHOLDERS}` : `Placeholders: ${PLACEHOLDERS}`}>
      <Textarea rows={7} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
    </Field>
  );
}

function Advanced({ children }: { children: ReactNode }) {
  return (
    <details className="rounded-xl border border-border/80">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-muted-foreground marker:content-none hover:text-foreground [&::-webkit-details-marker]:hidden">
        Advanced
      </summary>
      <div className="grid gap-3 border-t border-border/80 p-4">{children}</div>
    </details>
  );
}

function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  return (
    <Field label={label}>
      <Input
        type="number"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const next = Number(local);
          if (!Number.isNaN(next) && next !== value) onCommit(next);
          else setLocal(String(value));
        }}
      />
    </Field>
  );
}
