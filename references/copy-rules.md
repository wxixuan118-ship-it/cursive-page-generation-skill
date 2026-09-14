# Copy rules for tool pages

The pages read like a knowledgeable friend explaining a trick, not like a landing page.
Look at `scripts/build-style-cluster.mjs` (bold, italic…) for the voice at its best.

## What every page has to get right

- **Say what the output actually is.** These generators emit Unicode characters, not fonts.
  The copy should say so plainly once ("real Unicode characters, so the style survives
  paste") and never claim to install, download, or embed a typeface.
- **Name the specific looks.** "Y2K text is glossy bubble letters, chrome-style bold, and
  star or butterfly frames" beats "many cool styles". Tie looks to preset families the page
  actually offers (bubble, double-struck, bold script, decorated frames…).
- **Give platform-level advice.** Display names allow more than usernames; screen readers
  announce these as math symbols; some apps strip combining marks. One or two of these per
  page, in the section where they belong.
- **Examples are real inputs.** `["glossy girl era", "TikTok display name"]` — text a
  person would type, with the place they'd use it.

## What to avoid

- Restating the H2 as the first sentence of the paragraph.
- Keyword in every sentence. The exact phrase 4–7 times across ~700 words is the target;
  after that use the natural variants ("y2k text", "these styles", "the generator").
- Claims about copyright, brands, or trademarks beyond "this assembles standard Unicode
  characters and does not reproduce branded artwork".
- Padding to reach the word count. If the theme genuinely has 500 words of substance, say
  so in the report instead of inventing a section.

## FAQ

Questions people actually search: "what is a y2k font", "can I use y2k text on
Instagram", "why do the letters show as boxes", "is this free". Answers 25–50 words,
self-contained (they are emitted as FAQPage schema and may be shown without the page).

## Outbound citation

One link, editorial, to something that genuinely backs a claim in the `specific` section:
the Unicode chart for the block the letters come from, a platform help page about display
names, MDN on `<img>` alt. Not a competitor, not a font marketplace.
