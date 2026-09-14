// engine-styles.mjs — browse or validate style-engine preset ids.
//
//   node scripts/new-page/engine-styles.mjs --cat cursive --sample "Y2K Baby"   # browse a category
//   node scripts/new-page/engine-styles.mjs --search star --sample "Y2K"          # search names/tags
//   node scripts/new-page/engine-styles.mjs --check script,bold,dec-d-x9          # validate ids
//   node scripts/new-page/engine-styles.mjs --used                                # ids already used by other cluster pages
//
// Cluster pages point at presets by id (data-style-ids). Picking them is a
// judgment call (which presets *look* y2k?), so this prints the rendered
// sample next to each id and leaves the choice to the caller.

import fs from 'node:fs';
import path from 'node:path';
import { loadEngine, root } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const engine = loadEngine();
const sample = opt('--sample') || 'Your Text';

if (opt('--check')) {
  const ids = opt('--check').split(',').map((s) => s.trim()).filter(Boolean);
  const known = new Set(engine.STYLES.map((s) => s.id));
  const missing = ids.filter((id) => !known.has(id));
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (missing.length || dupes.length) {
    console.log(JSON.stringify({ ok: false, missing, dupes }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, count: ids.length }));
  process.exit(0);
}

if (args.includes('--used')) {
  const usage = {};
  for (const f of fs.readdirSync(root).filter((f) => f.endsWith('.html'))) {
    const m = fs.readFileSync(path.join(root, f), 'utf8').match(/data-style-ids="([^"]+)"/);
    if (m) usage[f] = m[1].split(',');
  }
  console.log(JSON.stringify(usage, null, 2));
  process.exit(0);
}

if (args.includes('--cats')) {
  console.log(JSON.stringify(engine.ALL_CATS, null, 2));
  process.exit(0);
}

const list = engine.filter(opt('--cat') || 'all', opt('--search') || '');
for (const s of list) console.log(`${s.id.padEnd(28)} ${s.cats.padEnd(30)} ${s.fn(sample)}`);
console.error(`\n${list.length} presets`);
