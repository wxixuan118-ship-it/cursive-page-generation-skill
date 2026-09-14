// link-candidates.mjs — rank existing pages as internal-link partners for a
// new keyword, and warn when the keyword already has a page.
//
//   node scripts/new-page/link-candidates.mjs "y2k font generator" --terms "retro,aesthetic,glitter,cute" [--top 12]
//   node scripts/new-page/link-candidates.mjs --batch "y2k font generator;y2k text;glitter font generator"
//
// --batch takes several keywords at once and reports which of them collide
// with each other (same slug, or sharing every distinctive word) before any
// page is written — two pages for one intent split the ranking instead of
// winning it. It also lists each keyword's collisions with existing pages.
//
// Score = overlap between the keyword's content words (with variants) and the
// candidate's H1/title/slug. A brand-new theme word ("y2k") matches nothing on
// its own, so pass --terms with the neighbouring concepts the page will talk
// about; those are scored at half weight. Pages that already have a
// related-links container get a tiny tiebreak bonus because a backlink from
// them is a script edit rather than a manual one. The output is a shortlist for
// Claude to choose from, not a decision.

import { sitePages, contentTokens, variants, slugify } from './lib.mjs';

const args = process.argv.slice(2);

// A page whose slug/H1 already carries every distinctive word of the keyword
// ("y2k text generator" vs existing y2k-font-generator.html) is the same intent
// even though the phrase never appears verbatim.
function nearMatches(keyword, pages) {
  const distinct = contentTokens(keyword);
  if (!distinct.length) return [];
  return pages.filter((p) => {
    const bag = new Set([...contentTokens(p.h1), ...p.file.replace('.html', '').split('-')].flatMap((t) => [...variants(t)]));
    return distinct.every((w) => bag.has(w) || [...variants(w)].some((v) => bag.has(v)));
  }).map((p) => p.file);
}

if (args.includes('--batch')) {
  const kws = (args[args.indexOf('--batch') + 1] || '').split(/[;\n]/).map((k) => k.trim()).filter(Boolean);
  const pages = sitePages();
  const info = kws.map((k) => ({ keyword: k, slug: slugify(k), words: new Set(contentTokens(k).flatMap((t) => [...variants(t)])) }));
  const pairs = [];
  for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
    const a = info[i], b = info[j];
    const shared = contentTokens(a.keyword).filter((w) => b.words.has(w));
    const distinctiveA = [...contentTokens(a.keyword)], distinctiveB = [...contentTokens(b.keyword)];
    const allShared = distinctiveA.every((w) => b.words.has(w)) || distinctiveB.every((w) => a.words.has(w));
    if (a.slug === b.slug || allShared) pairs.push({ a: a.keyword, b: b.keyword, reason: a.slug === b.slug ? 'same slug' : 'one keyword contains all distinctive words of the other', shared });
  }
  const existing = info.map((k) => ({ keyword: k.keyword, sameIntent: nearMatches(k.keyword, pages) })).filter((k) => k.sameIntent.length);
  console.log(JSON.stringify({ keywords: kws, collideWithEachOther: pairs, collideWithSite: existing, advice: pairs.length ? 'merge each colliding pair into one page, targeting the higher-volume phrase' : 'no overlap — build in the order given' }, null, 2));
  process.exit(pairs.length || existing.length ? 1 : 0);
}

const keyword = args.find((a) => !a.startsWith('--'));
if (!keyword) { console.error('usage: link-candidates.mjs "<keyword>" [--top N]'); process.exit(2); }
const top = Number(args[args.indexOf('--top') + 1]) || 12;

const slug = slugify(keyword);
const kwVariants = new Set(contentTokens(keyword).flatMap((t) => [...variants(t)]));
const termsArg = args[args.indexOf('--terms') + 1];
const extraVariants = new Set(args.includes('--terms')
  ? termsArg.split(',').flatMap((t) => contentTokens(t)).flatMap((t) => [...variants(t)])
  : []);

const pages = sitePages();
const collision = pages.filter((p) => p.file === `${slug}.html` || p.title.toLowerCase().includes(keyword.toLowerCase()) || p.h1.toLowerCase().includes(keyword.toLowerCase()));

const scored = pages.map((p) => {
  const bag = new Set([...contentTokens(p.h1), ...contentTokens(p.title), ...p.file.replace('.html', '').split('-')]);
  let hits = 0, extra = 0;
  for (const t of bag) { if (kwVariants.has(t)) hits++; else if (extraVariants.has(t)) extra++; }
  // Generic hub pages are always reasonable parents.
  const hub = /fancy-text-generator|aesthetic-fonts|cursive-fonts\.html/.test(p.file) ? 1 : 0;
  const base = hits * 2 + extra + hub;
  return { file: p.file, href: p.href, h1: p.h1, container: p.container, score: base ? base + (p.container ? 0.25 : 0) : 0 };
}).filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, top);

const out = {
  keyword, slug: `${slug}.html`,
  collision: collision.map((p) => ({ file: p.file, h1: p.h1 })),
  sameIntent: nearMatches(keyword, pages).filter((f) => !collision.some((p) => p.file === f)),
  candidates: scored,
  note: 'container=null means the page has no related-links block; a backlink from it needs a manual edit.',
};
console.log(JSON.stringify(out, null, 2));
