# Notes for store reviewers

Viikko Nro is written in TypeScript and React and bundled with [WXT](https://wxt.dev) (Vite). The submitted package is the unmodified output of the build below.

## Build

Requirements: Node.js 22 or newer and pnpm 10 (`corepack enable` provides the version pinned in `package.json`). Works on Windows, macOS and Linux. All build tools are open source.

```sh
pnpm install --frozen-lockfile
pnpm build:firefox        # output: .output/firefox-mv3/
pnpm zip:firefox          # the same build as a zip in .output/
```

The build refuses to run when the bundled data doesn't cover the current and next calendar year. To rebuild an already-submitted version after a year change, set `SKIP_DATA_COVERAGE_CHECK=1`.

## What the extension does

- Shows the current ISO 8601 week number as the toolbar badge.
- Popup: the week's dates and working days, today's flag day or public holiday, the next public holiday, and the next school holiday for a city chosen in the options. A button copies the week and its dates to the clipboard (`navigator.clipboard.writeText` on a click, so no clipboard permission).
- Address bar keyword `vk`: `vk 42`, `vk 42 2027`, `vk 13.10.2026`, `vk +3`, `vk 42-50` or `vk juhannus` resolves to a week.
- Keyboard shortcut: `_execute_action` with a suggested key (`Alt+Shift+W`) opens the popup. Commands need no permission.

## Permissions

- `storage`: the three user settings (city, badge format, language) and the last badge state.
- `alarms`: updates the badge at local midnight, with an hourly fallback.

No host permissions, no content scripts, no remote code and no network requests. The extension collects no data (`data_collection_permissions: none`).

## Data

`src/data/generated/dataset.json` is generated from the viikkonro.fi website's data modules by `scripts/sync-data.mjs` and committed. The build only reads it, so the website's source is not needed to rebuild.

## Links opened

Only viikkonro.fi pages: when the user clicks a link in the popup or options page, presses Enter on an address bar suggestion, or once on first install. Links carry UTM parameters so the website can count extension referrals. The extension itself runs no analytics.

## Third-party assets

Fonts in `src/assets/fonts/` (Inter, IBM Plex Mono, Bricolage Grotesque) are unmodified SIL Open Font License files.
