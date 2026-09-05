# Security

This prototype runs locally in a browser and has no accounts, backend, or online multiplayer. Serve production files from `dist/`; the development debug interface is excluded from production builds.

Do not publish secrets or exploit details in a public issue. Use the repository's private vulnerability reporting feature if enabled, or an available private maintainer contact. If neither exists, open a minimal issue asking for a private reporting channel without disclosing the vulnerability. No response-time guarantee is offered.

Maintainers should enable private vulnerability reporting before a public launch, keep dependencies current, and run `pnpm audit --prod` when preparing a release. Reports should include the affected revision, browser/runtime, impact, and a minimal reproduction.
