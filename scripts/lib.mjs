// lib.mjs — shared helpers for the new-page pipeline (scripts/new-page/*).
//
// Everything here is deliberately small and dependency-free: the pipeline has
// to run on a fresh checkout with nothing but node and the site itself.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DOMAIN = 'https://www.cursive-text-generator.net';
export const CONFIG_DIR = path.join(root, 'scripts', 'page-configs');

// Pages that are never link targets or sources for a tool page.
const SKIP_PAGES = new Set([
  'about.html', 'contact.html', 'privacy.html', 'terms.html', 'sitemap.html', 'partners.html',
  'more-tools.html', 'index.html', '404.html', 'cursive-text-generator.html',
]);

/** Load assets/style-engine.js in a sandbox and return window.StyleEngine. */
export function loadEngine() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'style-engine.js'), 'utf8'), sandbox);
  return sandbox.window.StyleEngine;
}

export function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Same word definition as onpage_audit.py (Latin words, CJK chars each count 1). */
export function countWords(text) {
  const latin = text.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || [];
  const cjk = text.match(/[一-鿿]/g) || [];
  return latin.length + cjk.length;
}

export function tokens(text) {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'’-]*/g) || []);
}

// Two stop lists. contentTokens() drops the site's own vocabulary (font,
// generator, copy, paste…) so link scoring keys on what makes a page distinct.
// keywordTokens() keeps those words, for keywords like "copy and paste fonts"
// where they are the whole keyword; it only drops grammatical filler.
const STOP = new Set('a an the and or of for to in on with your you is are it this that these those free copy paste generator generators text font fonts online tool tools'.split(' '));
const STOP_LIGHT = new Set('a an the and or of for to in on with your you is are it this that these those free online'.split(' '));
export function contentTokens(text) {
  return tokens(text).filter((t) => t.length > 1 && !STOP.has(t));
}
export function lightTokens(text) {
  return tokens(text).filter((t) => t.length > 1 && !STOP_LIGHT.has(t));
}
export function keywordTokens(text) {
  const strict = contentTokens(text);
  return strict.length ? strict : tokens(text).filter((t) => t.length > 1 && !STOP_LIGHT.has(t));
}

/** Cheap morphological variants, mirrors the audit script. */
export function variants(t) {
  const v = new Set([t]);
  if (t.length > 3) {
    for (const suf of ['s', 'es', 'ing', 'ed', 'er', 'ers']) v.add(t + suf);
    v.add(t.endsWith('y') ? t.slice(0, -1) + 'ies' : t + 'ies');
    if (t.endsWith('s')) v.add(t.slice(0, -1));
  }
  return v;
}

/** Count exact-phrase occurrences (case-insensitive, word-boundary). */
export function phraseCount(text, phrase) {
  const re = new RegExp('\\b' + phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\b', 'gi');
  return (text.match(re) || []).length;
}

export function slugify(keyword) {
  return keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Every indexable tool/content page in the site root, with title/h1/slug. */
export function sitePages() {
  return fs.readdirSync(root)
    .filter((f) => f.endsWith('.html') && !SKIP_PAGES.has(f) && !f.startsWith('yandex_') && !f.startsWith('startupranking'))
    .map((file) => {
      const html = fs.readFileSync(path.join(root, file), 'utf8');
      const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
      const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
      const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
      const main = mainMatch ? mainMatch[0] : html;
      const container =
        /class="cluster-links"/.test(main) ? 'cluster-links' :
        /class="px-links"/.test(main) ? 'px-links' :
        /class="tool-grid"/.test(main) ? 'tool-grid' :
        /class="flow-links"/.test(main) ? 'flow-links' : null;
      return { file, href: '/' + file, title, h1, container, html };
    });
}

/** Write a file to the site root and to the public/ mirror. */
export function writeMirrored(relPath, content) {
  for (const base of [root, path.join(root, 'public')]) {
    const target = path.join(base, relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

export function readConfig(arg) {
  const file = arg.endsWith('.json') ? arg : path.join(CONFIG_DIR, `${slugify(arg)}.json`);
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  p._configPath = file;
  if (!p.keyword) throw new Error(`${file}: "keyword" is required`);
  if (!p.file) p.file = `${slugify(p.keyword)}.html`;
  return p;
}

export const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
