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
