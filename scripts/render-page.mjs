// render-page.mjs — lint a page config against the on-page rules, then render
// it through the shared cluster template into the site root + public mirror.
//
//   node scripts/new-page/render-page.mjs scripts/page-configs/y2k-font-generator.json [--lint-only] [--force]
//
// The lint is a pre-flight for the real audit (onpage_audit.py): it catches the
// mechanical misses — title too long, keyword missing from the intro, a link to
// a page that does not exist — before a build happens, and phrases each miss
// as the config field to change. It cannot reproduce the audit's topic-focus
// score, so a clean lint still needs the audit run afterwards.

import fs from 'node:fs';
import path from 'node:path';
import { renderClusterPage } from '../lib/cluster-template.mjs';
import { root, loadEngine, readConfig, writeMirrored, stripTags, countWords, phraseCount, lightTokens as contentTokens, variants, slugify } from './lib.mjs';

const args = process.argv.slice(2);
const cfg = readConfig(args.find((a) => !a.startsWith('--')) || '');
const kw = cfg.keyword.trim();
const kwLower = kw.toLowerCase();
const kwWords = contentTokens(kw);
const problems = [];
const warn = (field, msg) => problems.push({ field, msg });

const hasPhrase = (s) => phraseCount(s || '', kw) > 0;
const hasAllWords = (s) => { const t = new Set(contentTokens(s || '').flatMap((x) => [...variants(x)])); return kwWords.every((w) => t.has(w) || [...variants(w)].some((v) => t.has(v))); };

// ---- meta
if (!cfg.title) warn('title', 'missing');
else {
  if (cfg.title.length < 25 || cfg.title.length > 60) warn('title', `${cfg.title.length} chars — needs 25–60`);
  if (!hasPhrase(cfg.title)) warn('title', 'must contain the exact keyword phrase');
  else if (cfg.title.toLowerCase().indexOf(kwLower) > 30 - kw.length) warn('title', 'keyword should start within the first 30 characters');
}
if (!cfg.description) warn('description', 'missing');
else {
  if (cfg.description.length < 120 || cfg.description.length > 160) warn('description', `${cfg.description.length} chars — needs 120–160`);
  if (!hasPhrase(cfg.description)) warn('description', 'use the exact keyword phrase once (all words, in order)');
}
if (!cfg.h1 || !hasPhrase(cfg.h1)) warn('h1', 'must contain the exact keyword phrase');
if (!cfg.file.includes(slugify(kw))) warn('file', `slug should contain "${slugify(kw)}"`);

// ---- headings
const label = cfg.label || '';
const h2s = [cfg.copyHeading || `${label} Fonts Copy and Paste`, cfg.popularTitle || `Popular ${label} Font Styles`, cfg.howToTitle || `How to Use the ${label} Font Generator`,
  cfg.socialTitle || `${label} Fonts for Social Media`, cfg.specificTitle, cfg.uniqueH2, cfg.examplesTitle || `${label} Font Examples`, cfg.linksTitle || 'Explore Related Font Styles', cfg.faqTitle || `${label} Fonts FAQ`].filter(Boolean);
if (!h2s.some(hasAllWords)) warn('h2', 'at least one H2 must carry the keyword (or all its words)');
const offTopic = h2s.filter((h) => !contentTokens(h).some((t) => kwWords.some((w) => variants(w).has(t) || variants(t).has(w))));
if (offTopic.length > 3) warn('h2', `${offTopic.length} H2s share no word with the keyword — topic focus will suffer: ${offTopic.map((h) => `"${h}"`).join(', ')}`);

// ---- intro: the audit's "opening paragraph" is the first <p> with 15+ words,
// which is the kicker if the kicker is long, so keep the kicker short.
if (countWords(cfg.kicker || '') >= 15) warn('kicker', 'keep under 15 words or it becomes the audited opening paragraph');
if (!hasPhrase(cfg.intro)) warn('intro', 'must contain the exact keyword phrase (this is the audited opening paragraph)');
if (countWords(cfg.intro || '') < 40) warn('intro', 'aim for 40–70 words');

// ---- engine ids
const engine = loadEngine();
const known = new Set(engine.STYLES.map((s) => s.id));
const ids = (cfg.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
const badIds = ids.filter((id) => !known.has(id));
if (badIds.length) warn('ids', `unknown preset ids: ${badIds.join(', ')}`);
if (ids.length < 8) warn('ids', `${ids.length} presets — use 10–16 so the generator feels complete`);
if (!cfg.chips || cfg.chips.length < 3) warn('chips', 'need at least 3 filter chips, first one [\'all\',\'All\']');

// ---- links
const GENERIC = new Set(['click here', 'here', 'read more', 'learn more', 'more', 'link', 'this page']);
const links = cfg.links || [];
if (links.length < 5) warn('links', `${links.length} internal links — need 5+ (audit green threshold)`);
for (const [name, href] of links) {
  if (href === '/') continue;
  const target = path.join(root, href.replace(/^\//, ''));
  if (!href.startsWith('/') || !fs.existsSync(target)) warn('links', `"${href}" does not resolve to a file in the site root`);
  if (GENERIC.has((name || '').toLowerCase())) warn('links', `anchor "${name}" is generic`);
}
if (!cfg.source || !/^https:\/\//.test(cfg.source.href || '')) warn('source', 'add one outbound citation { before, name, href (https), after }');

// ---- figure
if (!cfg.figure || !cfg.figure.src) warn('figure', 'run build-preview.mjs first (fills figure.src/width/height)');
else {
  if (!fs.existsSync(path.join(root, cfg.figure.src.replace(/^\//, '')))) warn('figure', `${cfg.figure.src} not found`);
  if (!hasAllWords(cfg.figure.alt)) warn('figure.alt', 'alt text should describe the picture and include the keyword');
}

// ---- faq
if (!cfg.faqs || cfg.faqs.length < 5) warn('faqs', 'need 5–8 questions');

// ---- render + body-level checks
let html = '';
try { html = renderClusterPage(cfg); } catch (e) { warn('render', e.message); }
if (html) {
  const main = stripTags(html.match(/<main[\s\S]*?<\/main>/i)?.[0] || '');
  const wc = countWords(main);
  const hits = phraseCount(main, kw);
  const density = wc ? (100 * hits * Math.max(1, kw.split(/\s+/).length)) / wc : 0;
  if (wc < 650) warn('body', `${wc} words in <main> — need 650+ (600 is the audit floor; keep a margin)`);
  if (hits < 4) warn('body', `exact keyword phrase appears ${hits}× in <main> — need 4+ (headings count, but use it in running copy too)`);
  if (density > 2.8) warn('body', `keyword density ${density.toFixed(2)}% — over 3% is penalised, thin it out`);
  if (density < 0.6) warn('body', `keyword density ${density.toFixed(2)}% — under 0.5% is penalised`);
  cfg._stats = { words: wc, keywordHits: hits, density: Number(density.toFixed(2)), h2s: h2s.length, links: links.length, ids: ids.length };
}

const report = { file: cfg.file, ok: problems.length === 0, stats: cfg._stats, problems };
if (!report.ok && !args.includes('--force')) {
  console.log(JSON.stringify(report, null, 2));
  console.error(`\n${problems.length} problem(s). Fix the config, or pass --force to render anyway.`);
  process.exit(1);
}
if (args.includes('--lint-only')) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

writeMirrored(cfg.file, html);
report.written = [cfg.file, `public/${cfg.file}`];
console.log(JSON.stringify(report, null, 2));
