# Bootstrap the Frontend Trellis Baseline

## Goal

Capture the existing project's real frontend conventions in Trellis so future tasks and agents extend the site without assuming a framework, a typed application layer, or a server-backed state model. Record a concise current-project baseline without reconstructing the site's entire historical development.

## Confirmed Background

- The repository is a single-package, framework-free frontend project built from native HTML, CSS, and browser JavaScript.
- The primary product files are `index.html` (archive exploration) and `notes.html` (complete source-note reading route).
- `content/godfather-trilogy-notes-v4.md` is the source content. `scripts/build-content.cjs` compiles it into `assets/data/archive.js`; generated data is not hand-authored in the page.
- `scripts/serve-preview.cjs` exposes only `index.html`, `notes.html`, and `assets/` and adds security headers.
- `tests/desktop-smoke.spec.js` is the browser regression suite and `playwright.config.js` starts the project preview service.
- `docs/design-v2.md` defines the current archive-explorer visual and interaction direction.
- The existing product baseline is represented by commits `57ff43c`, `ac092a8`, `81f356a`, and earlier history. The current validation baseline includes six Playwright tests; 390px checks are targeted coverage, not full mobile acceptance.

## Scope

### In scope

1. Replace template-only content in `.trellis/spec/frontend/` with source-backed guidance:
   - `index.md`
   - `directory-structure.md`
   - `component-guidelines.md`
   - `hook-guidelines.md`
   - `state-management.md`
   - `type-safety.md`
   - `quality-guidelines.md`
2. Document the actual DOM/component, data-generation, interaction, accessibility, animation, testing, and preview-service patterns with file and symbol references.
3. Explicitly mark React hooks, TypeScript, runtime schema libraries, and external state libraries as not used in this repository; document the native alternatives instead of inventing conventions.
4. Add concrete examples and anti-patterns from this codebase.
5. Record one concise current-project baseline in `.trellis/workspace/iheee/journal-1.md`.
6. Keep the task artifacts (`prd.md`, `design.md`, and `implement.md`) as the durable plan for this bootstrap work.

### Out of scope

- No product feature, visual redesign, content change, dependency change, or refactor of `index.html`, `notes.html`, scripts, assets, or tests.
- No reconstruction of every previous conversation or historical implementation step.
- No migration to React, TypeScript, a component library, a client-side state library, or a backend.
- No claim that targeted 390px checks constitute complete mobile acceptance.
- No commit, archive, or task activation until the planning summary is approved and the required workflow gate is passed.

## Requirements

- R1: Every important guideline must be traceable to an existing source file, test, project document, or repeated local pattern.
- R2: The spec index must match the final set of applicable files.
- R3: No template placeholder text, empty guidance section, or generic framework instruction may remain in `.trellis/spec/`.
- R4: The guidelines must preserve the content pipeline invariant: edit the Markdown source, run `npm run build:content`, then run the browser checks; do not hand-edit generated archive data.
- R5: The guidelines must preserve the preview security boundary: use `npm run preview`, not a repository-root static server that exposes source and Git files.
- R6: The quality guidance must describe the existing Playwright coverage, accessibility expectations (semantic controls, keyboard activation, focus return, dialog state), reduced-motion handling, and the distinction between desktop acceptance and targeted narrow-viewport checks.
- R7: The journal entry must identify the current implementation baseline and known validation boundary, not duplicate the full task plan.
- R8: Product source files must remain unchanged by this bootstrap task.
- R9: The specs must preserve the user's interaction contract: motion for normal-mode state changes, enter/active/exit feedback, shared-element continuity where appropriate, reduced-motion fallback, local UI icons, and no emoji. The supplied reference sites are inspiration only and must not become runtime dependencies or copied code.

## Acceptance Criteria

- [x] All applicable frontend spec files contain concrete, project-specific guidance, examples, references, and anti-patterns.
- [x] Non-applicable template topics are explicitly explained rather than presented as invented patterns.
- [x] `index.md` links to exactly the final spec files and no spec contains placeholder markers.
- [x] Spec links and referenced paths resolve within the repository.
- [x] The workspace journal contains one concise baseline entry for this Trellis adoption.
- [x] `python3 ./.trellis/scripts/task.py validate 00-bootstrap-guidelines` passes.
- [x] Product-source diff is empty; only `.trellis/` planning/spec/journal files change.
- [x] The final review identifies any validation not performed and does not overstate mobile or runtime coverage.
- [x] The frontend specs record the supplied interaction references and animation contract without duplicating the product design document.

## Open Questions

None blocking. The repository structure and the user's requested scope resolve the framework and documentation boundaries.
