---
name: new-page
description: >-
  Build a new Unicode font/text generator tool page for cursive-text-generator.net from a
  single target keyword — write the page config, pick engine presets, generate the
  illustration, render through the shared cluster template, run the onpage-audit until the
  page scores 95+, then wire it into the site with backlinks from related pages, sitemap and
  the IndexNow queue. Use this whenever the user gives a keyword and wants a page made for
  it — "make a page for X", "add a Y font generator", "new landing page targeting Z",
  "生成 X 页面", "做一个 X generator" — even if they never say "skill" or "SEO". Tool pages only
  (font/text generators); not for "X in cursive" nation pages, blog posts, or editing an
  existing page's copy.
---

# New tool page from a keyword

The site is a static set of tool pages that share one template and one Unicode engine.
A new page is a **config object** (title, copy, preset ids, links, FAQ), not a hand-written
HTML file: `scripts/lib/cluster-template.mjs` renders it, `assets/style-engine.js` powers
the generator, and `~/.claude/skills/onpage-audit` is the referee. Your job is the part a
script cannot do — deciding what the page says, which presets look right, and which
existing pages it belongs next to. The scripts do the rest and check your work.

Site root: `cursive-generator/` (all commands below run from there). Pipeline scripts live
in `scripts/new-page/`, configs in `scripts/page-configs/<slug>.json`.

## The bar

The page must score **≥ 95** on `onpage_audit.py` for its keyword. On a local file the
audit has ~120 raw points in play, so 95 means at most one or two yellows and no reds.
Concretely, every one of these has to be true (the lint in `render-page.mjs` checks them
mechanically before a build; the audit checks them for real after):

| What | Rule | Why it moves the score |
|---|---|---|
| Title | 25–60 chars, exact keyword phrase, starting inside the first 30 chars | 17 raw points across 4 checks |
| Description | 120–160 chars, exact keyword phrase once | 6 points; "all words present" is only half credit |
| H1 | exact keyword phrase | 6 points |
| H2s | ≥1 carries the keyword; **most** share a word with it | keyword-in-H2 is 4, but topic focus (4) counts every off-topic H2 against you |
| Intro | first paragraph ≥15 words contains the exact phrase | 5 points; the kicker must stay under 15 words or *it* becomes the audited intro |
| Body | ≥650 words in `<main>`, exact phrase 4–7 times, density 0.6–2.8% | word count 8, body use 6, density 4 — and they interact |
| Links | ≥5 internal links in `<main>` with descriptive anchors + 1 outbound `https` citation with `rel` | header nav is injected by JS and does not count; footer is outside `<main>` |
| Image | one `<img>` with width/height, `loading="lazy"`, alt containing the keyword | 8 image points + the h1/h2/p/img skeleton check |
| Schema | WebApplication + BreadcrumbList + FAQPage | template does this; needs ≥5 FAQs |

## Workflow

### 1. Scope the keyword (no writing yet)

```bash
node scripts/new-page/link-candidates.mjs "<keyword>" --terms "<4–8 neighbouring concepts>"
```

- `collision` or `sameIntent` non-empty → an existing page already targets this intent
  (`sameIntent` catches "y2k text generator" against `y2k-font-generator.html`, where the
  phrase never appears verbatim). Stop and tell the user; a second page would cannibalise
  the first. Offer to improve the existing page instead.
- Pick **6 link partners** from `candidates`: the parent hub (`aesthetic-fonts`,
  `fancy-text-generator`, or `cursive-fonts` — whichever the theme belongs under), plus
  siblings whose mood overlaps. Prefer `container != null` so the backlink is a script edit.
  Note which ones you chose; step 6 links back from them.
- `--terms` matters: a new theme word ("y2k", "coquette") matches nothing by itself, so the
  neighbours you pass are what surfaces the right siblings.

### 2. Pick presets

```bash
node scripts/new-page/engine-styles.mjs --cats                       # category list
node scripts/new-page/engine-styles.mjs --cat cute --sample "<sample>" # browse, rendered
node scripts/new-page/engine-styles.mjs --search star --sample "<sample>"
node scripts/new-page/engine-styles.mjs --used                       # what other pages already use
```

Choose 10–16 ids that *look like the theme* when rendered with a theme-appropriate sample.
Lead with 3 strong, distinct ones — those become the illustration. Avoid copying another
page's full list (`--used` shows them); heavy overlap makes the two pages near-duplicates.
Chips are engine category ids (`cursive`, `bold`, `cute`, `love`, `aesthetic`, `fancy`,
`gaming`, `glitch`, `symbols`, `social`…) — label them in the page's own vocabulary.

### 3. Write the config

Create `scripts/page-configs/<slug>.json`. Field-by-field reference with lengths and
examples: [references/config-schema.md](references/config-schema.md). Voice and what to
say in each section: [references/copy-rules.md](references/copy-rules.md).

