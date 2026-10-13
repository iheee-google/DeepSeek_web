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
- Current product baseline is committed through `57ff43c`; this bootstrap task is documentation-only and must not alter product files.
