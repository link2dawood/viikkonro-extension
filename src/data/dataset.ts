import raw from "./generated/dataset.json";
import type { Dataset } from "./types";

// Written by scripts/sync-data.mjs from the site's own data modules.
export const dataset = raw as Dataset;
