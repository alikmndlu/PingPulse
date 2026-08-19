import { NavLink, Outlet } from "react-router-dom";
import { Activity, Bell, History, LayoutDashboard, Monitor, Moon, Settings, Sun, Server } from "lucide-react";
import { copy } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/app";
import { useWailsEvents } from "@/hooks/useWailsEvents";
import { api } from "@/services/api";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

const nav = [
  { to: "/", label: copy.nav.dashboard, icon: LayoutDashboard },
  { to: "/targets", label: copy.nav.targets, icon: Server },
  { to: "/history", label: copy.nav.history, icon: History },
  { to: "/notifications", label: copy.nav.notifications, icon: Bell },
  { to: "/settings", label: copy.nav.settings, icon: Settings },
];

export function AppLayout() {
  useWailsEvents();
  const monitoring = useAppStore((s) => s.monitoring);
  const paused = useAppStore((s) => s.paused);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const statusLabel = paused ? copy.monitoring.paused : monitoring ? copy.monitoring.running : copy.monitoring.stopped;
  const statusClass = paused ? "bg-amber-400" : monitoring ? "bg-emerald-400" : "bg-zinc-500";

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

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="flex w-60 shrink-0 flex-col border-e border-border bg-card/40">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{copy.appName}</p>
              <p className="text-[11px] text-muted-foreground">Infrastructure pulse</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                    isActive && "bg-muted text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <p className="px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">{copy.tagline}</p>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-3">
              <span className={cn("h-2 w-2 rounded-full", statusClass, monitoring && !paused && "animate-pulseDot")} />
              <span className="text-sm font-medium">{copy.appName}</span>
              <span className="text-xs text-muted-foreground">{statusLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={monitoring ? "outline" : "default"} onClick={toggleMonitoring}>
                <Monitor className="h-4 w-4" />
                {monitoring ? "Stop" : "Start"} monitoring
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
          <main className="min-h-0 flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
