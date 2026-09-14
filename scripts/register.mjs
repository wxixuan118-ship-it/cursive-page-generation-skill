// register.mjs — put the new page into sitemap.xml and the IndexNow queue.
//
//   node scripts/new-page/register.mjs scripts/page-configs/y2k-font-generator.json [--touch a.html,b.html]
//
// --touch bumps <lastmod> for pages that just received a backlink, so
// crawlers re-fetch them and discover the new URL sooner. Both files are
// mirrored to public/. Submitting to IndexNow itself stays a separate,
// deliberate step: `npm run indexnow`.

import fs from 'node:fs';
import path from 'node:path';
import { root, DOMAIN, readConfig, writeMirrored } from './lib.mjs';

const args = process.argv.slice(2);
const cfg = readConfig(args.find((a) => !a.startsWith('--')) || '');
const touch = (args[args.indexOf('--touch') + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
const today = new Date().toISOString().slice(0, 10);
const url = `${DOMAIN}/${cfg.file}`;

let sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const actions = [];
if (!sitemap.includes(`<loc>${url}</loc>`)) {
  sitemap = sitemap.replace('</urlset>', `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n  </url>\n</urlset>`);
  actions.push(`sitemap: added ${url}`);
} else actions.push('sitemap: already listed');
for (const f of args.includes('--touch') ? touch : []) {
  const loc = `<loc>${DOMAIN}/${f}</loc>`;
  const re = new RegExp(`(${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<lastmod>)[^<]+`);
  if (re.test(sitemap)) { sitemap = sitemap.replace(re, `$1${today}`); actions.push(`sitemap: touched ${f}`); }
}
writeMirrored('sitemap.xml', sitemap);

const queuePath = path.join(root, 'indexnow-urls.txt');
const queue = fs.readFileSync(queuePath, 'utf8');
const wanted = [url, ...touch.map((f) => `${DOMAIN}/${f}`)].filter((u) => !queue.split(/\r?\n/).includes(u));
if (wanted.length) {
  writeMirrored('indexnow-urls.txt', queue.replace(/\s*$/, '\n') + wanted.join('\n') + '\n');
  actions.push(`indexnow queue: +${wanted.length}`);
} else actions.push('indexnow queue: nothing new');
console.log(JSON.stringify({ url, lastmod: today, actions, next: 'npm run indexnow (when deployed)' }, null, 2));
