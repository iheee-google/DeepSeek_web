# Frontend Development Guidelines

These guidelines describe the frontend that exists in this repository. They are for future changes to the native HTML/CSS/JavaScript archive explorer and its complete-note route; they are not a migration plan.

## Architecture at a Glance

```text
content/godfather-trilogy-notes-v4.md
  └─ scripts/build-content.cjs
       └─ assets/data/archive.js (generated)
            ├─ index.html (archive modules and interactions)
            └─ notes.html (complete note, Rail TOC, source jumps)

assets/css/ assets/js/ assets/vendor/ assets/{posters,portraits,scenes}/
scripts/serve-preview.cjs + Playwright tests
```

The source note is the authoring boundary. The generated archive is a build output. The two HTML routes consume the same generated data and local assets.

## Guidelines Index

| Guide | Use it for | Status |
|---|---|---|
| [Directory Structure](./directory-structure.md) | Files, assets, generated data, scripts, and tests | Applicable |
| [Component Guidelines](./component-guidelines.md) | Native DOM modules, rendering, controls, accessibility, and styling | Applicable |
| [Hook Guidelines](./hook-guidelines.md) | Stateful browser logic and the explicit absence of React hooks | Applicable as a non-framework mapping |
| [State Management](./state-management.md) | DOM, URL, archive-data, modal, and transient state | Applicable |
| [Type Safety](./type-safety.md) | JavaScript data contracts, escaping, IDs, and runtime checks | Applicable |
| [Quality Guidelines](./quality-guidelines.md) | Build, preview, browser tests, accessibility, motion, and review | Applicable |

## Non-Applicable Template Topics

This project does not use React, TypeScript, JSX, a component framework, a client-side state library, a server-state/cache library, or a runtime schema package. Do not introduce conventions for those tools as if they already existed. The corresponding guides document the native alternative and the boundary for introducing one in the future.

## Product Constraints That Affect Frontend Work

These decisions are product-level facts recorded in `docs/design-v2.md` and must be respected by implementation:

- The primary experience is archive exploration on `/`; `notes.html` is the supporting complete-source reading route, not a reason to duplicate ten chapter readers on the homepage.
- All source-note material remains represented. A module may reorganize or expose content, but it must not replace the original note with summaries or remove source links.
- The visual direction is the family–power intersection: a warm-paper reading surface carries the main archive, while the homepage opening, quote pause, and closing frame use a limited dark-study surface for power and shadow. Do not revert to a full dark theme, restore the gray-green palette, or introduce an unrelated visual system. Keep surface/foreground pairs explicit and verify contrast on both light and dark surfaces.
- Motion and interaction are first-class product behavior: new interactive elements need visible enter, active, and exit feedback, with continuous shared-element transitions where the same content changes context.
- The supplied reference sites are research sources, not dependencies or code sources: [beautifului.dev](https://beautifului.dev/), [beui.dev](https://beui.dev/), [rareui.com](https://rareui.com/), [transitions.dev](https://transitions.dev/), [shadcn/ui](https://ui.shadcn.com/), [getdesign.md](https://getdesign.md/), [variant.com](https://variant.com/), and [tasteskill.dev](https://www.tasteskill.dev/).

## Source-Backed Rules

1. Edit `content/godfather-trilogy-notes-v4.md` for note content and run `npm run build:content`; do not hand-edit `assets/data/archive.js`.
2. Keep stable source links through generated IDs such as `chapter-03-heading`, `person-01-part-...`, and `*-block-001`.
3. Keep the archive explorer in `index.html` and the complete source-note experience in `notes.html`; do not reintroduce a duplicate ten-chapter homepage reader without a new requirement.
4. Use local assets and Lucide icons from `assets/vendor/lucide.min.js`; do not make the page depend on a CDN for core UI.
5. Use `npm run preview` for browser checks. The preview service intentionally exposes only the two HTML routes and `assets/`.
6. Treat `docs/design-v2.md` as the product visual/interaction reference. Extract stable engineering rules here; do not copy the whole design document into `.trellis/spec/`.
7. Use local Lucide UI icons and never introduce emoji into the interface.

## Verification Entry Points

- Content/build: `npm run build:content`
- Preview: `npm run preview`
- Browser regression: `npm test`
- JavaScript syntax: `node --check scripts/build-content.cjs` and `node --check assets/js/image-viewer.js`
- Workspace sanity: `git diff --check`

The current Playwright suite includes desktop acceptance and targeted 390px checks. The narrow-viewport checks must not be described as complete mobile acceptance.

## Memory-to-Spec Rule

When a durable project decision is learned in conversation and it changes how future code must be written, capture the executable part in the relevant spec file and keep the conversational memory as a pointer. Do not paste an entire conversation into the repository.
