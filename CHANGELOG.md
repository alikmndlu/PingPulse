# Changelog

All notable changes to PingPulse are documented here.

## Unreleased

## 2.1.3 — 2026-08-27

### Packaging

- Linux `.deb` and `.rpm` packages build again. nfpm resolves every `contents[].src` against its own working directory, not the config file's directory, so the paths in `build/linux/nfpm.yaml` are now repo-root relative. Packaging failed on the 2.1.2 tag, which stopped that release from publishing.

## 2.1.2 — 2026-08-26

### App

- In-app **Help** tour covering probes, dashboard, incidents, SLA, maintenance, alerts, backup, and updates. Motion respects reduced-motion.
- First-run welcome can open the guide instead of skipping.
- The rest of the desktop UI matches that Help language: page kickers, metric cards, fleet pulse, and quieter empty states.
- Page changes use overlapping iOS-style motion without delaying Wails queries. Revisits show cached data immediately; first loads use skeleton placeholders.

### Internals

- Wails models map `time.Time` to string so `wails dev` binding generation does not stall.

## 2.1.1 — 2026-08-26

Installable builds for every desktop OS, in-app updates that respect those installs, and the operational extras that landed after 2.0.0.

### Installers

- Windows first install is an NSIS setup (`windows-amd64-setup.exe`) under `%LOCALAPPDATA%\Programs\PingPulse`. In-app updates download the zip and replace that installed exe.
- macOS first install is a disk image (`darwin-universal.dmg`) with PingPulse.app and an Applications shortcut. In-app updates download the tarball and replace the app in a writable folder.
- Linux first install is a `.deb` or `.rpm` under `/opt/pingpulse` (desktop entry + `pingpulse` command). In-app updates open the new package; a tarball in a writable folder still self-replaces.
- Each GitHub Release attaches `SHA256SUMS.txt`.

### App

- Backup and restore of the local SQLite database (targets, history, incidents, settings, and notification secrets). Settings can open the data folder or log file.
- First-run welcome: optional sample ICMP target (`1.1.1.1`) and a pointer to Notifications.
- Quiet menu: 1 hour, 8 hours, until tomorrow 8:00, or a custom time.
- Confirm before deleting a target or pausing all checks.
- Ping history retention is 7 / 30 / 90 days (incidents are not pruned).
- Apple-style motion and a typed launch intro. Reduced-motion is respected.
- Notification channels each have their own collapsible settings card.
- Desktop UI is quieter, with a sky-blue primary.

### Community

- Contributor Covenant code of conduct, contributing guide, security policy, issue forms, and a pull request template.

## 2.0.0

Cross-platform Wails desktop app with ICMP / HTTP / TCP probes, groups, maintenance, incidents, SLA reports, Discord / Slack / Teams webhooks, and in-app updates from GitHub Releases.
