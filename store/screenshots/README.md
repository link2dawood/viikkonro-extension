# Localized store screenshots

Upload the three PNGs in fi/ to the Finnish listing and the three PNGs in en/ to the English listing. Each is 1280 × 800, 8 bits per channel RGB (24-bit PNG), without alpha. preview.jpg is a contact sheet only; do not upload it.

01: Current week with Helsinki school holidays.
02: Week 42 selected using the popup arrows.
03: Settings with Helsinki entered in the city search.

Captures use the production extension in Chromium, its real settings and UI, and a fixed example date of 11 September 2026 in Europe/Helsinki. The interface is cropped/scaled for presentation; product markup and styles are unchanged.

Regenerate with:

```sh
pnpm build
node scripts/store-screenshots.mjs
```

Requires the Playwright Chromium browser (pnpm exec playwright install chromium).
