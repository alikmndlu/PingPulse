# Changelog

## Unreleased

- Backup and restore of the local SQLite database (includes targets, history, incidents, settings, and notification secrets). Settings shows the data folder and can open the folder or log file.
- First-run welcome: optional sample ICMP target (`1.1.1.1`) and a pointer to Notifications.
- Quiet menu: 1 hour, 8 hours, until tomorrow 8:00, or a custom time.
- Confirm before deleting a target or pausing all checks.
- Ping history retention is 7 / 30 / 90 days (incidents are not pruned).
- Release assets now ship with `SHA256SUMS.txt`.
- Windows first install is an NSIS setup (`windows-amd64-setup.exe`) under `%LOCALAPPDATA%\Programs\PingPulse`. In-app updates still download the zip and replace that installed exe.
- macOS first install is a disk image (`darwin-universal.dmg`) with PingPulse.app and an Applications shortcut. In-app updates download the tarball and replace the app in a writable folder.
- Linux first install is a `.deb` or `.rpm` under `/opt/pingpulse` (desktop entry + `pingpulse` command). In-app updates open the new package; a tarball in a writable folder still self-replaces.

## 2.0.0

Cross-platform Wails desktop app with ICMP / HTTP / TCP probes, groups, maintenance, incidents, SLA reports, Discord / Slack / Teams webhooks, and in-app updates from GitHub Releases.
