import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// Run in a zone with DST, where naive 24h arithmetic on local dates breaks.
// Set before workers spawn so they inherit it.
process.env.TZ = "Europe/Helsinki";

export default defineConfig({
  plugins: [WxtVitest()],
});
