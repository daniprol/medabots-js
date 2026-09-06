# Contributing

Improvements to combat feel, accessibility, controller support, documentation, and original robot art are welcome. For a large change, open an issue describing the player-facing problem before starting.

## Work locally

Follow the [README](README.md) to install and run the game. The pnpm version is pinned in `package.json`; dependencies are pinned by `pnpm-lock.yaml`.

```sh
pnpm format                  # Format TypeScript, CSS, HTML, JSONC, Markdown, and YAML
pnpm lint:fix                # Apply safe lint fixes
pnpm check                   # Full fast check, including the production build
pnpm exec playwright install chromium
pnpm test:e2e                # Browser smoke tests; separate from the fast check
```

Lefthook installs automatically in Git checkouts during `pnpm install`. Pre-commit checks formatting, typed linting, and TypeScript; pre-push runs the unit/integration suite. Hooks check the working tree and never rewrite or stage files. Run `pnpm hooks:install` to reinstall them. Source ZIP installs skip hooks. GitHub Actions runs `pnpm check`, verifies generated files, and runs Chromium tests on pushes to `main`/`dev` and all pull requests. Failed browser traces are kept for seven days; the workflow can also be run manually.

Use an editor's Oxc extension for formatting and lint feedback. `.editorconfig`, `.oxfmtrc.json`, and `.oxlintrc.json` define the shared rules. Do not introduce a second formatter.

## Keep the code easy to follow

- Use kebab-case filenames, PascalCase types/classes, camelCase functions/variables, and UPPER_SNAKE_CASE shared constants. Keep content IDs in stable kebab-case.
- Prefer descriptive names such as `combatant`, `ability`, and `assignment`. Short `x`, `y`, and `z` names are appropriate for coordinates.
- Use braces, early returns, one variable per declaration, and blank lines between logical steps. Group related statements; avoid a blank line after every line.
- Keep functions focused on one task. Extract real responsibilities, not wrappers that merely forward arguments. Avoid new frameworks or speculative abstractions.
- Use discriminated unions and narrow unknown input at its entry point. Avoid `any` and assertions that conceal invalid data. A non-null assertion should follow a validated invariant.
- Treat content definitions as immutable. Keep battle-core independent of browsers, rendering, file loading, and networking. Presentation consumes snapshots and events.
- Preserve stable simulation ordering and integer tick timing. Test behavioral changes through public functions and complete battle scenarios.

The [architecture guide](docs/architecture.md) explains the main modules; the [content guide](docs/content.md) explains adding definitions and visuals.

## Before a pull request

Run `pnpm check` and the browser tests for gameplay or UI changes. Include the problem, resulting behavior, and relevant validation in the PR description. Add a screenshot for a visible change. Test actual controllers when changing the Gamepad adapter; automated fixtures cannot verify USB/Bluetooth hardware behavior.

Contribute only work you have permission to share. Do not add ROMs, extracted game assets, official models, or third-party art without suitable permission and attribution. Original additions are contributed under the project's MIT license; existing third-party rights remain separate. See [NOTICE](NOTICE.md).

Keep discussions respectful and specific. Report bugs with reproduction steps, your browser/OS, controller assignments, and expected versus actual behavior.
