# PingPulse

**Know when your infrastructure goes silent.**

PingPulse is a cross-platform desktop monitor for IP addresses and hostnames. It pings your targets on a schedule, detects real outages with configurable failure/recovery thresholds, stores history in SQLite, and can alert you through desktop notifications, SMS (generic HTTP), or webhooks.

Built with **Go**, **Wails v2**, **React**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

## Features

- Dashboard with live Online / Offline / Unknown / error counts
- Per-target ICMP ping engine (interval, timeout, retries, retry delay)
- Failure threshold and recovery threshold to avoid flapping alerts
- Scheduler that keeps running while the window is in the tray
- SQLite persistence with migrations for targets, ping results, events, notification configs, and settings
- Notification providers behind a common interface: SMS HTTP, desktop, webhook
- Notification rules: offline, recovery, high latency, timeout, plus per-target cooldown
- History filters (target, status, date range, search)
- Target details with latency, availability, and success/failure charts
- JSON / CSV import and export
- Dark / light theme, start on boot, minimize to tray
- In-app updates from GitHub Releases (Settings → Check for updates)
- Structured logging with secret redaction

## Architecture

```
internal/
  domain/          entities, validation, event names
  database/        SQLite + SQL migrations
  repository/      persistence
  monitor/         ICMP pinger, status evaluator, check engine
  scheduler/       per-target goroutines with context cancellation
  notification/    provider interface + SMS/webhook/desktop
  autostart/       OS startup registration
  tray/            system tray menu
  updater/         GitHub release check and self-update
  logging/         slog JSON logs with redaction
  config/          user data paths
  impex/           JSON/CSV import-export

frontend/src/
  pages/ layouts/ components/ stores/ services/ types/
```

The ping engine, scheduler, notifications, and database are independent packages wired together in `app.go` through Wails bindings. The React UI never talks to SQLite or ICMP directly.

## Requirements

- Go 1.25+
- Node.js 24+
- pnpm
- Wails CLI v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@v2.15.0`)
- A C compiler for Wails desktop builds (GCC / MinGW-w64 on Windows, Xcode CLT on macOS, `gcc` on Linux)
- Linux: `libgtk-3-dev` and `libwebkit2gtk-4.1-dev` (build with `-tags webkit2_41`)
- Windows: WebView2 (bundled on recent Windows 10/11)

ICMP notes:

- Windows uses the native ICMP API (`SetPrivileged(true)`).
- Linux/macOS use unprivileged UDP ICMP when possible. Some hosts still require `CAP_NET_RAW` or root for raw ICMP.

## Development setup

```bash
git clone <repo-url> PingPulse
cd PingPulse
go mod download
cd frontend && pnpm install && cd ..
```

## Running locally

```bash
wails dev
```

This starts the Go backend, Vite, and hot reload. Wails bindings are generated under `frontend/wailsjs`.

Frontend-only (no live ping engine):

```bash
cd frontend
pnpm dev
```

## Building

Current OS:

```bash
wails build
```

Platform-specific:

```bash
wails build -platform windows/amd64
wails build -platform darwin/amd64
wails build -platform darwin/arm64
wails build -platform linux/amd64 -tags webkit2_41
```

The binary is written to `build/bin`.

## GitHub Release

Pushing a version tag starts a GitHub Action that builds Windows, macOS, and Linux binaries and publishes them on the Releases page.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Tag names must start with `v` (`v1.0.0`, `v1.0.1`, …). After the workflow finishes, download the zip/tarballs from **GitHub → Releases**.

The Settings page **Check for updates** button reads the latest GitHub Release, compares it with the running version, and can download and replace the current binary. The first build that includes this updater must be installed by hand; later versions can update themselves from inside the app.

Linux releases are linked against **WebKitGTK 4.1**. Install the runtime before running the binary:

```bash
# Debian / Ubuntu 24.04+
sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0

# Fedora 40+
sudo dnf install gtk3 webkit2gtk4.1
```

## Configuration

Settings live in the SQLite database (not env files):

| OS | Data directory |
| --- | --- |
| Windows | `%AppData%\PingPulse\` |
| macOS | `~/Library/Application Support/PingPulse/` |
| Linux | `~/.config/PingPulse/` |

Files:

- `pingpulse.db` — application database (WAL mode)
- `pingpulse.log` — JSON logs

The Settings page controls start-on-boot, tray behavior, default ping values, thresholds, theme, and log level (`debug`, `info`, `warn`, `error`).

## Database

SQLite schema is created and versioned by SQL migrations in `internal/database/migrations`. On startup PingPulse:

1. Opens the DB with `foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000`
2. Applies any pending migrations
3. Loads settings and optionally starts monitoring

Core tables: `targets`, `ping_results`, `events`, `notification_configs`, `app_settings`, `notification_cooldowns`.

Ping history is pruned per target (latest 2000 rows) so the database cannot grow without bound.

## Notification providers

Providers implement:

```go
type Provider interface {
    Name() string
    Send(ctx context.Context, n domain.Notification) error
}
```

Built-in:

- **desktop** — native toast (PowerShell WinRT on Windows, `osascript` on macOS, `notify-send` on Linux)
- **sms** — generic HTTP API (URL, API key, sender, recipient, method, headers, body template)
- **webhook** — same HTTP client, typically JSON payloads

API keys are stored locally, never returned to the UI, never written to logs, and never hardcoded.

Template variables: `{{name}}`, `{{host}}`, `{{status}}`, `{{failures}}`, `{{latency}}`, `{{lastSuccess}}`, `{{time}}`, `{{title}}`, `{{body}}`, `{{kind}}`.

## Adding a new notification provider

1. Create a type in `internal/notification` that implements `Provider`.
2. Register it in `app.go` when constructing `notification.NewHub(...)`.
3. Add an enable flag in `domain.Settings` if the user should toggle it.
4. Optionally persist extra config through `NotificationRepository`.
5. Expose any new settings through existing Wails bindings or a small additive method.

Keep HTTP timeouts on the client, and never log secrets.

## Testing

Backend:

```bash
go test ./internal/...
```

Frontend:

```bash
cd frontend
pnpm test
pnpm run build
```

Covered backend areas include ping status evaluation, failure/recovery thresholds, scheduler start/stop, SMS HTTP delivery, cooldown, repositories, and import parsing.

## Cross-platform build

Wails compiles a native WebView shell plus the Go backend:

- **Windows** — `.exe` with WebView2, tray icon, WinRT toasts
- **macOS** — `.app` bundle, LaunchAgent autostart, AppleScript notifications
- **Linux** — GTK/WebKit, `.desktop` autostart, `notify-send`

Use `wails build -platform <os>/<arch>` from a matching or properly configured cross-compile environment. CGO must be enabled for the Wails desktop shell.

## Wails events

The UI subscribes to:

- `target:status_changed`
- `target:ping_completed`
- `notification:sent`
- `monitoring:started`
- `monitoring:stopped`
- `event:created`
- `update:progress`

Dashboard auto-refresh is a light 15s safety net; live updates come from these events.

## License

Use and modify freely for your own infrastructure monitoring.
