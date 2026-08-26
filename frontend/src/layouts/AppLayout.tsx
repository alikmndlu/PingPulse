import { NavLink, Outlet } from "react-router-dom";
import { Bell, BellOff, History, LayoutDashboard, Monitor, Moon, Settings, Sun, Server, ShieldCheck, Siren, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { copy } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatMuteRemaining, isMuted } from "@/lib/mute";
import { OnboardingDialog } from "@/components/app/Onboarding";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/app";
import { useWailsEvents } from "@/hooks/useWailsEvents";
import { api } from "@/services/api";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

const nav = [
  {
    label: "Monitor",
    items: [
      { to: "/", label: copy.nav.dashboard, icon: LayoutDashboard },
      { to: "/targets", label: copy.nav.targets, icon: Server },
    ],
  },
  {
    label: "Reliability",
    items: [
      { to: "/incidents", label: copy.nav.incidents, icon: Siren },
      { to: "/sla", label: copy.nav.sla, icon: ShieldCheck },
      { to: "/maintenance", label: copy.nav.maintenance, icon: Wrench },
      { to: "/history", label: copy.nav.history, icon: History },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/notifications", label: copy.nav.notifications, icon: Bell },
      { to: "/settings", label: copy.nav.settings, icon: Settings },
    ],
  },
];

function AppVersion() {
  const [version, setVersion] = useState("");
  useEffect(() => {
    void api.getAppVersion().then(setVersion).catch(() => {});
  }, []);
  if (!version) return null;
  return <p className="font-mono text-[11px] text-muted-foreground/70">{version}</p>;
}

export function AppLayout() {
  useWailsEvents();
  const monitoring = useAppStore((s) => s.monitoring);
  const paused = useAppStore((s) => s.paused);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const mutedUntil = useAppStore((s) => s.mutedUntil);
  const setMutedUntil = useAppStore((s) => s.setMutedUntil);
  const [, setTick] = useState(0);
  const [customMuteOpen, setCustomMuteOpen] = useState(false);
  const [customMuteAt, setCustomMuteAt] = useState("");
  const muted = isMuted(mutedUntil);

  useEffect(() => {
    if (!muted) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [muted, mutedUntil]);

  const statusLabel = paused ? copy.monitoring.paused : monitoring ? copy.monitoring.running : copy.monitoring.stopped;
  const statusDot = paused ? "bg-amber-500" : monitoring ? "bg-emerald-500" : "bg-zinc-400";

  async function toggleMonitoring() {
    try {
      if (monitoring) await api.stopMonitoring();
      else await api.startMonitoring();
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      const current = await api.getSettings();
      await api.updateSettings({ ...current, theme: next });
    } catch {
      // Keep the local toggle even if settings cannot be persisted yet.
    }
  }

  async function muteFor(seconds: number, label: string) {
    try {
      const saved = await api.muteNotifications(seconds);
      setMutedUntil(saved.mutedUntil ?? "");
      toast.success(seconds === 0 ? "Alerts unmuted" : `Alerts quiet ${label}`);
    } catch (err) {
      toast.error(wailsError(err));
    }
  }

  function secondsUntilTomorrow(hour: number) {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(hour, 0, 0, 0);
    return Math.max(60, Math.round((next.getTime() - now.getTime()) / 1000));
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="flex w-[220px] shrink-0 flex-col border-e border-border/80 bg-sidebar">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <img src="/appicon.png" alt="" className="h-8 w-8 rounded-lg" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight">{copy.appName}</p>
              <p className="text-[11px] text-muted-foreground">Host monitor</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-6 overflow-auto px-3 pb-4">
            {nav.map((section) => (
              <div key={section.label}>
                <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
                          isActive && "bg-muted font-medium text-foreground",
                        )
                      }
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="space-y-1 border-t border-border/80 px-5 py-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">{copy.tagline}</p>
            <AppVersion />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[52px] items-center justify-between border-b border-border/80 px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDot, monitoring && !paused && "animate-pulseDot")} />
              <span className="text-[12px] font-medium text-foreground">{statusLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant={muted ? "secondary" : "ghost"}>
                    {muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                    {muted ? formatMuteRemaining(mutedUntil) : "Quiet"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {muted ? <DropdownMenuItem onClick={() => void muteFor(0, "")}>Unmute alerts</DropdownMenuItem> : null}
                  <DropdownMenuItem onClick={() => void muteFor(3600, "for 1 hour")}>Quiet 1 hour</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteFor(8 * 3600, "for 8 hours")}>Quiet 8 hours</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void muteFor(secondsUntilTomorrow(8), "until tomorrow 8:00")}>
                    Quiet until tomorrow 8:00
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCustomMuteOpen(true)}>Quiet until…</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant={monitoring ? "outline" : "default"} onClick={toggleMonitoring}>
                <Monitor className="h-3.5 w-3.5" />
                {monitoring ? "Stop" : "Start"}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => void toggleTheme()}>
                    {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{theme === "dark" ? "Switch to light" : "Switch to dark"}</TooltipContent>
              </Tooltip>
            </div>
          </header>
          <main className="scrollbar-thin min-h-0 flex-1 overflow-auto p-7">
            <Outlet />
          </main>
        </div>
      </div>
      <OnboardingDialog />
      <Dialog open={customMuteOpen} onOpenChange={setCustomMuteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quiet until</DialogTitle>
            <DialogDescription>Alerts stay silent until this local time, then resume automatically.</DialogDescription>
          </DialogHeader>
          <Input type="datetime-local" value={customMuteAt} onChange={(e) => setCustomMuteAt(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCustomMuteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const at = new Date(customMuteAt).getTime();
                const seconds = Math.round((at - Date.now()) / 1000);
                if (!customMuteAt || Number.isNaN(at) || seconds < 60) {
                  toast.error("Pick a time at least one minute from now");
                  return;
                }
                setCustomMuteOpen(false);
                void muteFor(seconds, "until the time you picked");
              }}
            >
              Quiet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
