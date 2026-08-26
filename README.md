<div align="center">

# PingPulse

**Know when your infrastructure goes silent.**

A personal, cross-platform desktop monitor for IPs and hostnames.
Ping on a schedule. Catch real outages. Alert on your terms.

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![Wails](https://img.shields.io/badge/Wails-v2.15-red?style=flat-square)](https://wails.io)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Release](https://img.shields.io/github/v/release/alikmndlu/PingPulse?style=flat-square&label=release)](https://github.com/alikmndlu/PingPulse/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-111827?style=flat-square)](https://github.com/alikmndlu/PingPulse/releases)

[Download](https://github.com/alikmndlu/PingPulse/releases/latest) · [Source](https://github.com/alikmndlu/PingPulse) · [Report an issue](https://github.com/alikmndlu/PingPulse/issues)

</div>

---

PingPulse is a native desktop app — not a SaaS, not a cloud agent, not a browser tab you forget to refresh. It lives in the system tray, probes your hosts with **ICMP**, **HTTP**, or **TCP**, stores history locally in SQLite, and can wake you through desktop toasts, SMS, webhooks, or Telegram.

Built for people who run their own boxes and want to know the moment one of them goes quiet.

## What's new in 2.0

**v2.0.0** is the cross-platform Wails desktop build again (Go backend + React UI under `frontend/`), with the operational features that ship in this tree:

- **Multi-probe targets** — ICMP ping, HTTP status checks, and TCP port dials on one list (same host can have more than one probe)
- **Groups** — color labels, dashboard filters, and group names in JSON/CSV import-export
- **Maintenance windows** — scope to all targets, one group, or one target; suppress checks and/or notifications
- **Incidents** — open on offline, close on recovery; downtime, MTTR, and per-target uptime on the Incidents page
- **Quiet hours** — global mute (Quiet 1 hour) and per-target mute without stopping probes
- **In-app updates** — check and install from GitHub Releases
- **Release CI** — tagged `v*` pushes build Windows, macOS, and Linux assets automatically

Product version is stamped in `internal/updater/version.go`, `wails.json`, and `build/windows/info.json` (**2.0.0**).

## Why PingPulse

Most “uptime” tools assume a server, an account, and a monthly invoice. PingPulse assumes a laptop, a list of hosts, and the desire to keep secrets on disk.

| You want | PingPulse does |
| --- | --- |
| Know when a host is actually down | Failure / recovery thresholds, not a single missed ping |
| Keep running with the window closed | Scheduler + system tray |
| Own the data | Local SQLite, WAL mode, no telemetry |
| Get alerted without giving a vendor your network | Desktop, SMS, webhook, Telegram, Discord, Slack, Teams |
| Ship it to three operating systems | One Wails codebase, tagged GitHub Releases |

## Features

**Monitoring**
- Per-target probes: **ICMP**, **HTTP** (status check), and **TCP** (port dial) with interval, timeout, retries, retry delay
- Status model: `online` · `offline` · `unknown` · `disabled`
- Configurable **failure threshold** and **recovery threshold** so flapping links do not spam you
- High-latency and timeout events, independent of offline detection
- **Maintenance windows** (all targets, one group, or one target) that can suppress checks and/or notifications
- **Incidents** open on offline and close on recovery, with downtime / MTTR outage reports
- **SLA reports** against 99 / 99.5 / 99.9 / 99.99%, with error budget, MTBF, and MTTR
- Pause all checks, or stop the scheduler entirely, without losing targets

**Product surface**
- Live dashboard: counts, uptime %, open incidents, active maintenance, status donut, group filter
- Target list with probe type, endpoint, enable/disable, mute, and groups
- Target details: latency area chart, availability strip, open incident / maintenance badges, recent events
- Incidents page: filterable outage list plus CSV / print export
- SLA page: compliance vs a chosen target, error budget, CSV / JSON / print
- Maintenance page: schedule windows with scope and suppress options
- History with filters: target, status, date range, search
- JSON / CSV import and export (including group names and probe fields)
- SQLite backup / restore from Settings, plus Open data folder and Open log

**Operations**
- Dark / light theme
- Start on boot, start monitoring automatically, minimize to tray
- Global mute (1 hour, 8 hours, until tomorrow morning, or a custom time) and per-target mute
- In-app updates from GitHub Releases
- Structured JSON logs with secret redaction

**Notifications**
- Desktop toasts (WinRT / AppleScript / `notify-send`)
- SMS over a generic HTTP API (Melipayamak-shaped defaults)
- Webhooks with JSON templates
- Telegram bots
- Discord, Slack, and Microsoft Teams incoming webhooks
- Per-kind cooldown so the same alert does not fire every interval

## Architecture

The React UI never talks to SQLite or ICMP. Wails bindings on `App` are the only bridge. The engine, scheduler, notifications, and database are independent Go packages.

```mermaid
flowchart LR
  subgraph UI["Frontend"]
    React["React + TypeScript<br/>Tailwind · shadcn/ui"]
  end

  subgraph Shell["Wails v2"]
    Bind["App bindings"]
    Events["Events"]
  end

  subgraph Core["Go backend"]
    Sched["Scheduler"]
    Engine["Probe engine"]
    ICMP["ICMP / HTTP / TCP"]
    Hub["Notification hub"]
    Repo["Repositories"]
    DB[("SQLite WAL")]
    Tray["System tray"]
    Upd["Updater"]
  end

  React --> Bind
  Bind --> Sched
  Bind --> Hub
  Bind --> Repo
  Bind --> Upd
  Sched --> Engine
  Engine --> ICMP
  Engine --> Repo
  Engine --> Hub
  Repo --> DB
  Engine --> Events
  Hub --> Events
  Events --> React
  Tray --> Bind
```

```
internal/
  domain/          entities, validation, event names, mute helpers
  database/        SQLite open + SQL migrations
  repository/      targets, results, events, settings, notifications, groups, incidents, maintenance
  monitor/         ICMP/HTTP/TCP probers, status evaluator, check engine, maintenance + incidents
  scheduler/       one goroutine per enabled target, context cancellation
  notification/    provider interface + desktop / SMS / webhook / Telegram / Discord / Slack / Teams
  autostart/       Windows Run key, macOS LaunchAgent, Linux .desktop
  tray/            systray menu, offline count on the tooltip
  updater/         GitHub latest-release check + self-replace
  logging/         slog JSON + secret redaction
  config/          per-OS user data paths
  impex/           JSON / CSV import-export
  appicon/         generated pulse icon

frontend/src/
  pages/           Dashboard, Targets, Incidents, Maintenance, History, Notifications, Settings
  components/      charts, groups, forms, shadcn primitives
  stores/          zustand (theme, monitoring, mute, refresh)
  services/api.ts  typed Wails wrappers
```

Startup path:

1. Resolve the user data directory and open `pingpulse.db`
2. Apply pending SQL migrations
3. Load settings, optionally enable autostart and start the scheduler
4. Start the tray
5. Frontend subscribes to live Wails events

## Quick start

### Download a build

Grab the latest asset for your OS from **[Releases](https://github.com/alikmndlu/PingPulse/releases/latest)**.

| OS | Asset | Run |
| --- | --- | --- |
| Windows x64 | `PingPulse-<tag>-windows-amd64.zip` | Extract and run `PingPulse.exe` |
| macOS universal | `PingPulse-<tag>-darwin-universal.tar.gz` | Extract and open `PingPulse.app` |
| Linux x64 | `PingPulse-<tag>-linux-amd64.tar.gz` | Extract, `chmod +x PingPulse`, run it |

Linux builds are linked against **WebKitGTK 4.1** (Ubuntu 24.04+, Fedora 40+, Debian 12+):

```bash
# Debian / Ubuntu 24.04+
sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0

# Fedora 40+
sudo dnf install gtk3 webkit2gtk4.1
```

macOS builds are unsigned (no Apple Developer ID / notarization yet), so Gatekeeper will block the first launch. That warning is expected.

1. In the **"PingPulse" Not Opened** dialog, click **Done** — not Move to Trash.
2. Open **System Settings → Privacy & Security**.
3. Scroll to **Security**. Next to *“PingPulse was blocked…”* click **Open Anyway**.
4. Confirm, then open `PingPulse.app` again.

Or strip the download quarantine and launch from Terminal:

```bash
xattr -cr ~/Downloads/PingPulse.app
open ~/Downloads/PingPulse.app
```

### Verify a packaged build

Do this once with a GitHub Release asset, not `wails dev`. That is where long-lived bugs show up.

1. Extract and launch the app
2. Enable **Start application on boot**
3. Confirm the tray icon, then hide the window
4. Keep or add an ICMP target
5. Notifications → Telegram → **Send test**
6. Header **Quiet** → a short custom time, then unmute
7. Settings → **Check for updates** (install only works on a packaged build)

If you are coming from **v1.x**, install this build manually first. After that, in-app updates work.

### Develop from source

**Requirements**

| Tool | Version |
| --- | --- |
| Go | 1.25+ |
| Node.js | 24+ |
| pnpm | 10+ |
| Wails CLI | v2.15.0 |
| C compiler | MinGW-w64 (Windows), Xcode CLT (macOS), `gcc` (Linux) |

Linux also needs `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, and `libayatana-appindicator3-dev`. Windows needs WebView2 (already present on recent Windows 10/11). CGO is required for the Wails shell; SQLite itself is pure Go (`modernc.org/sqlite`).

```bash
git clone https://github.com/alikmndlu/PingPulse.git
cd PingPulse

go install github.com/wailsapp/wails/v2/cmd/wails@v2.15.0
go mod download
cd frontend && pnpm install && cd ..

wails dev
```

`wails dev` starts the Go backend, Vite, and hot reload. Bindings land in `frontend/wailsjs`.

Frontend-only (no live ping engine):

```bash
cd frontend
pnpm dev
```

## Using the app

| Screen | What it is for |
| --- | --- |
| **Dashboard** | Fleet pulse: online / offline / unknown, open incidents, active maintenance, uptime, group filter |
| **Targets** | Create, edit, enable, mute, group, and delete probes (ICMP / HTTP / TCP) |
| **Target details** | Latency series, availability strip, open incident / maintenance badges, recent events, one-off test |
| **Incidents** | Outage list, downtime / MTTR, CSV and print export |
| **SLA** | Uptime vs 99–99.99%, error budget, MTBF/MTTR, CSV / JSON / print |
| **Maintenance** | Schedule windows with scope and suppress checks / notifications |
| **History** | Every stored probe result, filterable |
| **Notifications** | Provider credentials, templates, test send, alert kinds |
| **Settings** | Defaults, thresholds, theme, logging, autostart, tray, in-app updates |

**Quiet 1 hour** in the header mutes every channel globally. The same mute exists per target. Mutes expire automatically; they do not stop pinging, they only suppress alerts.

### Defaults

| Setting | Default |
| --- | --- |
| Interval | 120s |
| Timeout | 5s |
| Retries | 3 |
| Retry delay | 2s |
| Failure threshold | 3 consecutive failures → offline |
| Recovery threshold | 2 consecutive successes → online |
| Notification cooldown | 600s per target + kind |
| High-latency threshold | 500ms (off by default) |
| Theme | Dark |
| Log level | `info` |

Hosts are IPv4/IPv6 or DNS names. For ICMP, `http://` prefixes, ports, and trailing paths are stripped. HTTP probes keep a full URL (`httpUrl`); TCP probes keep `host` + `tcpPort`. Uniqueness is `(probe type, host, tcp port, HTTP URL)`, so one box can have an ICMP check and an HTTPS check at the same time. Minimum interval is 5 seconds.

## Probe notes

**ICMP** uses [`prometheus-community/pro-bing`](https://github.com/prometheus-community/pro-bing).

- **Windows** — native ICMP (`SetPrivileged(true)`).
- **Linux / macOS** — unprivileged UDP ICMP when the OS allows it. Some hosts still need `CAP_NET_RAW` or root for raw ICMP.

**HTTP** performs a request to the configured URL and treats the probe as successful when the status code matches `expectStatus` (default `200`).

**TCP** dials `host:port` within the timeout; a successful connect is online.

A check that times out, fails DNS, or never receives a packet is a failed probe. The evaluator only marks a target **offline** after `failureThreshold` consecutive failures, and **online** again after `recoveryThreshold` consecutive successes. That is the difference between “the network hiccuped” and “the box is gone”.

During an active **maintenance window**, PingPulse can skip checks and/or suppress notifications for the scoped targets. If checks still run, offline transitions continue to open **incidents** for the outage report even when alerts are quiet.

## Notifications

Every channel implements the same interface:

```go
type Provider interface {
    Name() string
    Send(ctx context.Context, n domain.Notification) error
}
```

| Provider | How it delivers |
| --- | --- |
| **desktop** | WinRT toast (Windows), `osascript` (macOS), `notify-send` (Linux) |
| **sms** | Generic HTTP API. Defaults are shaped for Melipayamak |
| **webhook** | HTTP POST (or your method) with a JSON body template |
| **telegram** | Bot token + chat ID against `https://api.telegram.org` |
| **discord** | Channel webhook (`{"content":"..."}`) |
| **slack** | Incoming webhook (`{"text":"..."}`) |
| **teams** | Incoming webhook (`{"text":"..."}`) |

Alert kinds: `offline`, `recovery`, `high_latency`, `timeout`. Each kind can be toggled in Settings. Cooldown is per `(target, kind)`.

API keys live in SQLite on the local machine. They are never returned to the UI after save, never written to logs, and never hardcoded.

**Template variables**

`{{name}}` `{{host}}` `{{status}}` `{{failures}}` `{{latency}}` `{{lastSuccess}}` `{{time}}` `{{title}}` `{{body}}` `{{kind}}`

### Adding a provider

1. Implement `notification.Provider` under `internal/notification`.
2. Register it in `app.go` when constructing `notification.NewHub(...)`.
3. Add an enable flag on `domain.Settings` if the user should toggle it.
4. Persist extra fields through `NotificationRepository` if needed.
5. Expose the config through the existing Wails methods (or a small additive one).

Keep HTTP timeouts on the client. Never log secrets.

## Data, config, and logs

Nothing lives in env files. Everything is in the user data directory:

| OS | Directory |
| --- | --- |
| Windows | `%AppData%\PingPulse\` |
| macOS | `~/Library/Application Support/PingPulse/` |
| Linux | `~/.config/PingPulse/` |

| File | Purpose |
| --- | --- |
| `pingpulse.db` | SQLite, WAL, `foreign_keys=ON`, `busy_timeout=5000`. **Settings → Data and backup** exports a snapshot (includes Telegram / SMS keys). Restore overwrites this file and quits the app. |
| `pingpulse.log` | JSON logs, mode `0600`, secrets redacted |

Migrations are versioned SQL under `internal/database/migrations` and applied on startup.

| Table | Role |
| --- | --- |
| `targets` | Probes, last status, consecutive counters, group, mute, HTTP/TCP fields |
| `target_groups` | Named color groups |
| `ping_results` | Every check; pruned by **history retention** (7 / 30 / 90 days) |
| `events` | Offline / recovery / latency / timeout |
| `incidents` | Open / resolved outages with duration and failure count (not pruned with ping history) |
| `maintenance_windows` | Scheduled scopes (all / group / target); suppress checks and/or alerts |
| `notification_configs` | Provider credentials and templates |
| `notification_cooldowns` | Last send per target + kind |
| `app_settings` | Single-row JSON blob |

There is no analytics, no crash reporter, and no network call except probes to *your* hosts, the notification endpoints *you* configure, and GitHub when you check for updates.

## In-app updates

Settings → **Check for updates** calls the public GitHub Releases API for [`alikmndlu/PingPulse`](https://github.com/alikmndlu/PingPulse/releases).

- Compares the running semver with `tag_name`
- Downloads only assets from `github.com/alikmndlu/PingPulse/releases/download/`
- Picks `windows-amd64.zip`, `linux-amd64.tar.gz`, or `darwin-universal.tar.gz`
- Replaces the running binary (or `.app` on macOS) and restarts

`wails dev` can *check*, but will not *install* — the process is a throwaway build. **If you are on v1.x (or any build without the updater), install the newest GitHub Release by hand once.** After that, later versions can update themselves.

Each release also attaches `SHA256SUMS.txt`. Builds are not Authenticode-signed or Apple-notarized yet; SmartScreen and Gatekeeper warnings are expected.

Release CI stamps the version into the binary:

```text
-ldflags "-X pingpulse/internal/updater.Version=vX.Y.Z"
```

Local `wails dev` falls back to `internal/updater/version.go`. Keep that, `wails.json` `productVersion`, and `build/windows/info.json` in sync when you bump.

## Building

Current machine:

```bash
wails build
```

Cross-platform (from a matching or properly tooled host, CGO on):

```bash
wails build -platform windows/amd64 -webview2 embed
wails build -platform darwin/universal
wails build -platform linux/amd64 -tags webkit2_41
```

Output: `build/bin`.

| OS | Artifact | Desktop bits |
| --- | --- | --- |
| Windows | `PingPulse.exe` + WebView2 (embedded in CI) | Tray, WinRT toasts, start-on-boot |
| macOS | `PingPulse.app` | Tray, LaunchAgent, AppleScript notifications |
| Linux | `PingPulse` | GTK / WebKitGTK 4.1, `.desktop` autostart, `notify-send` |

## Releasing

Pushing a tag that matches `v*` runs [`.github/workflows/release.yml`](.github/workflows/release.yml): Windows, Linux, and macOS in parallel, then a GitHub Release with the three archives.

The tagged commit **must** include the Go module and desktop sources (`go.mod`, `main.go`, `wails.json`, `frontend/`). Setup Go reads the version from `go.mod`; without it the matrix fails immediately.

```bash
# 1. Bump Version in version.go, wails.json, build/windows/info.json (keep them in sync)
# 2. Commit and push main
git push origin main
git tag v2.0.0
git push origin v2.0.0
```

If `v2.0.0` already points at an older commit, either move the tag after the fixed commit is on `main`, or cut `v2.0.1` instead.

Wait for the **Release** workflow. Download from the Releases page, or let an already-updated install pick it up from Settings.

## Testing

```bash
go test ./internal/...
```

```bash
cd frontend
pnpm test
pnpm run build
```

Backend coverage includes status evaluation, failure/recovery thresholds, scheduler start/stop/pause, SMS HTTP delivery, cooldown, repositories, incidents, maintenance windows, import parsing, and updater version/asset selection.

Frontend tests run under Vitest + Testing Library.

## Live events

The UI is event-driven. A 15s dashboard refresh is only a safety net.

| Event | When |
| --- | --- |
| `target:status_changed` | Evaluator transitions status |
| `target:ping_completed` | A check finished |
| `notification:sent` | A provider attempted delivery |
| `monitoring:started` | Scheduler is running |
| `monitoring:stopped` | Scheduler stopped or paused |
| `event:created` | An alert/recovery event was stored |
| `mute:changed` | Global or per-target mute changed |
| `groups:changed` | A group was created, updated, or deleted |
| `incident:updated` | An incident opened or resolved |
| `maintenance:changed` | A maintenance window was created, updated, or deleted |
| `update:progress` | Update download percent |

## Stack

| Layer | Choice |
| --- | --- |
| Desktop shell | [Wails v2](https://wails.io) |
| Backend | Go 1.25, CGO for the webview only |
| Ping | `prometheus-community/pro-bing` |
| Database | `modernc.org/sqlite` |
| Tray | `energye/systray` |
| UI | React 18, TypeScript, Vite, Tailwind, shadcn/ui, Radix |
| Charts | Recharts |
| State | Zustand |
| Toasts | Sonner |
| CI | GitHub Actions → tagged Releases |

## Security posture

- Secrets stay in the local DB; the UI receives `apiKeySet`, not the key
- Logs redact `api_key`, `token`, `authorization`, `bearer`, `secret`, `password`
- Update downloads are host-allowlisted to this repo’s GitHub Releases
- Update archives reject zip-slip paths
- Data directory and log file are created with restrictive permissions
- Public Wails errors are sanitized; internal details stay in logs

This is a personal desktop tool. Treat the machine it runs on as the trust boundary.

## License

PingPulse is released under the [MIT License](LICENSE). Copyright (c) 2026 Ali Kamandlu.

---

<div align="center">

**PingPulse** — know when your infrastructure goes silent.

[Releases](https://github.com/alikmndlu/PingPulse/releases/latest) · [Issues](https://github.com/alikmndlu/PingPulse/issues)

</div>
