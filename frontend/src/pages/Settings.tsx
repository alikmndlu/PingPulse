import { useEffect, useState } from "react";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
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

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Defaults, thresholds, and how PingPulse behaves in the background.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Startup and window behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle label="Start application on boot" checked={settings.startOnBoot} onChange={(startOnBoot) => void save({ ...settings, startOnBoot })} />
          <Toggle label="Minimize to tray instead of quitting" checked={settings.minimizeToTray} onChange={(minimizeToTray) => void save({ ...settings, minimizeToTray })} />
          <Toggle label="Start monitoring automatically" checked={settings.startMonitoringAutomatically} onChange={(startMonitoringAutomatically) => void save({ ...settings, startMonitoringAutomatically })} />
        </CardContent>
      </Card>
      <UpdatesCard />
      <Card>
        <CardHeader>
          <CardTitle>Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <NumberField label="Default interval (seconds)" value={settings.defaultInterval} onChange={(defaultInterval) => void save({ ...settings, defaultInterval })} />
          <NumberField label="Default timeout (seconds)" value={settings.defaultTimeout} onChange={(defaultTimeout) => void save({ ...settings, defaultTimeout })} />
          <NumberField label="Default retry" value={settings.defaultRetry} onChange={(defaultRetry) => void save({ ...settings, defaultRetry })} />
          <NumberField label="Default retry delay" value={settings.defaultRetryDelay} onChange={(defaultRetryDelay) => void save({ ...settings, defaultRetryDelay })} />
          <NumberField label="Failure threshold" value={settings.failureThreshold} onChange={(failureThreshold) => void save({ ...settings, failureThreshold })} />
          <NumberField label="Recovery threshold" value={settings.recoveryThreshold} onChange={(recoveryThreshold) => void save({ ...settings, recoveryThreshold })} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="max-w-xs">
          <Label>Theme</Label>
          <Select value={settings.theme} onValueChange={(theme) => void save({ ...settings, theme: theme as Settings["theme"] })}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logging</CardTitle>
        </CardHeader>
        <CardContent className="max-w-xs">
          <Label>Level</Label>
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
    return () => off?.();
  }, []);

  async function check() {
    setChecking(true);
    try {
      const next = await api.checkForUpdate();
      setInfo(next);
      if (!next.available) {
        toast.success(`PingPulse ${next.currentVersion} is up to date`);
      }
    } catch (err) {
      toast.error(wailsError(err));
    } finally {
      setChecking(false);
    }
  }

  async function install() {
    setInstalling(true);
    setProgress({ percent: 0, bytes: 0, total: 0 });
    try {
      await api.installUpdate();
      toast.success("Update downloaded. PingPulse will restart.");
    } catch (err) {
      setInstalling(false);
      setProgress(null);
      toast.error(wailsError(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Updates</CardTitle>
        <CardDescription>
          Check GitHub Releases for a newer PingPulse build. Installing replaces this app and restarts it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Installed version: <span className="font-medium text-foreground">{version || "…"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={checking || installing} onClick={() => void check()}>
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check for updates"}
          </Button>
          <Button variant="outline" onClick={() => void api.openReleasePage()}>
            <ExternalLink className="h-4 w-4" />
            Open releases
          </Button>
        </div>
        {info?.available && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">
              {info.latestVersion} is available
              {info.assetName ? ` (${info.assetName})` : ""}
            </p>
            {info.notes && (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{info.notes}</pre>
            )}
            {info.canInstall ? (
              <Button disabled={installing} onClick={() => void install()}>
                <Download className="h-4 w-4" />
                {installing ? "Downloading…" : `Install ${info.latestVersion}`}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                In-app install is not available for this build. Download the release from GitHub instead.
              </p>
            )}
            {installing && progress && (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, progress.percent)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progress.percent}%
                  {progress.total > 0 ? ` · ${Math.round(progress.bytes / 1048576)} / ${Math.round(progress.total / 1048576)} MB` : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
