# new-page — keyword → audited tool page

A Claude Code skill for [cursive-text-generator.net](https://www.cursive-text-generator.net).
Give it one target keyword and it produces a Unicode font-generator landing page that
scores **95+** on the [onpage-audit](https://github.com/wxixuan118-ship-it/onpage-audit) rubric, with an
illustration, two-way internal links to existing pages, sitemap and IndexNow registration.

Claude does the judgment work (copy, preset choice, link partners); the scripts do the
mechanical work and act as referee. If three audit rounds do not reach 95 the skill stops
and reports instead of padding the copy.

## Layout

```
SKILL.md                  the skill (goes in .claude/skills/new-page/)
references/               field-by-field config schema + copy rules
scripts/                  pipeline (goes in cursive-generator/scripts/new-page/)
site-patch/               cluster-template.mjs with the figure/source slots + CSS snippet
example/                  the y2k-font-generator config that scored 98.4 on first render
```

## Install

Project root is the folder that contains `cursive-generator/`.

```bash
# 1. the skill
mkdir -p .claude/skills/new-page
cp SKILL.md .claude/skills/new-page/
cp -r references .claude/skills/new-page/

# 2. the pipeline scripts (they import ../lib/cluster-template.mjs, so the path matters)
mkdir -p cursive-generator/scripts/new-page cursive-generator/scripts/page-configs
cp scripts/*.mjs cursive-generator/scripts/new-page/

# 3. template slots for the illustration and the outbound citation
#    (diff against your copy first — this is the full file as of 2026-09-14)
cp site-patch/cluster-template.mjs cursive-generator/scripts/lib/cluster-template.mjs
cat site-patch/aesthetic-cluster.css.snippet >> cursive-generator/assets/aesthetic-cluster.css
cp cursive-generator/assets/aesthetic-cluster.css cursive-generator/public/assets/
```

Requires the `onpage-audit` skill at `~/.claude/skills/onpage-audit/` (python3 with
`requests` + `beautifulsoup4`) and Node 18+.

## Run

In Claude Code, from the project root:

```
make a page for "y2k font generator"
```

Or drive the scripts by hand from `cursive-generator/`:

```bash
node scripts/new-page/link-candidates.mjs "y2k font generator" --terms "retro,bubble,star,cute"
node scripts/new-page/engine-styles.mjs --cat bubble --sample "Y2K Baby"
#   … write scripts/page-configs/y2k-font-generator.json (see references/config-schema.md)
node scripts/new-page/build-preview.mjs   scripts/page-configs/y2k-font-generator.json
node scripts/new-page/render-page.mjs     scripts/page-configs/y2k-font-generator.json
node scripts/new-page/audit.mjs           scripts/page-configs/y2k-font-generator.json
node scripts/new-page/inject-backlinks.mjs scripts/page-configs/y2k-font-generator.json --from aesthetic-fonts.html,cute-fonts.html
node scripts/new-page/register.mjs        scripts/page-configs/y2k-font-generator.json --touch aesthetic-fonts.html,cute-fonts.html
```

## Several keywords

Plan first, then build one by one, then close the link loop backwards — see
"Several keywords at once" in SKILL.md. The plan step:

```bash
node scripts/new-page/link-candidates.mjs --batch "glitter font generator;y2k text generator;glitter text"
# → which keywords collide with each other (merge) and which an existing page already owns (drop)
```

## What each script does

| Script | Role |
|---|---|
| `link-candidates.mjs` | Ranks existing pages as link partners by word overlap; flags keyword collisions; `--batch` checks a list against itself and the site |
| `engine-styles.mjs` | Browse / search / validate `style-engine.js` preset ids with rendered samples |
| `build-preview.mjs` | 1200×630 SVG drawn by the real engine in the page's own presets; fills `figure.*` |
| `render-page.mjs` | Lints the config against the audit rules (title length, keyword placement, word count, links exist…) then renders to root + `public/` |
| `audit.mjs` | Runs `onpage_audit.py`, maps each fix back to the config field that moves it |
| `inject-backlinks.mjs` | Appends a card to each partner's related-links block **and** to whichever config owns the page (`scripts/build-*.mjs` or `scripts/page-configs/*.json`) so rebuilds keep it; idempotent |
| `neighbour-scores.mjs` | Audits touched pages against their own keyword; `--save` / `--compare` flags any score drop after a backlink injection |
| `register.mjs` | sitemap.xml + indexnow-urls.txt (submission stays a manual `npm run indexnow`) |

## Scope

Tool pages only (font/text generators rendered through `cluster-template.mjs`). Not for
"X in cursive" nation pages, blog posts, or editing an existing page's copy.
