# Contributing to PingPulse

Thanks for wanting to help. PingPulse is a personal, local desktop monitor — Go + [Wails v2](https://wails.io) + React. The bar is simple: **it has to work as a packaged app**, not only under `wails dev`.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before opening an issue or pull request.

## Ways to contribute

- **Bugs** — a packaged-build repro beats a `wails dev` screenshot. Use the [bug report](https://github.com/alikmndlu/PingPulse/issues/new/choose) form.
- **Features** — open an issue first if the change is large (new probe type, new OS, new notification provider). Small UX and docs PRs are welcome without a ticket.
- **Docs** — README, this file, SECURITY, and release notes. Keep the product language **English**.
- **Security** — do **not** file a public issue. Follow [SECURITY.md](SECURITY.md).

## Development setup

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

`wails dev` starts the Go backend, Vite, and hot reload. Bindings land in `frontend/wailsjs`. After you change a Go method on `App`, restart `wails dev` so the frontend bindings refresh.

Frontend-only (no live ping engine):

```bash
cd frontend
pnpm dev
```

### Tests

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

## Project map

The React UI never talks to SQLite or ICMP. Wails bindings on `App` are the only bridge.

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
  updater/         GitHub latest-release check + install / package-open
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

## Making a change

1. Branch from `main`. Keep the PR focused — one problem, one fix.
2. Match the surrounding style. Do not reformat unrelated files.
3. Do not commit `frontend/node_modules`, `build/bin`, `.exe`, databases, or secrets.
4. If you add a Wails-exported method, update `frontend/src/services/api.ts` and the generated `frontend/wailsjs` types when they change.
5. Never log API keys, tokens, or backup paths that include secrets. Follow the redaction already in `internal/logging`.
6. UI copy is English. Product behavior must stay consistent across Dashboard, Targets, and Settings if you touch shared state.

### Adding a notification provider

1. Implement `notification.Provider` under `internal/notification`.
2. Register it in `app.go` when constructing `notification.NewHub(...)`.
3. Add an enable flag on `domain.Settings` if the user should toggle it.
4. Persist extra fields through `NotificationRepository` if needed.
5. Expose the config through the existing Wails methods (or a small additive one).

Keep HTTP timeouts on the client. Never log secrets.

```go
type Provider interface {
    Name() string
    Send(ctx context.Context, n domain.Notification) error
}
```

### Pull requests

- Title in the same style as existing commits: `feat:`, `fix:`, `ci:`, `docs:`.
- Describe **why**, not a file list.
- Link the issue if there is one.
- Include a test plan: what you ran (`go test`, `pnpm test`, packaged app if the change is tray / updater / autostart).

Use the pull request template. Do not force-push `main`.

## Building a local package

```bash
wails build
```

Cross-platform (from a matching or properly tooled host, CGO on):

```bash
wails build -platform windows/amd64 -webview2 embed -nsis -installscope user
wails build -platform darwin/universal
wails build -platform linux/amd64 -tags webkit2_41
```

Output: `build/bin`. Installers for GitHub Releases are produced by [`.github/workflows/release.yml`](.github/workflows/release.yml), not by a local `wails build` alone.

`wails dev` can *check* for updates but will not *install* — the process is a throwaway build.

## Releasing (maintainers)

Keep these three in sync when you bump the product version:

- `internal/updater/version.go`
- `wails.json` → `info.productVersion`
- `build/windows/info.json`

```bash
git push origin main
git tag v2.1.1
git push origin v2.1.1
```

A tag matching `v*` runs the Release workflow: Windows setup, macOS DMG, Linux `.deb`/`.rpm`, updater archives, and `SHA256SUMS.txt`.

The tagged commit **must** include the Go module and desktop sources (`go.mod`, `main.go`, `wails.json`, `frontend/`). Setup Go reads the version from `go.mod`.

If the tag already points at an older commit, cut the next patch instead of rewriting a published tag that people may have downloaded.

## License

By contributing, you agree that your work is licensed under the [MIT License](LICENSE), the same as the rest of PingPulse.
