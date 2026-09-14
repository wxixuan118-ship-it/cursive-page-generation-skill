// neighbour-scores.mjs — audit a set of existing pages against their own
// keyword and print one score per page, so a backlink injection can be
// checked for collateral damage in one command.
//
//   node scripts/new-page/neighbour-scores.mjs --from a.html,b.html [--save before.json] [--compare before.json]
//
// The keyword is taken from the page's H1 up to the first separator
// (":", "–", "—", "(", "|"), lower-cased — e.g. "Bold Font Generator" or
// "Gothic Font Generator: Gothic Font Copy and Paste" → "gothic font generator".
// Override per page with file=keyword in --from when the H1 is not the keyword.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, DOMAIN, stripTags } from './lib.mjs';

const AUDIT = path.join(os.homedir(), '.claude/skills/onpage-audit/scripts/onpage_audit.py');
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const from = (opt('--from') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!from.length) { console.error('usage: neighbour-scores.mjs --from a.html,b.html[=keyword] [--save f] [--compare f]'); process.exit(2); }

const scores = {};
for (const entry of from) {
  const [file, kwOverride] = entry.split('=');
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  // Prefer the page's own config keyword when the page came out of this pipeline.
  const cfgPath = path.join(root, 'scripts', 'page-configs', file.replace(/\.html$/, '.json'));
  const cfgKw = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')).keyword : null;
  const fromH1 = h1.split(/[:(|–—]/)[0].replace(/[^\x20-\x7e]/g, ' ')          // cut at separators, then drop decorations
    .split(/\s+/).filter(Boolean);
  const cut = fromH1.findIndex((w) => /\d/.test(w) || /^[-–—]$/.test(w));     // "300+", "-" tails
  const keyword = (kwOverride || cfgKw || (cut === -1 ? fromH1 : fromH1.slice(0, cut)).join(' ')).trim().toLowerCase();
  const out = path.join(os.tmpdir(), `nb-${file}.json`);
  spawnSync('python3', [AUDIT, path.join(root, file), '-k', keyword, '--url', `${DOMAIN}/${file}`, '--json', out, '--quiet-ngrams'], { encoding: 'utf8' });
  scores[file] = { keyword, score: JSON.parse(fs.readFileSync(out, 'utf8')).score };
}
if (opt('--save')) fs.writeFileSync(opt('--save'), JSON.stringify(scores, null, 2));
if (opt('--compare')) {
  const before = JSON.parse(fs.readFileSync(opt('--compare'), 'utf8'));
  let bad = 0;
  for (const [f, s] of Object.entries(scores)) {
    const b = before[f]?.score;
    const delta = b == null ? null : +(s.score - b).toFixed(1);
    if (delta !== null && delta < 0) bad++;
    console.log(`${String(s.score).padStart(5)}  ${b == null ? '' : `(was ${b}, ${delta >= 0 ? '+' : ''}${delta})`.padEnd(20)} ${f}  '${s.keyword}'`);
  }
  console.log(bad ? `\n${bad} page(s) LOST points — check where the card landed` : '\nno score drops');
  process.exit(bad ? 1 : 0);
}
for (const [f, s] of Object.entries(scores)) console.log(`${String(s.score).padStart(5)}  ${f}  '${s.keyword}'`);
