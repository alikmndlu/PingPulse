# Changelog

## Unreleased

- Backup and restore of the local SQLite database (includes targets, history, incidents, settings, and notification secrets). Settings shows the data folder and can open the folder or log file.
- First-run welcome: optional sample ICMP target (`1.1.1.1`) and a pointer to Notifications.
- Quiet menu: 1 hour, 8 hours, until tomorrow 8:00, or a custom time.
- Confirm before deleting a target or pausing all checks.
- Ping history retention is 7 / 30 / 90 days (incidents are not pruned).
- Release assets now ship with `SHA256SUMS.txt`.
- CI runs `go test` and frontend tests on pull requests.

## 2.0.0

Cross-platform Wails desktop app with ICMP / HTTP / TCP probes, groups, maintenance, incidents, SLA reports, Discord / Slack / Teams webhooks, and in-app updates from GitHub Releases.
