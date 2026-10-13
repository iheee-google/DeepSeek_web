# Component Guidelines

## What “Component” Means Here

There are no framework components. A component is a stable HTML region plus a small set of render/bind functions in `index.html` or `notes.html`, with shared behavior extracted only when it is genuinely cross-route. The current page modules are rendered from `window.CORLEONE_ARCHIVE` and then enhanced with DOM events and observers.

Relevant examples in `index.html` include `renderRules`, `renderHistory`, `renderPeople`, `renderTimeline`, `renderQuotes`, `renderMotifs`, `bindCharacterCards`, `morphPerson`, and `morphMotif`. `notes.html` builds its Rail TOC and note content from generated sections. The image viewer is the shared module in `assets/js/image-viewer.js`.

## Module Structure

For a new archive module:

1. Keep a stable semantic container in the HTML route (`#rules`, `#characters`, `#timeline`, `#motifs`, etc.).
2. Render repeated records from generated archive data rather than duplicating note prose in markup.
3. Give each record a stable `id` or `data-*` identity and a target that can be reached from search, hash navigation, or a modal link.
4. Hydrate local icons after `innerHTML` rendering with the existing Lucide runtime.
5. Bind events and observers after rendering; avoid registering duplicate listeners when a module is rerendered.
6. Keep route-specific behavior in the route file and cross-route image behavior in `assets/js/image-viewer.js`.

The compiler creates source targets in `scripts/build-content.cjs`; the page must consume those targets instead of inventing a second mapping.

### Shared Panels and Continuous Tracks

When several records share one reading surface, use one state owner instead of rendering multiple competing long panels. The rules module is the concrete pattern:

- `renderRules()` renders three `role="tab"` buttons and one `#rule-panel` `role="tabpanel"`.
- `selectRule(ruleId, options)` is the only selection path for clicks, arrow/Home/End keys, and search results; it updates `aria-selected`, `tabindex`, `is-open`, and the panel content together.
- The panel includes the escaped group/title and the compiler-produced `rule.html`; never replace the selected rule with a hand-written summary.

For chronological records, keep the navigation summary and full event separate. `renderTimeline()` emits `timeline.label` into each button-like node and keeps the complete `timeline.event` in `#timelineFocus`. All nodes belong to one `.timeline-track`; the connector is measured from the first `.timeline-dot` center to the last after rendering so a legacy multi-row grid cannot silently create a broken line.

Do not restore a seven-column wrapping grid for a continuous timeline, and do not make the full event text compete with every node. A horizontal track with an honest overflow boundary is preferable to a visually connected line that does not reach the actual nodes.

## Rendering and Content Safety

Generated text goes through the existing `escapeHtml` path when it is placed into an HTML template. Generated rich note fragments come from the controlled Markdown renderer in `scripts/build-content.cjs`. Preserve that boundary:

- Escape titles, labels, IDs used as text, and other plain values before interpolation.
- Do not concatenate arbitrary user/input strings into HTML.
- Do not hand-edit generated `assets/data/archive.js` to patch a display issue.
- If a new rich fragment is needed, add its transformation to the compiler or use text nodes rather than bypassing the boundary.

Search, history, rule, quote, people, and motif modules should retain a source target so a user can continue into `notes.html` where appropriate.

## Semantic Controls and Accessibility

Use native controls whenever an action is possible:

- `<button type="button">` for toggles, filters, quote changes, close controls, and fullscreen.
- `<a href="...">` for route or source navigation.
- `aria-expanded` and `aria-controls` for rule panels.
- `role="dialog"`, `aria-modal`, `aria-hidden`, and `aria-labelledby` for the reader and search panels.
- `tabindex="0"`, `role="button"`, and Enter/Space handling only for generated cards that are intentionally keyboard-activatable, as in the character and timeline cards.

When a modal opens, move focus into its close/control surface; when it closes, restore focus to the trigger. Preserve Escape ordering for nested image viewer and reader dialogs. Test this behavior in `tests/desktop-smoke.spec.js`.

## Styling and Motion

Styles are local CSS blocks in the HTML route or shared CSS files, using the existing custom properties and semantic class names. Keep layout and behavior separate:

- CSS controls presentation, transitions, visibility, and responsive layout.
- JavaScript toggles classes and ARIA state; it should not duplicate layout rules with inline styles unless a measured viewer layout requires it.
- Use stable `data-reveal`/`is-visible`, `is-open`, `is-active`, and `is-closing` states for motion and interaction.
- Respect `prefers-reduced-motion`; instant transitions are the correct reduced-motion behavior, not a second visual theme.

`docs/design-v2.md` is the product-level visual reference. The project may learn interaction patterns from beautifului.dev, beui.dev, rareui.com, transitions.dev, ui.shadcn.com, getdesign.md, variant.com, and tasteskill.dev, but must not copy their source code or add them as runtime dependencies.

### Interaction Contract

For every new interactive element, define and implement:

- an entry/reveal state;
- an active, hover, focus, or press response;
- an exit/close state when the element can disappear or change context;
- a continuous transition when the same content moves between surfaces, using the existing morph/FLIP approach where appropriate;
- an immediate, non-motion fallback under `prefers-reduced-motion`.

A static element does not need decorative motion merely to satisfy a count. The requirement applies to state changes and user-triggered transitions; the reason for intentionally static content should be clear from the component. Use the local Lucide icon set for controls and never use emoji as interface icons.

## Common Mistakes

- Rendering a new repeated module with hardcoded summaries instead of `archive` records.
- Adding a visual icon click handler while leaving the containing card or semantic control inert.
- Forgetting `hydrateIcons()` or observer/binding setup after dynamic rendering.
- Giving modal copies the same IDs as source content.
- Making a panel visually open while leaving `aria-expanded` or `aria-hidden` stale.
- Using `object-fit: cover` for archive images whose source proportions must remain visible; the current image viewer uses proportional containment.
