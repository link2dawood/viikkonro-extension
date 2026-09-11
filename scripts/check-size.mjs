// Bundle guard: gzipped JS + CSS of a build must stay under the cap. Fonts
// and icons are already compressed formats, so they're reported, not capped.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const dir = process.argv[2] ?? ".output/chrome-mv3";
const CODE_LIMIT_BYTES = 150 * 1024;

function* walk(current) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let code = 0;
let other = 0;
for (const file of walk(dir)) {
  const bytes = readFileSync(file);
  if (/\.(js|css|html|json)$/.test(file)) code += gzipSync(bytes).length;
  else other += bytes.length;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`${dir}: code ${kb(code)} gzipped (limit ${kb(CODE_LIMIT_BYTES)}), fonts/images ${kb(other)}`);
if (code > CODE_LIMIT_BYTES) {
  console.error("Bundle size limit exceeded.");
  process.exit(1);
}
