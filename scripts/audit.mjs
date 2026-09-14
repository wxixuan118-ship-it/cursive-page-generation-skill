// audit.mjs — run the onpage-audit skill against a built page and print a
// compact verdict: score, pass/fail against the target, and the fix list
// mapped back to config fields where the mapping is known.
//
//   node scripts/new-page/audit.mjs scripts/page-configs/y2k-font-generator.json [--min 95]
//   node scripts/new-page/audit.mjs some-existing-page.html -k "its keyword"     # any page, e.g. after a backlink edit
//
// The full report is still written next to the config as <slug>.audit.json.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, DOMAIN, readConfig } from './lib.mjs';

const AUDIT = path.join(os.homedir(), '.claude/skills/onpage-audit/scripts/onpage_audit.py');
const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('-'));
const min = Number(args[args.indexOf('--min') + 1]) || 95;

let file, keyword, jsonOut;
if (target.endsWith('.html')) {
  file = target; keyword = args[args.indexOf('-k') + 1];
  jsonOut = path.join(os.tmpdir(), `audit-${path.basename(file, '.html')}.json`);
  if (!keyword) { console.error('pass -k "keyword" when auditing a raw html file'); process.exit(2); }
} else {
  const cfg = readConfig(target);
  file = cfg.file; keyword = cfg.keyword;
  jsonOut = cfg._configPath.replace(/\.json$/, '.audit.json');
}
const url = `${DOMAIN}/${path.basename(file)}`;
const res = spawnSync('python3', [AUDIT, path.join(root, path.basename(file)), '-k', keyword, '--url', url, '--json', jsonOut, '--quiet-ngrams'], { encoding: 'utf8' });
if (!fs.existsSync(jsonOut)) { console.error(res.stdout, res.stderr); process.exit(2); }
const rep = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));

// Audit check id -> config field that moves it. Anything not listed is a
// template/site issue rather than a copy issue.
const FIELD = {
  title_length: 'title', title_keyword: 'title', title_keyword_position: 'title', kw_title: 'title',
  desc_length: 'description', desc_keyword: 'description',
  kw_h1: 'h1', kw_h2: 'H2 titles (copyHeading/popularTitle/specificTitle/uniqueH2…)', kw_intro: 'intro',
  kw_body: 'popular/social/specific/uniqueBody paragraphs', kw_density: 'body paragraphs', kw_alt: 'figure.alt',
  topic_focus: 'H2 titles — cut or rename off-topic sections', word_count: 'uniqueBody / faqs — add substance',
  internal_count: 'links', anchor_quality: 'links', external_present: 'source', external_rel: 'source',
  image_present: 'figure (run build-preview.mjs)', alt_coverage: 'figure.alt', h2_count: 'H2 titles',
};
const checks = rep.checks || [];
const score = rep.score;
const fixes = checks.filter((c) => c.state === 'red' || c.state === 'yellow')
  .map((c) => ({ state: c.state, check: c.id, recoverable: c.points - c.earned, observed: c.detail, field: FIELD[c.id] || '(template/site — not a copy fix)', fix: c.fix }))
  .sort((a, b) => (b.state === 'red') - (a.state === 'red') || b.recoverable - a.recoverable);

console.log(JSON.stringify({ file, keyword, score, target: min, pass: score >= min, topic_focus: rep.topic_focus, word_count: rep.word_count, density: rep.keyword_density, fixes, report: jsonOut }, null, 2));
process.exit(score >= min ? 0 : 1);
