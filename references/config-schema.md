# Page config schema

One JSON file per page at `cursive-generator/scripts/page-configs/<slug>.json`. Fields marked
*(template default)* can be omitted; the template fills a sensible line from `label`. Every
field that becomes page copy is plain text — the template escapes it, so no HTML.

## Identity

| Field | Example | Notes |
|---|---|---|
| `keyword` | `"y2k font generator"` | The audited phrase. Drives everything below. |
| `file` | `"y2k-font-generator.html"` | Defaults to slug of keyword. Must contain the keyword slug. |
| `label` | `"Y2K"` | One or two words; the template builds default headings from it. |
| `appName` | `"Y2K Font Generator"` | Schema `WebApplication.name` *(template default: `<label> Font Generator`)* |
| `crumb` | `"Y2K Fonts"` | Breadcrumb leaf *(default `<label> Fonts`)* |
| `sample` | `"Y2K Baby"` | Text pre-filled in the generator and used by the illustration. Pick something the theme's audience would actually type. |
| `linkName` / `linkNote` | `"Y2K Font Generator"` / `"Glossy, bubbly 2000s-style text."` | Anchor + blurb used when other pages link *here* (inject-backlinks). Defaults: `h1` / `kicker`. |

## Meta and hero

| Field | Rule |
|---|---|
| `title` | 25–60 chars. Exact keyword phrase, starting within the first 30 chars. Pattern that works: `Y2K Font Generator – Y2K Text Copy & Paste`. |
| `description` | 120–160 chars. Exact keyword phrase once, then what the reader gets and where they'd use it. No "Welcome to". |
| `h1` | Exact keyword phrase. Can be the phrase alone or phrase + short tail (`Y2K Font Generator for Copy & Paste`). |
| `kicker` | ≤ 14 words. Mood line above the H1. **Must stay under 15 words** — the audit treats the first 15+-word `<p>` as the opening paragraph. |
| `intro` | 40–70 words. Exact keyword phrase in the first sentence or two. Says what the tool outputs (copyable Unicode) and where it's for. |

## Generator

| Field | Rule |
|---|---|
| `ids` | Comma-separated preset ids, 10–16, validated against `style-engine.js`. First 3 = illustration. |
| `chips` | Array of `[categoryId, Label]`, first is `["all","All"]`, 4–6 total. Category ids come from `engine-styles.mjs --cats`. |
| `maxlength` | *(default 160)* |

## Sections (each becomes an H2 + copy; order is fixed by the template)

| Field | Default heading | What goes there |
|---|---|---|
| `copyHeading`, `copyBody` | `<label> Fonts Copy and Paste` | How copy/paste works for *this* theme. 60–100 words. |
| `popularTitle`, `popular` | `Popular <label> Font Styles` | Which looks define the theme and which presets deliver them. 80–120 words. The illustration renders under this section. |
| `howToTitle`, `steps` | `How to Use the <label> Font Generator` | `[["1. …", "…"], ["2. …", "…"], ["3. …", "…"]]` — keep 3. |
| `socialTitle`, `social`, `limitNote` | `<label> Fonts for Social Media` | Where people paste it; platform quirks. 70–110 words. `limitNote` is one sentence. |
| `specificTitle`, `specific` | *(required, no default)* | The page's own angle — e.g. `Y2K Fonts vs Vaporwave Text`. 80–120 words. `source` renders right after it. |
| `source` | — | `{ "before": "The glossy letters come from the ", "name": "Mathematical Alphanumeric Symbols block", "href": "https://…", "after": " defined by the Unicode Standard." }` One editorial citation, https, rendered with `rel="noopener"`. |
| `uniqueH2`, `uniqueBody` | *(optional but where the word count lives)* | `uniqueBody` is an array of 2–3 paragraphs, 150–250 words total. Substance only this theme has. |
| `examplesTitle`, `examplesIntro`, `examples` | `<label> Font Examples` | `[["text", "use-case note"], …]` × 3. Rendered twice on the page. |
| `linksTitle`, `links` | `Explore Related Font Styles` | `[["Anchor", "/file.html", "one-line blurb"], …]` × 5–7. Every href must exist in the site root (`/` allowed). |
| `faqTitle`, `faqs` | `<label> Fonts FAQ` | `[["Question?", "Answer."], …]` × 5–8. Also emitted as FAQPage schema. |

## Illustration (filled by build-preview.mjs)

```json
"figure": {
  "styles": ["id1", "id2", "id3"],   // optional; defaults to first 3 of ids
  "sample": "Y2K Baby",              // optional; defaults to sample
  "tagline": "GLOSSY · BUBBLY · 2000s",
  "alt": "Y2K Baby written with the y2k font generator in bubble, bold script and star-framed Unicode styles",
  "caption": "…"                     // optional; script builds one
}
```

`alt` must include the keyword and describe what is *in* the picture. The script adds
`src`, `width`, `height`.

## Headings and topic focus

Topic focus is computed over the words in title ×3, H1 ×3, H2 ×2, intro ×1. Every H2 that
shares no word with the keyword dilutes it. With 8–9 H2s, keep at least 6 carrying `<label>`
or another keyword word; `Explore Related Font Styles` and `How to Use the … Generator`
are fine because "font"/"generator" are keyword words for most tool pages.
