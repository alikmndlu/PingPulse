# Security Policy

PingPulse is a **local desktop app**. It does not phone home except for:

- probes to hosts **you** add
- notification endpoints **you** enable
- GitHub Releases when **you** check for updates

The machine it runs on is the trust boundary. Treat the data directory as sensitive: it can hold Telegram tokens, SMS keys, and webhook URLs.

## Supported versions

| Version | Supported |
| --- | --- |
| **2.1.x** | Yes |
| 2.0.x | Security fixes if they still apply cleanly |
| 1.x | No |

Install **2.1.1 or later** from [Releases](https://github.com/alikmndlu/PingPulse/releases/latest). v1.x cannot in-app update to v2; install the new build by hand once.

## Reporting a vulnerability

**Do not open a public GitHub issue** for a security problem.

1. Prefer [GitHub private vulnerability reporting](https://github.com/alikmndlu/PingPulse/security/advisories/new) if it is enabled on this repository.
2. Otherwise email **Ali Kamandlu** at [alikmndlu1@gmail.com](mailto:alikmndlu1@gmail.com) with the subject `PingPulse security`.

Include:

- Affected version / git tag
- What happens, and how to reproduce it
- Whether secrets (API keys, bot tokens, backup files) could leak
- Whether you have a suggested fix (optional)

You should get an acknowledgement within **a few days**. Please give a reasonable window before any public disclosure so a patched release can ship.

## What is in scope

- Secret handling (notification keys in SQLite, logs, backup files, Wails IPC)
- The in-app updater downloading anything other than this repo’s GitHub Releases
- Zip-slip or path issues in update archives or backup restore
- Ability for a crafted target name / template to leak secrets into logs or the UI

## Out of scope

- Unsigned Windows SmartScreen / macOS Gatekeeper / Linux package-signature warnings (expected until paid code signing and Apple notarization)
- Network attacks against hosts **you** chose to probe
- Compromise of the local OS user account (that user already owns the database)
- Social-engineering someone into installing a build that is not from this repository

## Hardening already in the tree

- Secrets stay in the local DB; the UI receives `apiKeySet`, not the key
- Logs redact `api_key`, `token`, `authorization`, `bearer`, `secret`, `password`
- Update downloads are host-allowlisted to `github.com/alikmndlu/PingPulse/releases/download/`
- Update archives reject zip-slip paths
- Data directory and log file are created with restrictive permissions
- Public Wails errors are sanitized; internals stay in logs

See [CHANGELOG](CHANGELOG.md) for released fixes.
