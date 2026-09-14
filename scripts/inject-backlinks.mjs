// inject-backlinks.mjs — add a link to the new page from existing pages.
//
//   node scripts/new-page/inject-backlinks.mjs scripts/page-configs/y2k-font-generator.json \
//        --from aesthetic-fonts.html,bubble-text-generator.html [--note "..."] [--dry-run]
//
// Each source page gets one card appended to its existing related-links
// container (cluster-links / px-links / tool-grid / flow-links). Nothing else
// on the page is touched, and re-running is a no-op if the link is already
// there. Pages without a recognised container are reported for a manual edit
// rather than guessed at — a link dropped in the wrong place is worse than
// none. Every edit is mirrored to public/.

import fs from 'node:fs';
import path from 'node:path';
import { root, readConfig, writeMirrored, esc } from './lib.mjs';

const args = process.argv.slice(2);
const cfg = readConfig(args.find((a) => !a.startsWith('--')) || '');
const from = (args[args.indexOf('--from') + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!args.includes('--from') || !from.length) { console.error('usage: inject-backlinks.mjs <config> --from a.html,b.html [--note "..."] [--dry-run]'); process.exit(2); }
const dry = args.includes('--dry-run');
const href = `/${cfg.file}`;
const name = cfg.linkName || cfg.h1 || cfg.appName;
const note = args.includes('--note') ? args[args.indexOf('--note') + 1] : (cfg.linkNote || cfg.kicker || '');

const CARD = {
  'cluster-links': () => `<a class="cluster-link" href="${href}"><strong>${esc(name)}</strong><span>${esc(note)}</span></a>`,
  'px-links':      () => `<a class="px-link" href="${href}"><strong>${esc(name)}</strong><span>${esc(note)}</span></a>`,
  'tool-grid':     () => `<a class="tool-card" href="${href}"><span>✦</span><strong>${esc(name)}</strong><em>${esc(note)}</em></a>`,
  'flow-links':    () => `<a href="${href}">${esc(name)}</a>`,
};

// Find the end of the first matching container inside <main>, walking nested
// tags so a card that itself contains <div>s does not fool the match.
function containerEnd(html, cls) {
  const open = html.search(new RegExp(`<(div|section)[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`));
  if (open === -1) return null;
  const tag = html.slice(open).match(/^<(\w+)/)[1];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = open;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('</')) { if (--depth === 0) return m.index; }
    else depth++;
  }
  return null;
}

// Find the builder that owns a page, and the span of its links:[…] array.
function builderSlot(file) {
  const dir = path.join(root, 'scripts');
  for (const b of fs.readdirSync(dir).filter((f) => /^build-.*\.mjs$/.test(f))) {
    const src = fs.readFileSync(path.join(dir, b), 'utf8');
    const at = src.search(new RegExp(`file:\\s*['"]${file.replace('.', '\\.')}['"]`));
    if (at === -1) continue;
    const rel = src.slice(at).search(/\blinks:\s*\[/);
    if (rel === -1) return { builder: b, src, error: 'no links: array' };
    const open = at + rel + src.slice(at + rel).indexOf('[');
    let depth = 0, i = open, quote = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      else if (ch === '[') depth++;
      else if (ch === ']' && --depth === 0) break;
    }
    return { builder: b, src, open, close: i };
  }
  return null;
}

const jsStr = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const results = [];
for (const file of from) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) { results.push({ file, status: 'missing' }); continue; }
  const html = fs.readFileSync(abs, 'utf8');
  const r = { file };
  if (new RegExp(`href="${href.replace('.', '\\.')}"`).test(html)) r.status = 'already-linked';
  else {
    const cls = Object.keys(CARD).find((c) => containerEnd(html, c) !== null);
    if (!cls) { results.push({ file, status: 'no-container', hint: 'add the link by hand inside the page\'s related section' }); continue; }
    const at = containerEnd(html, cls);
    if (!dry) writeMirrored(file, html.slice(0, at) + CARD[cls]() + html.slice(at));
    r.status = dry ? 'would-inject' : 'injected'; r.container = cls;
  }
  // Keep the owning config in step with the HTML, whichever of the two was missing the link.
  const cfgPath = path.join(root, 'scripts', 'page-configs', file.replace(/\.html$/, '.json'));
  if (fs.existsSync(cfgPath)) {
    const pc = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    pc.links = pc.links || [];
    if (pc.links.some(([, h]) => h === href)) r.config = 'page-config: already listed';
    else {
      pc.links.push([name, href, note]);
      if (!dry) fs.writeFileSync(cfgPath, JSON.stringify(pc, null, 2) + '\n');
      r.config = `page-config: links[] ${dry ? 'would be ' : ''}updated`;
    }
  }
  const slot = builderSlot(file);
  if (slot && slot.error) r.builder = `${slot.builder}: ${slot.error} — add the link to its config by hand`;
  else if (slot && slot.src.slice(slot.open, slot.close).includes(`'${href}'`)) r.builder = `${slot.builder}: already listed`;
  else if (slot) {
    const tuple = `[${jsStr(name)},${jsStr(href)},${jsStr(note)}]`;
    const inner = slot.src.slice(slot.open + 1, slot.close).trim();
    const patched = slot.src.slice(0, slot.close) + (inner ? ',' : '') + tuple + slot.src.slice(slot.close);
    if (!dry) fs.writeFileSync(path.join(root, 'scripts', slot.builder), patched);
    r.builder = `${slot.builder}: links[] ${dry ? 'would be ' : ''}updated`;
  }
  results.push(r);
}
console.log(JSON.stringify({ target: href, anchor: name, results }, null, 2));
if (results.some((r) => r.status === 'no-container' || r.status === 'missing')) process.exit(1);
