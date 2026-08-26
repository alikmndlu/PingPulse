import { NavLink, useNavigate } from "react-router-dom";
import { Bell, BellOff, BookOpen, History, LayoutDashboard, Monitor, Moon, Settings, Sun, Server, ShieldCheck, Siren, Wrench } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { copy } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatMuteRemaining, isMuted } from "@/lib/mute";
import { OnboardingDialog } from "@/components/app/Onboarding";
import { PageTransition } from "@/components/app/Motion";
import { useLaunchDone } from "@/components/app/LaunchScreen";
import { Button } from "@/components/ui/button";
import { appleEase, spring } from "@/lib/motion";
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
      { to: "/help", label: copy.nav.help, icon: BookOpen },
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
  const navigate = useNavigate();
  const launched = useLaunchDone();
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
        <motion.aside
          initial={{ opacity: 0, x: -14 }}
          animate={launched ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
          transition={{ duration: 0.55, ease: appleEase }}
          className="flex w-[220px] shrink-0 flex-col border-e border-border/80 bg-sidebar/90 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="relative">
              <span className="absolute inset-0 rounded-lg bg-primary/35 blur-md" aria-hidden />
              <img src="/appicon.png" alt="" className="relative h-8 w-8 rounded-lg" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight">{copy.appName}</p>
              <p className="text-[11px] text-muted-foreground">Host monitor</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col overflow-auto px-3 pb-4">
            <LayoutGroup>
              <div className="flex flex-col gap-6">
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
                              "relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors duration-200 hover:bg-muted/50 hover:text-foreground",
                              isActive && "font-medium text-foreground",
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive ? (
                                <motion.span
                                  layoutId="nav-active"
                                  className="absolute inset-0 rounded-lg bg-muted shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.04)]"
                                  transition={spring}
                                />
                              ) : null}
                              <item.icon className="relative z-10 h-3.5 w-3.5 shrink-0 opacity-80" />
                              <span className="relative z-10">{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </LayoutGroup>
          </nav>
          <div className="space-y-1 border-t border-border/80 px-5 py-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">{copy.tagline}</p>
            <AppVersion />
          </div>
        </motion.aside>
        <motion.div
          className="flex min-w-0 flex-1 flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: launched ? 1 : 0 }}
          transition={{ duration: 0.45, ease: appleEase, delay: launched ? 0.08 : 0 }}
        >
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={launched ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: appleEase, delay: launched ? 0.06 : 0 }}
            className="flex h-[52px] items-center justify-between border-b border-border/80 bg-background/70 px-6 backdrop-blur-xl"
          >
            <div
              className={cn(
                "inline-flex h-7 items-center gap-2 overflow-hidden rounded-full border px-2.5",
                paused
                  ? "border-amber-500/30 bg-amber-500/10 shadow-[0_0_18px_-6px_rgba(245,158,11,0.7)]"
                  : monitoring
                    ? "border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_18px_-6px_rgba(16,185,129,0.7)]"
                    : "border-border/80 bg-muted/40",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDot, monitoring && !paused && "animate-pulseDot")} />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={statusLabel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: appleEase }}
                  className="text-[12px] font-medium text-foreground"
                >
                  {statusLabel}
                </motion.span>
              </AnimatePresence>
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
                  <Button size="icon" variant="ghost" onClick={() => void navigate("/help")}>
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Help</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => void toggleTheme()}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={theme}
                        initial={{ opacity: 0, rotate: -50, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 50, scale: 0.6 }}
                        transition={{ duration: 0.28, ease: appleEase }}
                        className="inline-flex"
                      >
                        {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </motion.span>
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{theme === "dark" ? "Switch to light" : "Switch to dark"}</TooltipContent>
              </Tooltip>
            </div>
          </motion.header>
          <main className="scrollbar-thin min-h-0 flex-1 overflow-auto p-7">
            <PageTransition />
          </main>
        </motion.div>
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
