import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/services/api";
import { applyTheme, normalizeTheme, useAppStore } from "@/stores/app";
import type { Settings } from "@/types";
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
