# Journal - iheee (Part 1)

> AI development session journal
> Started: 2026-10-13

---

## Trellis adoption baseline

- Existing product is a native HTML/CSS/JavaScript archive explorer with `/` and `/notes.html`; no React, TypeScript, custom hooks, global state library, or backend is present.
- `content/godfather-trilogy-notes-v4.md` is the source of truth. `npm run build:content` generates `assets/data/archive.js`; generated data is not edited by hand.
- `npm run preview` uses the allowlisted `scripts/serve-preview.cjs`; `npm test` runs six Playwright checks. The 390px checks are targeted coverage, not complete mobile acceptance.
- Product direction is archive exploration first, with `/notes.html` as the complete source-note route; all original note material remains represented and the family–power visual direction remains authoritative in `docs/design-v2.md`.
- Interaction direction is animation-first for normal state changes: enter/active/exit feedback, Morph/FLIP continuity where content changes context, reduced-motion fallback, local Lucide icons, and no emoji. The supplied reference sites are research inputs, not dependencies.
- Source-note images remain local when referenced by the complete note; homepage modules must use only semantically mapped images and never generic rotating fallbacks.
- The pre-redesign product baseline was committed through `57ff43c`; the archive/timeline redesign is tracked separately and does not alter the source note or image assets.

## Archive modules and timeline redesign

- The homepage rules now use three native tab selectors and one shared full-content panel through `selectRule`; the complete rule HTML remains compiler-owned.
- The timeline data adds a derived `label` for navigation while preserving the complete `event`; all 14 nodes share one horizontal track, and the connector is measured between actual dot centers.
- The notes portal and fact-checking cards use natural-height desktop layouts; fact-checking cards intentionally render no images.
- This redesign is desktop-focused. Existing 390px checks remain regression coverage only and are not mobile acceptance.
- The desktop timeline keeps dot/connector geometry aligned, supports mouse drag scrolling without hijacking node clicks, and exposes full rule content through the shared panel.
- Final desktop validation passed all 6 Playwright tests; the latest task hardening commit is `183413a`. This task does not claim complete mobile acceptance.

## History evidence bands redesign

- The history module now uses two vertically stacked, natural-height evidence bands. The four historical facts and three interpretation boundaries remain compiler-rendered in full; no history images or source-note changes were introduced.
- Desktop screenshot review confirms the compact section header, controlled body width, stable IDs, chapter 09 link, and no adjacent short-card blank column. Mobile behavior was not treated as a design deliverable.
- Advisor hardening removed the legacy history-card translate hover, wrapped the left metadata/title into a compact aside, and added opacity, overflow, chapter-link, and history-search assertions. Final desktop screenshots cover the header plus both evidence bands.
- Final motion hardening restored opacity/transform transitions alongside the card visual transition. Six Playwright tests verify both history rows reveal on entry, the first row reveals again after leaving and returning, remain uncropped, and keep compact left-rail geometry.

## Cloudflare static migration

- Cloudflare Workers Builds currently uses `pnpm run build`, `npx wrangler deploy`, and root `/`; this task prepares the native archive site for the replacement build command `npm run build` without remote push or production deployment.
- The local production bundle now builds `dist/` from the content generator and publishes only `index.html`, `notes.html`, `assets/`, `_redirects`, and `_headers`. The build self-verifies its publish boundary, rejects hidden paths and symlinks, and preserves `.html` routes with `html_handling: "none"` plus a root 200 proxy.
- A pure `git archive` checkout from `4c27099` (without worktree overlay) passed `npm ci --ignore-scripts --include=dev`, `npm run build`, and `npm run verify:deploy`; Wrangler assets-only dry-run read 99 files with no bindings. Local Wrangler production smoke returned 200 for `/`, `/notes.html`, and archive data, 404 for source and metadata paths, and the expected security headers. The full six-test Playwright suite also passed directly against the Wrangler local production bundle at `127.0.0.1:8787`, separate from source-preview validation; all syntax/diff checks passed.
- Post-deployment record: GitHub `main` and local `master` both point to `740f73b`; `backup/cloudflare-old` preserves `937470a`. Cloudflare production configuration uses `npm run build`, `npx wrangler deploy`, and root `/`. Read-only HTTP checks against `https://iheee.xyz/`, `/notes.html`, and `/assets/data/archive.js` returned 200 with the expected security headers; `/content/...`, `/scripts/...`, `/.git/HEAD`, `/_headers`, and `/_redirects` returned 404. This is an online HTTP verification record, not a claim of live browser Playwright coverage.

