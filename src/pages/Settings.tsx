import { useEffect, useState } from "react";
import { Download, ExternalLink, RefreshCw, Trash2, Database, ShieldAlert, Sparkles, Activity } from "lucide-react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/services/api";
import { applyTheme, normalizeTheme, useAppStore } from "@/stores/app";
import type { Settings, UpdateInfo, UpdateProgress } from "@/types";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function SettingsPage() {
  const setTheme = useAppStore((s) => s.setTheme);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pruning, setPruning] = useState(false);

  useEffect(() => {
    void api
      .getSettings()
      .then((s) => {
        const theme = normalizeTheme(s.theme);
        const next = { ...s, theme };
        setSettings(next);
        setTheme(theme);
      })
      .catch((err) => toast.error(wailsError(err)));
  }, [setTheme]);

  async function save(next: Settings) {
    try {
      const saved = await api.updateSettings(next);
      setSettings(saved);
      setTheme(saved.theme);
      applyTheme(saved.theme);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function handleManualPrune() {
    if (!settings) return;
    setPruning(true);
    try {
      const res = await api.pruneHistory(settings.retentionDays || 30);
      toast.success(`Pruned ${res.deletedCount} old entries. ${res.remainingCount} entries active.`);
    } catch (err) {
      toast.error(wailsError(err));
    } finally {
      setPruning(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Defaults, data retention limits, alert hysteresis, and background monitoring policies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Startup and system background execution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            label="Start application on boot"
            checked={settings.startOnBoot}
            onChange={(startOnBoot) => void save({ ...settings, startOnBoot })}
          />
          <Toggle
            label="Minimize to tray instead of quitting"
            checked={settings.minimizeToTray}
            onChange={(minimizeToTray) => void save({ ...settings, minimizeToTray })}
          />
          <Toggle
            label="Start monitoring automatically"
            checked={settings.startMonitoringAutomatically}
            onChange={(startMonitoringAutomatically) => void save({ ...settings, startMonitoringAutomatically })}
          />
        </CardContent>
      </Card>

      {/* Data Retention & Storage Card */}
      <Card className="border-emerald-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            <CardTitle>Data Retention & History Storage</CardTitle>
          </div>
          <CardDescription>
            Control automatic pruning to prevent uncontrolled database growth during 24/7 long-term monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Retention Period</Label>
              <Select
                value={String(settings.retentionDays || 30)}
                onValueChange={(val) => void save({ ...settings, retentionDays: Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days (Lightweight / Low memory)</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days (Recommended)</SelectItem>
                  <SelectItem value="90">90 Days (Quarterly compliance)</SelectItem>
                  <SelectItem value="365">365 Days (Full annual audit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <Toggle
                label="Auto-prune old ping results"
                checked={settings.autoPruneHistory ?? true}
                onChange={(autoPruneHistory) => void save({ ...settings, autoPruneHistory })}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              History beyond {settings.retentionDays || 30} days can be pruned immediately to free disk & RAM.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleManualPrune}
              disabled={pruning}
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              {pruning ? "Pruning…" : "Prune Old History Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Fatigue & Flapping Protection */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <CardTitle>Alert Fatigue & Flapping Hysteresis</CardTitle>
          </div>
          <CardDescription>
            Prevent notification storms when a host oscillates between up and down states.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Toggle
              label="Enable flapping detection (Suppresses repeated alerts if flapping > 4 transitions/10m)"
              checked={settings.flappingDetection ?? true}
              onChange={(flappingDetection) => void save({ ...settings, flappingDetection })}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <NumberField
              label="Consecutive failures before alert"
              value={settings.failureThreshold}
              onChange={(failureThreshold) => void save({ ...settings, failureThreshold })}
            />
            <NumberField
              label="Consecutive successes before recovery"
              value={settings.recoveryThreshold}
              onChange={(recoveryThreshold) => void save({ ...settings, recoveryThreshold })}
            />
            <NumberField
              label="Notification cooldown (seconds)"
              value={settings.notificationCooldownSeconds}
              onChange={(notificationCooldownSeconds) => void save({ ...settings, notificationCooldownSeconds })}
            />
            <NumberField
              label="High latency warning threshold (ms)"
              value={settings.highLatencyThresholdMs}
              onChange={(highLatencyThresholdMs) => void save({ ...settings, highLatencyThresholdMs })}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Anomaly & SSL Monitoring */}
      <Card className="border-indigo-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <CardTitle>AI Anomaly & SSL Policies</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            label="Notify when SSL / TLS certificate expires within 14 days"
            checked={settings.notifyOnSslExpiry ?? true}
            onChange={(notifyOnSslExpiry) => void save({ ...settings, notifyOnSslExpiry })}
          />
          <Toggle
            label="Notify when AI detects abnormal latency spike (>3x standard deviation)"
            checked={settings.notifyOnAnomaly ?? true}
            onChange={(notifyOnAnomaly) => void save({ ...settings, notifyOnAnomaly })}
          />
        </CardContent>
      </Card>

      <UpdatesCard />

      <Card>
        <CardHeader>
          <CardTitle>Monitoring Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <NumberField
            label="Default interval (seconds)"
            value={settings.defaultInterval}
            onChange={(defaultInterval) => void save({ ...settings, defaultInterval })}
          />
          <NumberField
            label="Default timeout (seconds)"
            value={settings.defaultTimeout}
            onChange={(defaultTimeout) => void save({ ...settings, defaultTimeout })}
          />
          <NumberField
            label="Default retry"
            value={settings.defaultRetry}
            onChange={(defaultRetry) => void save({ ...settings, defaultRetry })}
          />
          <NumberField
            label="Default retry delay"
            value={settings.defaultRetryDelay}
            onChange={(defaultRetryDelay) => void save({ ...settings, defaultRetryDelay })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance & Logging</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(theme) => void save({ ...settings, theme: theme as Settings["theme"] })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Log Level</Label>
            <Select value={settings.logLevel} onValueChange={(logLevel) => void save({ ...settings, logLevel })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">DEBUG</SelectItem>
                <SelectItem value="info">INFO</SelectItem>
                <SelectItem value="warn">WARN</SelectItem>
                <SelectItem value="error">ERROR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void api.pauseAll().then(() => toast.success("All checks paused"))}>
          Pause all
        </Button>
        <Button variant="outline" onClick={() => void api.minimizeToTray()}>
          Minimize to tray
        </Button>
      </div>
    </div>
  );
}

function UpdatesCard() {
  const [version, setVersion] = useState("");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);

  useEffect(() => {
    void api.getAppVersion().then(setVersion).catch(() => setVersion(""));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("runtime" in window) || !(window as Window & { runtime?: unknown }).runtime) {
      return;
    }
    const off = EventsOn("update:progress", (payload: UpdateProgress) => {
      setProgress(payload);
    });
    return () => off();
  }, []);

  async function check() {
    setChecking(true);
    try {
      const res = await api.checkForUpdate();
      setInfo(res);
      if (!res.available) {
        toast.info("You're using the latest version of PingPulse.");
      }
    } catch (err) {
      toast.error(wailsError(err));
    } finally {
      setChecking(false);
    }
  }

  async function install() {
    setInstalling(true);
    try {
      await api.installUpdate();
    } catch (err) {
      toast.error(wailsError(err));
      setInstalling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Updates</CardTitle>
        <CardDescription>Current version: {version || "unknown"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void check()} disabled={checking || installing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Check for updates
          </Button>
          <Button variant="outline" onClick={() => void api.openReleasePage()}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Release page
          </Button>
          {info?.available ? (
            <Button onClick={() => void install()} disabled={installing}>
              <Download className="mr-2 h-4 w-4" />
              {installing ? "Installing…" : "Install update"}
            </Button>
          ) : null}
        </div>
        {progress ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Downloading update… {progress.percent.toFixed(0)}%</div>
          </div>
        ) : null}
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

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
