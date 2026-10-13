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
