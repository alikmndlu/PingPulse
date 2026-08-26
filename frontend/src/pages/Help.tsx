import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Database,
  Download,
  Gauge,
  History,
  LayoutDashboard,
  Pause,
  Radio,
  ShieldCheck,
  Siren,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { Button } from "@/components/ui/button";
import { appleEase, springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";

const chapters = [
  { id: "start", label: "Start" },
  { id: "probes", label: "Probes" },
  { id: "live", label: "Live view" },
  { id: "reliability", label: "Reliability" },
  { id: "alerts", label: "Alerts" },
  { id: "keep", label: "Keep it running" },
] as const;

const probes = [
  {
    id: "icmp",
    title: "ICMP",
    hint: "Did the host answer a ping?",
    body: "Best for routers, NAS boxes, and anything that should always be on the network. Interval, timeout, retries, and retry delay are per target. Windows uses native ICMP; Linux and macOS use unprivileged ICMP when the OS allows it.",
  },
  {
    id: "http",
    title: "HTTP",
    hint: "Did the URL return the status you expect?",
    body: "Point at a full URL. Success is a matching status code (default 200). Use this for APIs, landing pages, and anything ICMP cannot see. One box can have ICMP and HTTPS at the same time.",
  },
  {
    id: "tcp",
    title: "TCP",
    hint: "Did the port accept a connection?",
    body: "Dials host:port inside the timeout. A successful connect is online. Use it for SSH, databases, game servers, and anything that is not ICMP or HTTP.",
  },
] as const;

const statuses = [
  { id: "online", label: "Online", className: "bg-emerald-500", ring: "shadow-[0_0_18px_rgba(16,185,129,0.55)]" },
  { id: "offline", label: "Offline", className: "bg-rose-500", ring: "shadow-[0_0_18px_rgba(244,63,94,0.45)]" },
  { id: "unknown", label: "Unknown", className: "bg-zinc-400", ring: "shadow-[0_0_14px_rgba(161,161,170,0.35)]" },
  { id: "disabled", label: "Disabled", className: "bg-amber-500", ring: "shadow-[0_0_14px_rgba(245,158,11,0.4)]" },
] as const;

const channels = [
  { name: "Desktop", hint: "Toasts on this machine" },
  { name: "Telegram", hint: "Bot + chat" },
  { name: "Discord", hint: "Incoming webhook" },
  { name: "Slack", hint: "Incoming webhook" },
  { name: "Teams", hint: "Incoming webhook" },
  { name: "SMS", hint: "HTTP API" },
  { name: "Webhook", hint: "Your JSON template" },
  { name: "Quiet", hint: "Mute, still ping" },
] as const;

export function HelpPage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [probe, setProbe] = useState<(typeof probes)[number]["id"]>("icmp");
  const [active, setActive] = useState<(typeof chapters)[number]["id"]>("start");
  const selected = probes.find((p) => p.id === probe) ?? probes[0];

  useEffect(() => {
    const nodes = chapters.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id as (typeof chapters)[number]["id"]);
      },
      { rootMargin: "-28% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1080px] pb-16">
      <Hero
        reduce={Boolean(reduce)}
        onTour={() => document.getElementById("start")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" })}
        onAdd={() => navigate("/targets")}
      />

      <div className="sticky top-0 z-20 -mx-1 mb-10 bg-background/80 py-3 backdrop-blur-xl">
        <LayoutGroup>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
            {chapters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => document.getElementById(c.id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })}
                className={cn(
                  "relative shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active === c.id && "text-foreground",
                )}
              >
                {active === c.id ? (
                  <motion.span layoutId="help-chip" className="absolute inset-0 rounded-full bg-muted" transition={springSoft} />
                ) : null}
                <span className="relative z-10">{c.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>

      <div className="space-y-16">
        <Section id="start" kicker="01" title="Your first five minutes">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            PingPulse lives in the tray and keeps checking even when the window is hidden. Add hosts, start monitoring, then wire alerts when you are ready.
          </p>
          <ol className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              { n: "1", t: "Add a target", d: "ICMP for a box, HTTP for a URL, TCP for a port. The same host can have more than one probe." },
              { n: "2", t: "Start monitoring", d: "The header Start button runs the scheduler. Status becomes Monitoring. Stop pauses the scheduler; pause-all leaves targets in place." },
              { n: "3", t: "Watch the dashboard", d: "Online, offline, unknown, and open incidents update live. A single missed ping is not an outage." },
              { n: "4", t: "Turn on an alert", d: "Desktop toasts are on by default. Telegram, Discord, Slack, Teams, SMS, and webhooks are optional." },
              { n: "5", t: "Stay quiet when you need to", d: "Quiet mutes every channel without stopping probes. Mute also exists per target, and both expire on their own." },
            ].map((step, i) => (
              <RevealCard key={step.n} delay={i * 0.05}>
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">
                    {step.n}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.t}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.d}</p>
                  </div>
                </div>
              </RevealCard>
            ))}
          </ol>
        </Section>

        <Section id="probes" kicker="02" title="Three ways to ask if something is alive">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Offline takes consecutive failures. Recovery takes consecutive successes. Flapping links do not spam you. High latency is a separate event, off until you set a threshold.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {statuses.map((s, i) => (
              <motion.span
                key={s.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: reduce ? 0 : i * 0.06, ease: appleEase }}
                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-[12px] font-medium"
              >
                <motion.span
                  className={cn("h-2 w-2 rounded-full", s.className, s.ring)}
                  animate={reduce ? undefined : { scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 2.2 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                />
                {s.label}
              </motion.span>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
            <LayoutGroup>
              <div className="flex flex-row gap-2 lg:flex-col">
              {probes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProbe(p.id)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-colors",
                    probe === p.id ? "border-primary/40 bg-primary/10" : "border-border/80 hover:bg-muted/40",
                  )}
                >
                  {probe === p.id ? (
                    <motion.span layoutId="probe-glow" className="absolute inset-0 bg-primary/10" transition={springSoft} />
                  ) : null}
                  <p className="relative text-sm font-semibold tracking-tight">{p.title}</p>
                  <p className="relative mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{p.hint}</p>
                </button>
              ))}
              </div>
            </LayoutGroup>
            <RevealCard className="relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.id}
                  initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={reduce ? undefined : { opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.38, ease: appleEase }}
                >
                  <ProbeScene kind={selected.id} reduce={Boolean(reduce)} />
                  <p className="relative mt-5 text-sm font-medium text-foreground">{selected.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected.body}</p>
                  <Button className="mt-4" variant="outline" size="sm" onClick={() => navigate("/targets")}>
                    Add a target
                  </Button>
                </motion.div>
              </AnimatePresence>
            </RevealCard>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Defaults: 120s interval, 5s timeout, 3 retries, 2s retry delay, 3 failures to offline, 2 successes to recover. Minimum interval is 5 seconds.
          </p>
        </Section>

        <Section id="live" kicker="03" title="The live surface">
          <MiniStrip reduce={Boolean(reduce)} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Feature
              icon={LayoutDashboard}
              title="Dashboard"
              body="Fleet pulse: counts, uptime, open incidents, active maintenance, a status donut, and a group filter. Click a row to open the target."
              to="/"
              cta="Open dashboard"
            />
            <Feature
              icon={Radio}
              title="Targets & details"
              body="Create, group, mute, pause, and delete probes. Details show a latency chart, an availability strip, the open incident, and a one-off test."
              to="/targets"
              cta="Open targets"
            />
            <Feature
              icon={History}
              title="History"
              body="Every stored check, filterable by target, status, date, and search. Retention is 7, 30, or 90 days. Incidents are not pruned with ping rows."
              to="/history"
              cta="Open history"
            />
            <Feature
              icon={Activity}
              title="Groups"
              body="Color labels on the dashboard and in import/export. Filter the fleet without splitting it into separate apps."
              to="/targets"
              cta="Manage groups"
            />
          </div>
        </Section>

        <Section id="reliability" kicker="04" title="When something actually goes down">
          <div className="grid gap-4 md:grid-cols-3">
            <Feature
              icon={Siren}
              title="Incidents"
              body="An incident opens on offline and closes on recovery. Downtime, failure count, and MTTR live on the Incidents page, with CSV and print."
              to="/incidents"
              cta="Open incidents"
            />
            <Feature
              icon={ShieldCheck}
              title="SLA"
              body="Uptime against 99 / 99.5 / 99.9 / 99.99%. Error budget, MTBF, and MTTR from incidents — not from raw ping rows. CSV, JSON, and print."
              to="/sla"
              cta="Open SLA"
            />
            <Feature
              icon={Wrench}
              title="Maintenance"
              body="Schedule a window for all targets, one group, or one target. Suppress checks and/or notifications so planned work is not an outage alert."
              to="/maintenance"
              cta="Open maintenance"
            />
          </div>
        </Section>

        <Section id="alerts" kicker="05" title="Wake you, without a vendor owning your network">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Kinds: offline, recovery, high latency, timeout. Cooldown is per target and kind (default 10 minutes). Secrets stay in the local database; the UI never shows a saved key again.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {channels.map((ch, i) => (
              <motion.div
                key={ch.name}
                initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.045, ease: appleEase }}
                whileHover={reduce ? undefined : { y: -4, scale: 1.02 }}
                className="rounded-2xl border border-border/80 bg-card/60 px-3 py-4 text-center"
              >
                <p className="text-[13px] font-medium">{ch.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{ch.hint}</p>
              </motion.div>
            ))}
          </div>
          <Button className="mt-5" variant="outline" size="sm" onClick={() => navigate("/notifications")}>
            <Bell className="h-3.5 w-3.5" />
            Open notifications
          </Button>
        </Section>

        <Section id="keep" kicker="06" title="Keep it running on this machine">
          <div className="grid gap-4 md:grid-cols-2">
            <Feature
              icon={Gauge}
              title="Settings"
              body="Start on boot, start monitoring automatically, minimize to tray, theme, log level, thresholds, and history retention."
              to="/settings"
              cta="Open settings"
            />
            <Feature
              icon={Database}
              title="Backup & updates"
              body="Export or restore the SQLite file from Settings. Check GitHub Releases in-app. Windows setup, macOS in Applications, and Linux packages all update from here."
              to="/settings"
              cta="Open data & updates"
            />
            <Feature
              icon={Download}
              title="Import & export"
              body="JSON or CSV of targets, including groups and probe fields. Move a fleet between machines without copying the whole database."
              to="/targets"
              cta="Open targets"
            />
            <Feature
              icon={Pause}
              title="Pause, don't lose"
              body="Stop the scheduler, or pause every check, without deleting targets. Disabled probes stay in the list as Disabled until you turn them back on."
              to="/"
              cta="Open dashboard"
            />
          </div>
          <RevealCard className="mt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Data lives in your user folder — Windows <span className="font-mono text-foreground/80">%AppData%\PingPulse</span>, macOS Application Support, Linux{" "}
                <span className="font-mono text-foreground/80">~/.config/PingPulse</span>. There is no account and no telemetry.
              </p>
            </div>
          </RevealCard>
        </Section>
      </div>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: appleEase }}
        className="relative mt-16 overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-primary/15 via-card to-card px-8 py-12 text-center"
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -left-16 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl"
          animate={reduce ? undefined : { opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="relative text-[11px] font-medium uppercase tracking-[0.22em] text-primary">You have the map</p>
        <h2 className="relative mt-2 text-[1.7rem] font-semibold tracking-[-0.03em]">Now watch the fleet.</h2>
        <p className="relative mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add a host, press Start, and PingPulse will tell you when something goes quiet.
        </p>
        <div className="relative mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate("/targets")}>Add a target</Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Open dashboard
          </Button>
        </div>
      </motion.section>
    </div>
  );
}

