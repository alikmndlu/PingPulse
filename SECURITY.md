# Security

PingPulse is a local desktop app. It does not phone home except for the probes you configure, the notification endpoints you enable, and GitHub Releases when you check for updates.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security problem.

Email **Ali Kamandlu** using the address on [the GitHub profile](https://github.com/alikmndlu) and include:

- Affected version / tag
- What happens, and how to reproduce it
- Whether secrets (API keys, bot tokens) could leak

You should hear back within a few days.

## What is in scope

- Secret handling (notification keys in SQLite, logs, backup files)
- Update installer downloading something other than this repo's GitHub Releases
- Path issues around backup restore

## Out of scope

- Unsigned Windows SmartScreen / macOS Gatekeeper warnings (expected until the app is code-signed)
- Network attacks against hosts you chose to probe
