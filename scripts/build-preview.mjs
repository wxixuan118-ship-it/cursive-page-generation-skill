// build-preview.mjs — 1200x630 illustration for a new tool page.
//
//   node scripts/new-page/build-preview.mjs scripts/page-configs/y2k-font-generator.json
//
// Same visual language as assets/previews/*.svg: a card with the page name as
// a kicker, the plain sample text, an arrow, and the same text rendered by the
// real style engine in the page's own presets — so the picture cannot show a
// style the generator does not actually offer. The SVG is written to
// assets/previews/<slug>.svg (root + public mirror) and the config's `figure`
// block is filled in with src/width/height so render-page.mjs can use it.

import fs from 'node:fs';
import { loadEngine, readConfig, writeMirrored, esc } from './lib.mjs';

const cfg = readConfig(process.argv[2] || '');
const engine = loadEngine();
const byId = Object.fromEntries(engine.STYLES.map((s) => [s.id, s]));

const fig = cfg.figure || {};
const ids = (fig.styles && fig.styles.length ? fig.styles : cfg.ids.split(',')).slice(0, 3);
for (const id of ids) if (!byId[id]) { console.error(`figure.styles: unknown preset id "${id}"`); process.exit(1); }
const sample = fig.sample || cfg.sample || 'Your Text';
const kicker = (cfg.h1 || cfg.keyword).toUpperCase();
const tagline = fig.tagline || '';
const rendered = ids.map((id) => byId[id].fn(sample));

// Three styled lines share the lower half; font size shrinks with line length
// so a decorated preset with a long frame still fits the card.
const lineY = [420, 490, 560];
const lines = rendered.map((txt, i) => {
  const size = Math.max(40, Math.min(72, Math.round(1500 / Math.max(10, [...txt].length))));
  return `  <text x="80" y="${lineY[i]}" font-family="Georgia, Times New Roman, serif" font-size="${size}" fill="#17201b">${esc(txt)}</text>`;
}).join('\n');

const alt = fig.alt || `${sample} written with the ${cfg.keyword} in three Unicode styles`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${esc(alt)}">
  <rect width="1200" height="630" fill="#fbfaf7"/>
  <rect x="16" y="16" width="1168" height="598" rx="20" fill="#ffffff" stroke="#dfe6df" stroke-width="2"/>
  <text x="80" y="110" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="28" font-weight="700" letter-spacing="2" fill="#2f6b4f">${esc(kicker)}</text>
  <text x="80" y="230" font-family="Georgia, Times New Roman, serif" font-size="64" fill="#5d6a63">${esc(sample)}</text>
  <text x="82" y="300" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="44" fill="#c96f59">&#8595;</text>
${lines}
  <text x="1120" y="110" text-anchor="end" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="#c96f59">${esc(tagline)}</text>
  <text x="1120" y="590" text-anchor="end" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="22" fill="#5d6a63">cursive-text-generator.net</text>
</svg>
`;

const slug = cfg.file.replace(/\.html$/, '');
const rel = `assets/previews/${slug}.svg`;
writeMirrored(rel, svg);

cfg.figure = { ...fig, styles: ids, sample, src: `/${rel}`, width: 1200, height: 630, alt,
  caption: fig.caption || `“${sample}” rendered by the ${cfg.h1 || cfg.keyword} in ${ids.map((id) => byId[id].name).join(', ')} presets` };
const { _configPath, ...toSave } = cfg;
fs.writeFileSync(_configPath, JSON.stringify(toSave, null, 2) + '\n');
console.log(JSON.stringify({ written: rel, alt: cfg.figure.alt, caption: cfg.figure.caption }, null, 2));