function Hero({ reduce, onTour, onAdd }: { reduce: boolean; onTour: () => void; onAdd: () => void }) {
  const mx = useMotionValue(280);
  const my = useMotionValue(140);
  const sx = useSpring(mx, { stiffness: 70, damping: 22, mass: 0.55 });
  const sy = useSpring(my, { stiffness: 70, damping: 22, mass: 0.55 });
  const glow = useMotionTemplate`radial-gradient(520px circle at ${sx}px ${sy}px, hsl(var(--primary) / 0.22), transparent 58%)`;

  return (
    <section
      onMouseMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      className="relative mb-8 overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-b from-primary/10 via-card to-card px-6 py-12 sm:px-12 sm:py-16"
    >
      {reduce ? null : <motion.div className="pointer-events-none absolute inset-0" style={{ background: glow }} />}
      <PulseField reduce={reduce} />
      <div className="relative z-10 max-w-xl">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: appleEase }}
          className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary"
        >
          Guide
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 0.06, ease: appleEase }}
          className="mt-3 text-[2.15rem] font-semibold leading-[1.12] tracking-[-0.04em] text-foreground sm:text-[2.55rem]"
        >
          Know the app
          <br />
          before the outage.
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: reduce ? 0 : 0.14, ease: appleEase }}
          className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]"
        >
          A short tour of every surface — probes, incidents, SLA, alerts, backup, and updates — with the same motion the rest of PingPulse uses.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: reduce ? 0 : 0.22, ease: appleEase }}
          className="mt-7 flex flex-wrap gap-2"
        >
          <Button onClick={onTour}>Start the tour</Button>
          <Button variant="outline" onClick={onAdd}>
            Add a target
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function PulseField({ reduce }: { reduce: boolean }) {
  const hosts = useMemo(
    () => [
      { label: "edge", x: 72, y: 22 },
      { label: "api", x: 88, y: 42 },
      { label: "nas", x: 70, y: 64 },
      { label: "db", x: 90, y: 76 },
    ],
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-y-0 right-[-6%] hidden w-[58%] sm:block" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-[min(440px,78%)] w-[min(440px,92%)] -translate-x-1/2 -translate-y-1/2">
        <svg className="absolute inset-0 h-full w-full text-primary/35" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {hosts.map((h) => (
            <g key={h.label}>
              <motion.line
                x1="50"
                y1="50"
                x2={h.x}
                y2={h.y}
                stroke="currentColor"
                strokeWidth="0.35"
                strokeDasharray="1.2 2.2"
                animate={reduce ? undefined : { strokeDashoffset: [0, -12] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
              />
              <motion.circle
                r="1.1"
                fill="hsl(var(--primary))"
                animate={
                  reduce
                    ? { cx: h.x, cy: h.y, opacity: 0.7 }
                    : { cx: [50, h.x], cy: [50, h.y], opacity: [0, 1, 0] }
                }
                transition={{ duration: 2.4, repeat: Infinity, ease: appleEase, delay: h.x / 80 }}
              />
            </g>
          ))}
        </svg>
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-[8%] rounded-full border border-primary/25"
            animate={reduce ? undefined : { scale: [0.32, 1.08], opacity: [0.5, 0] }}
            transition={{ duration: 4.4, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
          />
        ))}
        <motion.span
          className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_28px_hsl(var(--primary))]"
          animate={reduce ? undefined : { scale: [1, 1.18, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {hosts.map((h, i) => (
          <motion.span
            key={h.label}
            className="absolute flex items-center gap-1.5"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 3.4 + i * 0.28, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            <span className="rounded-full border border-border/60 bg-background/75 px-2 py-0.5 text-[10px] font-medium text-foreground/80 backdrop-blur">
              {h.label}
            </span>
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function ProbeScene({ kind, reduce }: { kind: (typeof probes)[number]["id"]; reduce: boolean }) {
  if (kind === "http") {
    return (
      <div className="relative h-28 overflow-hidden rounded-2xl bg-muted/40">
        <span className="absolute left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-xl border border-border bg-card" />
        <span className="absolute right-4 top-1/2 flex h-8 -translate-y-1/2 items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          200
        </span>
        <motion.span
          className="absolute top-[38%] rounded-full bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground"
          animate={reduce ? { left: "42%" } : { left: ["12%", "70%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: appleEase }}
        >
          GET
        </motion.span>
        <motion.span
          className="absolute top-[58%] rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400"
          animate={reduce ? { left: "42%" } : { left: ["70%", "12%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.9, delay: 0.35, repeat: Infinity, ease: appleEase }}
        >
          200 OK
        </motion.span>
      </div>
    );
  }
  if (kind === "tcp") {
    const packets = [
      { label: "SYN", y: "28%", delay: 0 },
      { label: "SYN-ACK", y: "50%", delay: 0.35 },
      { label: "ACK", y: "72%", delay: 0.7 },
    ];
    return (
      <div className="relative h-28 overflow-hidden rounded-2xl bg-muted/40">
        <span className="absolute left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-xl border border-border bg-card" />
        <span className="absolute right-4 top-1/2 flex h-8 -translate-y-1/2 items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          :22 open
        </span>
        {packets.map((p) => (
          <motion.span
            key={p.label}
            className="absolute rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-medium text-primary-foreground"
            style={{ top: p.y }}
            animate={reduce ? { left: "42%" } : { left: ["12%", "68%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.7, delay: p.delay, repeat: Infinity, ease: appleEase }}
          >
            {p.label}
          </motion.span>
        ))}
      </div>
    );
  }
  return (
    <div className="relative h-28 overflow-hidden rounded-2xl bg-muted/40">
      <motion.span
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "conic-gradient(from 0deg, transparent 0 78%, hsl(var(--primary) / 0.45) 100%)" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
      />
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30"
          animate={reduce ? undefined : { scale: [0.4, 1.35], opacity: [0.5, 0] }}
          transition={{ duration: 2.4, delay: i * 0.55, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
      <span className="absolute right-4 top-1/2 flex h-8 -translate-y-1/2 items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        ICMP ok
      </span>
    </div>
  );
}

function MiniStrip({ reduce }: { reduce: boolean }) {
  const cells = [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  return (
    <div className="flex h-3 overflow-hidden rounded-full border border-border/70">
      {cells.map((v, i) => (
        <motion.span
          key={i}
          className={cn(
            "h-full flex-1",
            v === 1 ? "bg-emerald-500/80" : v === 0 ? "bg-rose-500/80" : "bg-amber-400/80",
          )}
          initial={reduce ? false : { opacity: 0, scaleY: 0.2 }}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: reduce ? 0 : i * 0.03, ease: appleEase }}
        />
      ))}
    </div>
  );
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{kicker}</p>
      <h2 className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RevealCard({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.25 });
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.55, delay, ease: appleEase }}
      className={cn("rounded-2xl border border-border/80 bg-card/70 p-5", className)}
    >
      {children}
    </motion.div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
  to,
  cta,
}: {
  icon: typeof LayoutDashboard;
  title: string;
  body: string;
  to: string;
  cta: string;
}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  return (
    <RevealCard>
      <motion.div whileHover={reduce ? undefined : { y: -3 }} transition={springSoft}>
        <motion.div
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary"
          whileHover={reduce ? undefined : { rotate: -8, scale: 1.08 }}
          transition={springSoft}
        >
          <Icon className="h-4 w-4" />
        </motion.div>
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <Button className="mt-4" variant="ghost" size="sm" onClick={() => navigate(to)}>
          {cta}
        </Button>
      </motion.div>
    </RevealCard>
  );
}
