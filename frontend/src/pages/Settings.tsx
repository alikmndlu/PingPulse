import { useEffect, useState } from "react";
import { Download, ExternalLink, FolderOpen, RefreshCw, ScrollText } from "lucide-react";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { Page, PageHeader, ToggleRow } from "@/components/app/Page";
import { CardSkeleton } from "@/components/app/Skeleton";
import { Stagger, StaggerItem } from "@/components/app/Motion";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import { applyTheme, normalizeTheme, useAppStore } from "@/stores/app";
import type { DataPaths, Settings, UpdateInfo, UpdateProgress } from "@/types";
import { peekCache, putCache } from "@/lib/queryCache";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function SettingsPage() {
  const setTheme = useAppStore((s) => s.setTheme);
  const [settings, setSettings] = useState<Settings | null>(() => {
    const hit = peekCache<Settings>("settings");
    return hit ? { ...hit, theme: normalizeTheme(hit.theme) } : null;
  });
  const [pauseOpen, setPauseOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  useEffect(() => {
    void api
      .getSettings()
      .then((s) => {
        const theme = normalizeTheme(s.theme);
        const next = { ...s, theme };
        putCache("settings", next);
        setSettings(next);
        setTheme(theme);
      })
      .catch((err) => toast.error(wailsError(err)));
  }, [setTheme]);

  async function save(next: Settings) {
    try {
      const saved = await api.updateSettings(next);
      putCache("settings", saved);
      setSettings(saved);
      setTheme(saved.theme);
      applyTheme(saved.theme);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  if (!settings) {
    return (
      <Page>
        <PageHeader kicker="System" title="Settings" description="Defaults, thresholds, and how PingPulse behaves in the background." />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={6} />
        <div className="grid gap-3 md:grid-cols-2">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader kicker="System" title="Settings" description="Defaults, thresholds, and how PingPulse behaves in the background." />
      <Stagger className="space-y-8">
      <StaggerItem>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Startup and window behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow label="Start application on boot" checked={settings.startOnBoot} onChange={(startOnBoot) => void save({ ...settings, startOnBoot })} />
          <ToggleRow label="Minimize to tray instead of quitting" checked={settings.minimizeToTray} onChange={(minimizeToTray) => void save({ ...settings, minimizeToTray })} />
          <ToggleRow label="Start monitoring automatically" checked={settings.startMonitoringAutomatically} onChange={(startMonitoringAutomatically) => void save({ ...settings, startMonitoringAutomatically })} />
        </CardContent>
      </Card>
      </StaggerItem>
      <StaggerItem>
      <UpdatesCard />
      </StaggerItem>
      <StaggerItem>
      <DataCard onRestore={() => setRestoreOpen(true)} />
      </StaggerItem>
      <StaggerItem>
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
          <div className="grid gap-2 md:col-span-2 max-w-xs">
            <Label>Ping history retention</Label>
            <Select
              value={String(settings.historyRetentionDays ?? 30)}
              onValueChange={(v) => void save({ ...settings, historyRetentionDays: Number(v) })}
            >
              <SelectTrigger className="mt-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Older ping rows are deleted. Incidents and SLA history are kept.</p>
          </div>
        </CardContent>
      </Card>
      </StaggerItem>
      <StaggerItem>
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
      </StaggerItem>
      <StaggerItem>
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
      </StaggerItem>
      <StaggerItem>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setPauseOpen(true)}>
          Pause all
        </Button>
        <Button variant="outline" onClick={() => void api.minimizeToTray()}>
          Minimize to tray
        </Button>
      </div>
      </StaggerItem>
      </Stagger>
      <ConfirmDialog
        open={pauseOpen}
        title="Pause all checks?"
        description="The scheduler stops probing every target until you press Start again."
        confirmLabel="Pause all"
        onOpenChange={setPauseOpen}
        onConfirm={() => void api.pauseAll().then(() => toast.success("All checks paused")).catch((err) => toast.error(wailsError(err)))}
      />
      <ConfirmDialog
        open={restoreOpen}
        title="Replace this PingPulse data?"
        description="Restore overwrites targets, history, incidents, settings, and notification secrets on this computer. PingPulse will quit; open it again afterwards."
        confirmLabel="Choose backup file"
        destructive
        onOpenChange={setRestoreOpen}
        onConfirm={() => {
          void api
            .restoreBackup()
            .then((res) => {
              if (res.cancelled) return;
              toast.success("Backup restored. PingPulse is closing — reopen the app.");
            })
            .catch((err) => toast.error(wailsError(err)));
        }}
      />
    </Page>
  );
}

function DataCard({ onRestore }: { onRestore: () => void }) {
  const [paths, setPaths] = useState<DataPaths | null>(null);

  useEffect(() => {
    void api.getDataPaths().then(setPaths).catch(() => setPaths(null));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data and backup</CardTitle>
        <CardDescription>
          Everything lives on this computer. Export copies pingpulse.db (targets, incidents, settings, and notification keys). Keep that file private — secrets are not shown again in the UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paths ? (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Data folder</p>
            <p className="break-all font-mono text-xs text-foreground">{paths.dir}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void api.openDataDir().catch((err) => toast.error(wailsError(err)))}>
            <FolderOpen className="h-4 w-4" />
            Open folder
          </Button>
          <Button variant="outline" size="sm" onClick={() => void api.openLogFile().catch((err) => toast.error(wailsError(err)))}>
            <ScrollText className="h-4 w-4" />
            Open log
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void api
                .exportBackup()
                .then((res) => {
                  if (res.cancelled) return;
                  toast.success("Backup saved");
                })
                .catch((err) => toast.error(wailsError(err)))
            }
          >
            Export backup
          </Button>
          <Button variant="outline" size="sm" onClick={onRestore}>
            Restore backup
          </Button>
        </div>
      </CardContent>
    </Card>
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
      const result = await api.installUpdate();
      if (result.openedInstaller) {
        toast.success("The new package is open. Finish installing it, then reopen PingPulse.");
        setInstalling(false);
        setProgress(null);
        return;
      }
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
          Check GitHub Releases for a newer PingPulse. Installing replaces the copy you already installed. A Linux package from apt or dnf opens the new installer instead of writing under /opt.
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
              {info.assetName ? ` (${info.assetName})` : info.packageName ? ` (${info.packageName})` : ""}
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
                {info.installHint || "In-app install is not available for this build. Download the release from GitHub instead."}
              </p>
            )}
            {installing && progress && (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.min(100, progress.percent)}%` }}
                  />
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

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
