# Implementation Plan: Frontend Trellis Baseline

## Ordered Work

1. Inspect the existing frontend source, content compiler, preview server, tests, design document, and Trellis templates.
2. Rewrite `.trellis/spec/frontend/index.md` to describe the real layer and link the final guides.
3. Fill the directory, component, hook, state, type-safety, and quality guides with concrete local examples, non-applicability notes, and anti-patterns.
4. Add a concise adoption baseline to `.trellis/workspace/iheee/journal-1.md` covering current routes, content pipeline, latest product baseline, tests, and known validation limits.
5. Verify all internal links and referenced paths; search `.trellis/spec/` for template markers such as `To be filled`, `TODO: fill`, and placeholder prose.
6. Run documentation/task checks and the existing project checks that do not modify product behavior:
   - `python3 ./.trellis/scripts/task.py validate 00-bootstrap-guidelines`
   - `git diff --check`
   - `node --check scripts/build-content.cjs`
   - `node --check assets/js/image-viewer.js`
   - `npm test`
7. Confirm the diff contains only `.trellis/` task/spec/workspace files and no product-source changes.
8. Present the final evidence and remaining validation boundary, then complete the Trellis finish flow after approval.

## Review Gates

- Do not start product implementation; this task is documentation-only.
- Do not copy generic React/TypeScript conventions into the specs.
- Do not hand-edit generated archive data or alter the source note.
- Do not describe 390px targeted checks as full mobile support.
- Before completion, check that every important rule has a local evidence path and that no template placeholder remains.

## Rollback Points

- Before spec writing: no repository behavior changed.
- After spec writing: revert only `.trellis/spec/`, `.trellis/tasks/00-bootstrap-guidelines/`, and the appended journal entry if review finds an inaccurate rule.
- Product source, generated content, assets, and tests must remain untouched.
