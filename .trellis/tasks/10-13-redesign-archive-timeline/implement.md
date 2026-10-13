# Implementation Plan: 档案模块与时间轴重设计

## Ordered Work

1. Before implementation, load the frontend Trellis specs and re-read `prd.md` / `design.md`; confirm the worktree baseline and avoid unrelated Trellis scaffold files.
2. Update `scripts/build-content.cjs` only as needed to add a short timeline navigation `label` while preserving each original `event`; run `npm run build:content` and inspect the generated shape.
3. Replace the three-column rules rendering in `index.html` with three accessible selectors and one shared full-content panel; centralize selection so clicks, keyboard input, and search use the same function.
4. Rebuild `#notes-portal` as a compact archive gateway with clear title, metadata, description, and CTA hierarchy; preserve existing IDs, routes, and counters.
5. Rebuild `#historyGrid` as image-free evidence cards with natural height, explicit labels, and responsive single-column fallback; verify no history image nodes are emitted.
6. Rebuild the timeline markup/CSS/interaction as one horizontal track containing its own connector and all 14 nodes; separate short node labels from the full `#timelineFocus` event text and implement first/last keyboard navigation.
7. Add normal-motion enter/active/exit transitions and `prefers-reduced-motion` behavior for rule switching, portal interactions, history reveal, and timeline selection without reintroducing a window scroll listener.
8. Update `tests/desktop-smoke.spec.js` for the new contracts:
   - one active rule selector and complete panel content
   - keyboard rule switching and search activation
   - portal layout anchors and no history images
   - one timeline track, 14 nodes, connector span, first/last activation
   - label/event separation, diagnostics, reduced-motion, and targeted 390px overflow
9. Run the desktop visual review at 1440×900, focusing on the four supplied screenshots; adjust only verified desktop layout defects. Do not expand into mobile design.
10. Run the full checks:
    - `npm run build:content`
    - `node --check scripts/build-content.cjs`
    - `node --check assets/js/image-viewer.js`
    - `npm test`
    - `git diff --check`
    - duplicate-ID and generated-data consistency checks
11. Review the diff for scope, confirm no image files or source-note content changed, then present the final evidence for approval before `task.py start` / implementation gate is advanced.

## Validation Matrix

| Area | Observable check |
|---|---|
| Rules | Three selectors exist; exactly one is active; each selection exposes the matching full HTML; arrow/Home/End and search select the same rule |
| Portal | Title, summary, metadata and CTA have stable layout anchors; no unexpected fixed-height gap or horizontal overflow at target viewports |
| History | Exactly two cards; zero images; text starts below labels; cards have natural independent heights; mobile becomes one column |
| Timeline | 14 nodes in one track; connector begins/ends at node centers; no second row; first and last nodes activate and focus panel updates |
| Motion | Active/exit classes appear in normal mode; reduced motion removes or shortens transitions without hiding content |
| Regression | No console/page errors or failed responses; existing image viewer, dialogs, search routes, IDs and notes page remain valid. Existing narrow-viewport smoke coverage is not mobile acceptance |

## Review Gates

- Do not begin product edits until the user approves the final planning summary and `task.py start` is run.
- Do not copy reference-site code, add a framework, or add image assets for visual fill.
- Do not hand-edit `assets/data/archive.js`; regenerate it from Markdown.
- Do not use a two-row CSS grid for the timeline connector.
- Do not treat 390px targeted checks as complete mobile acceptance.
- Do not declare completion until screenshots and geometry assertions both pass.

## Rollback Points

- Before implementation: only task artifacts exist.
- After generator change: revert the generator and regenerate archive data.
- After module changes: revert `index.html` and tests; source Markdown and images remain untouched.
- Before commit: use `git diff --check`, scoped status, and test results to prevent unrelated Trellis scaffold files from entering the commit.
