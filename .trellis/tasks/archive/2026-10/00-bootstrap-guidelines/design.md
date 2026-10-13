# Design: Frontend Trellis Baseline

## Boundary

This is documentation-only bootstrap work. The deliverable is a source-backed specification layer for the existing single-package frontend, plus a short workspace baseline. Product runtime files are read as evidence and are not changed.

## Repository Data Flow

```text
content/godfather-trilogy-notes-v4.md
        │
        ├─ npm run build:content
        ▼
scripts/build-content.cjs ──> assets/data/archive.js
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
                 index.html                      notes.html
             archive modules, dialogs,       full source-note route,
             filters, search, motion           Rail TOC, source blocks
                       │                             │
                       └──────────────┬──────────────┘
                                      ▼
                         assets/js, assets/css, vendor icon
                                      │
                         npm run preview / Playwright
```

## Spec Mapping

- `directory-structure.md`: the actual root files, source-note/content boundary, generated data, assets, scripts, tests, docs, and Trellis directories.
- `component-guidelines.md`: native DOM module patterns in `index.html` and `notes.html`: render functions, stable IDs/data attributes, semantic controls, dialog/panel composition, and local CSS blocks.
- `hook-guidelines.md`: explicitly records that React/custom hooks are not present; stateful behavior is implemented with named closures and event-binding functions such as `bindCharacterCards`, `renderRules`, `openSearch`, and `closeReader`.
- `state-management.md`: documents local DOM state, URL/hash state, generated archive data, and the absence of a global store or server state.
- `type-safety.md`: documents JavaScript-only runtime contracts, generator-owned object shapes, escaping/ID invariants, and the absence of TypeScript or a runtime schema library.
- `quality-guidelines.md`: records build, preview, Playwright, syntax, diff, accessibility, reduced-motion, and security-boundary checks.
- `index.md`: navigation and scope statement, including the explicit non-applicability of framework-specific topics.

## Evidence Rules

1. Prefer repeated patterns and stable contracts over isolated markup details.
2. Reference symbols and paths instead of copying long code blocks.
3. Separate current behavior from recommendations; do not turn missing framework features into migration work.
4. Treat `docs/design-v2.md` as the visual/interaction contract and the source/test files as behavior evidence.
5. Keep generated `assets/data/archive.js` synchronized through the build command; it is evidence/output, not an authoring surface.

## Interaction Contract

The user-supplied design references—beautifului.dev, beui.dev, rareui.com, transitions.dev, ui.shadcn.com, getdesign.md, variant.com, and tasteskill.dev—are research inputs only. They must not become runtime dependencies or copied source. The executable local rule is that normal-motion interactive state changes provide entry, active, and exit feedback; related content should preserve spatial continuity with Morph/FLIP-style transitions where appropriate; `prefers-reduced-motion` switches to immediate state changes; controls use vendored Lucide icons and no emoji.

## Compatibility and Risk

- The specs must support the current native HTML/CSS/JS architecture without imposing React, TypeScript, hooks, or a state library.
- The full note must remain preserved and source-linked through stable IDs.
- The preview server allowlist and security headers are operational constraints, not optional deployment advice.
- The test suite's 390px checks must be described narrowly; complete mobile support is not established by those checks.

## Rollback Shape

Because this task changes only `.trellis/` documentation and the workspace journal, rollback is a Git revert of those documentation files. No product data or runtime behavior is involved.
