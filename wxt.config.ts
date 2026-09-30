import { defineConfig } from "wxt";
import { assertDatasetCoverage } from "./src/data/coverage";
import dataset from "./src/data/generated/dataset.json" with { type: "json" };

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  // Firefox defaults to MV2 in WXT; both targets ship MV3 (FR-10.2).
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: "__MSG_extName__",
    short_name: "__MSG_extShortName__",
    description: "__MSG_extDescription__",
    default_locale: "fi",
    homepage_url: "https://viikkonro.fi/",
    // FR-9.1: storage and alarms only. No tabs, activeTab, host permissions
    // or content scripts. Opening a URL with tabs.create/update needs none.
    permissions: ["storage", "alarms"],
    omnibox: { keyword: "vk" },
    action: { default_title: "__MSG_extName__" },
    // Opens the popup from the keyboard. Commands need no permission; the
    // user can rebind or clear the key in the browser's shortcut settings.
    commands: { _execute_action: { suggested_key: { default: "Alt+Shift+W" } } },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "extension@viikkonro.fi",
          strict_min_version: "140.0",
          data_collection_permissions: { required: ["none"] },
        },
        // Android gained data_collection_permissions in 142, desktop in 140.
        gecko_android: { strict_min_version: "142.0" },
      },
    }),
  }),
  hooks: {
    // FR-4.3: a release built with stale data fails instead of shipping a
    // popup that silently has no school holidays for the current year.
    // SKIP_DATA_COVERAGE_CHECK=1 exists only so a store reviewer can rebuild
    // an already-submitted version after the calendar year has rolled over.
    "build:before": () => {
      if (process.env.SKIP_DATA_COVERAGE_CHECK !== "1") assertDatasetCoverage(dataset, new Date());
    },
  },
  zip: {
    // AMO source upload (FR-10.5): the whole repo, REVIEWER_NOTES.md included,
    // minus build output. Don't set includeSources: it replaces the "**/*"
    // default instead of adding to it.
    // Store graphics and listing copy aren't needed to build the extension.
    excludeSources: [".output/**", ".wxt/**", "coverage/**", "store/**", ".env*"],
  },
});
