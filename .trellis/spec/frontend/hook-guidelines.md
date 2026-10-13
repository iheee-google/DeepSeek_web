# Hook Guidelines

## Applicability

React hooks and custom hook libraries are not used in this repository. Do not create `useSomething` functions, JSX components, or hook-like conventions as a substitute for understanding the existing browser lifecycle.

The native equivalent is a named closure or binding function in the route module, with explicit ownership of the DOM nodes, listeners, observer, and cleanup it creates.

## Native Stateful Patterns

Use names that describe the browser operation:

- `renderRules`, `renderPeople`, `renderTimeline`, `renderQuotes`, `renderMotifs`, and `renderHistory` create or refresh DOM records.
- `bindCharacterCards` attaches click and keyboard behavior to generated cards.
- `openSearch`/`closeSearch`, `morphPerson`, `morphMotif`, `closeReader`, and `toggleReaderFullscreen` own panel transitions and state changes.
- `IntersectionObserver` drives reveal state, route navigation state, reading progress, and the full-text Rail TOC; do not add a continuous `window` scroll repaint loop for these concerns.
- `assets/js/image-viewer.js` owns its `MutationObserver`, image decoration, fullscreen state, zoom state, and focus restoration.

Keep mutable values in the smallest closure that owns them. Examples include the current quote index, reader close timer, active TOC headings, and image-viewer state.

## Lifecycle and Cleanup

Every listener or observer added by a dynamic module must have a clear lifetime:

- Disconnect or replace observers when the observed heading set changes.
- Clear close/exit timers before opening a new reader or viewer state.
- Remove temporary ripple nodes on `animationend`.
- Update body scroll locking and `aria-hidden` together when panels open or close.
- Use `{ once: true }` or explicit cleanup when a listener has one intended invocation.

When adding a module that can rerender, make binding idempotent or bind only the newly created nodes. Duplicate listeners are a known source of double transitions and stale close callbacks.

## Data Fetching

There is no runtime data fetching or server-state cache. The browser loads local `assets/data/archive.js` as a script. The Markdown note is compiled before preview/test time. Do not fetch the source Markdown, crawl external sites, or add a client-side query/cache layer for existing archive data.

## Naming and Error Boundaries

Prefer `render*`, `bind*`, `open*`, `close*`, `toggle*`, `update*`, `focus*`, and `build*` names that expose the lifecycle operation. Keep parsing and stable-ID creation in `scripts/build-content.cjs`; keep presentation and event binding in the route.

When an optional DOM node is genuinely route-specific, optional chaining is acceptable. Do not use broad silent catches or fallback markup to hide a missing required target; fail the targeted test and fix the contract.

## Common Mistakes

- Porting React hook advice into this framework-free page.
- Registering listeners before dynamic records exist or registering them again after every render.
- Using a `setInterval` or unbounded scroll handler where an observer or event-driven update is sufficient.
- Mutating `window.CORLEONE_ARCHIVE` in a feature instead of changing the source/compiler contract.
- Leaving a timer or fullscreen listener active after a modal has been replaced.
