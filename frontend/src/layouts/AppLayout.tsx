import { NavLink, Outlet } from "react-router-dom";
import { Bell, BellOff, History, LayoutDashboard, Monitor, Moon, Settings, Sun, Server, ShieldCheck, Siren, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { copy } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatMuteRemaining, isMuted } from "@/lib/mute";
import { Button } from "@/components/ui/button";
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

  async function toggleMute() {
    try {
      const saved = await api.muteNotifications(muted ? 0 : 3600);
      setMutedUntil(saved.mutedUntil ?? "");
      toast.success(saved.mutedUntil ? "Alerts quiet for 1 hour" : "Alerts unmuted");
    } catch (err) {
      toast.error(wailsError(err));
    }
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant={muted ? "secondary" : "ghost"} onClick={() => void toggleMute()}>
                    {muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                    {muted ? formatMuteRemaining(mutedUntil) : "Quiet 1h"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{muted ? "Click to unmute SMS, desktop, and webhook alerts" : "Silence all alerts for one hour"}</TooltipContent>
              </Tooltip>
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
    </TooltipProvider>
  );
}