The shape that reliably clears 95: every H2 names the theme (`Y2K Fonts Copy and Paste`,
`Popular Y2K Font Styles`, `Y2K Fonts for Instagram and TikTok`…), the exact phrase appears
in title, H1, intro, one H2, and 3–4 times in running copy, and `uniqueH2/uniqueBody` add a
section only this page could have (what makes this theme visually distinct, which presets
map to which sub-look). That section is usually where the word count comes from.

### 4. Illustration, lint, render

```bash
node scripts/new-page/build-preview.mjs scripts/page-configs/<slug>.json   # writes the SVG, fills figure.*
node scripts/new-page/render-page.mjs   scripts/page-configs/<slug>.json   # lint → html (root + public/)
```

`render-page.mjs` refuses to build while the lint lists problems; each problem names the
config field to change. Fix the config, not the HTML — the HTML is regenerated every time.

### 5. Audit loop — at most 3 rounds

```bash
node scripts/new-page/audit.mjs scripts/page-configs/<slug>.json
```

Read `fixes` top-down; each entry says which config field moves that check. Edit the config,
re-render, re-audit. Some things to know about the interplay:

- **Topic focus** is the check most likely to stay yellow. It is the keyword's share of the
  title/H1/H2/intro word graph. Adding keywords elsewhere does nothing; renaming or cutting
  H2s that share no word with the keyword is the fix.
- **Word count and density pull against each other.** Adding 150 words of copy lowers
  density; if density was near 0.6% it drops to yellow. Add the phrase once for every ~150
  words you add.
- **Yellow on description length** at 161–165 chars is worth 1.5 raw points. If shortening
  it would make it worse for a human, leave it and say so.

**After 3 rounds below 95, stop.** Report the score, the remaining fixes, and your read on
why they are stuck (usually: the keyword is generic so topic focus can't climb, or the
theme has too little to say for 650 honest words). The user decides whether to ship at 92 or
rework — that is not a call to make by padding the copy.

### 6. Wire it into the site

```bash
node scripts/new-page/inject-backlinks.mjs scripts/page-configs/<slug>.json --from a.html,b.html,c.html
node scripts/new-page/register.mjs        scripts/page-configs/<slug>.json --touch a.html,b.html,c.html
```

Backlinks go to the 4–6 partners chosen in step 1 (the ones the new page links *to* — a
two-way loop is what circulates authority). `inject-backlinks` appends one card to each
page's existing related-links block and reports `no-container` for pages it will not guess
at; do those by hand if they matter, otherwise pick a different partner. When a partner is
itself generated by `scripts/build-*.mjs`, the script also appends the link to that page's
`links:[…]` in the builder source, so a later rebuild keeps it — the result line says
`links[] updated` when that happened. Then re-audit each
touched page with its own keyword (`audit.mjs <file>.html -k "<its keyword>"`, keyword from
`../页面URL-关键词-TDH-*.xlsx` or the page's H1) — a backlink should never lower a
neighbour's score, and if it did, the card was appended in the wrong place.

Do not run `npm run indexnow` yourself; the queue is registered, submission happens on deploy.

## Several keywords at once

The user may hand over a list — in the message, a txt, or a column of the TDH spreadsheet.
Treat it as one job with a plan step in front, not as N independent runs:

1. **Plan first, build nothing.**
   ```bash
   node scripts/new-page/link-candidates.mjs --batch "kw1;kw2;kw3"
   ```
   `collideWithEachOther` lists pairs that are one intent ("glitter font generator" /
   "glitter text") — merge each pair into one page and say which phrase you kept.
   `collideWithSite` lists keywords an existing page already owns — drop those and say so.
   Show the user the resulting build list (keyword → slug, merged/dropped items with the
   reason) and get a nod before writing anything; a wrong merge is expensive to undo after
   six pages link to it.
2. **Build in the order given, one full pass each** (steps 1–6 above). `link-candidates`
   reads the site from disk, so page 2 can pick page 1 as a partner if they are siblings —
   do that when the moods overlap; new pages in one batch are usually each other's best
   neighbours.
3. **Close the loop backwards.** Page 1 was built before page 2 existed, so after the last
   page, run `inject-backlinks` for each later page with `--from` the earlier siblings it
   should have been linked from, then `register.mjs --touch` those. Re-audit the touched
   pages once at the end rather than after every injection.
4. **One report**, one line per page in the format below, followed by the merge/drop
   decisions and the cross-link matrix. A page that stopped at round 3 gets its diagnosis in
   the same list — do not leave it out because the others passed.

Budget note: each page is a full write. Past 6–8 keywords, suggest splitting into batches
so the user can review the first set before the copy style is locked in for the rest.

## Report back

```
✅ y2k-font-generator.html — 96.5/100 (round 2)
   words 812 · density 1.4% · topic focus 78% · 6 internal · 1 outbound · 1 image
   remaining: 🟡 desc_length 162 chars (kept — reads better)
🔗 backlinks: aesthetic-fonts ✓  bubble-text-generator ✓  bow-font-generator ✓  cursive-fonts (tool-grid) ✓
   neighbours re-audited: no score changes
🗺 sitemap + indexnow queue updated
```

If stopped at round 3: same block, but lead with the score, list the stuck checks with the
audit's own observed values, and give the one-line diagnosis.