## Systematic typography planning

- The active typography task includes desktop viewports `1920×1080`, `1440×900`, and `1024×900`; the user reports that the isolated `默` also occurs at `1920×1080`, so 1920 is a formal acceptance viewport.
- Mobile phones/tablets are explicitly out of scope: no mobile layout development, mobile-specific visual adjustment, mobile screenshot, or mobile acceptance will be added. Any historical narrow-viewport check must not be described as mobile delivery.
- Planning research incorporated the applicable parts of the design-taste-frontend skill, shadcn Typeset, Transitions.dev, beUI, and public reference patterns. The task uses four text layers: display title (usually 1–2 lines), main quote (1–3 semantic lines), short metadata (single line when space allows), and natural-flow body text. React, Tailwind, external fonts, mobile rules, and copied reference code are excluded because they conflict with the repository constraints.
- The user approved presentation-only punctuation normalization for the homepage quote hero: decorative Chinese commas and full stops may be omitted in the large display and sentence boundaries become visual lines; source Markdown, generated data, `/notes.html`, English source, search text, and accessible full quote retain original punctuation. Quote decorations must use explicit paired `“` and `”`, not a rotated opening glyph.
- The plan records that the current six-test suite includes one historical `390×844` image-viewer regression; typography tests will use only `1920×1080`, `1440×900`, and `1024×900`. The quote checks cover all nine records, the longest quote, rapid final-state switching, reduced motion, actual CSS viewport/DPR/font metrics, and ID-keyed display mappings rather than a global punctuation sanitizer.

## Systematic typography implementation

- `index.html` now uses shared desktop title rules and semantic `.title-line` groups for the rules, portal, timeline, people, history, motifs, and ending modules. The quote display uses stable-ID punctuation mappings, explicit `“`/`”` decorations, one accessible Chinese version, and cancellable quote transitions so rapid selection cannot leave mixed metadata.
- `notes.html` now uses the same hero title grouping and a controlled generated heading grouping that keeps parenthetical title segments together without changing source text, heading IDs, or Rail TOC text. The title and column rules were checked at the formal desktop viewports rather than by adding mobile design.
- User clarified that 1920×1080 is the standard desktop composition. Quote line groups are therefore fixed from the 1920 baseline: 1440×900 and 1024×900 may reduce columns or type size, but must not collapse a quote into a different line grouping merely because it happens to fit. The regression now compares all nine quote line-group arrays across all three desktop viewports; the result is identical.
- The added Playwright typography regression measures real `Range.getClientRects()` line boxes, title/container overflow, chapter heading lines, paired quote-mark geometry, all 9 quote records, rapid switching, and reduced motion. It records CSS viewport, DPR, declared font stack, loaded font status, and explicitly notes that CSSOM cannot expose the actual rendered font.
- Validation passed: `npm run build` (10 chapters / 44 people / 14 timeline nodes / 12 motifs / 80 images plus deploy-boundary verification), `npm test` 7/7, inline and standalone JavaScript syntax checks, and `git diff --check`. Final screenshots were reviewed at 1920×1080, 1440×900, and 1024×900 for both routes; no source Markdown, generated archive, images, or deployment configuration changed.
- Follow-up after `e276d4e`: quote-02 now groups “一个不抽时间陪伴家人的男人 / 永远算不上真正的男人”, and quote-06 groups “当我以为我已经抽身了 / 他们又把我硬生生拽了回去！”; the desktop regression asserts these stable-ID line groups across 1920/1440/1024. Dedicated quote-02/quote-06 main-display screenshots cover all three desktop viewports; the final quote-index label patch was additionally rechecked at 1024, and the full 7-test suite passed. `bb5711a` also contains the pre-existing Cloudflare post-deployment journal record; it did not change deployment configuration or publish assets.
