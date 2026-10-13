# State Management

## Current Model

This project has no Redux-like store, reactive framework, server-state cache, or backend session. State is deliberately split between generated archive data, DOM attributes/classes, URL hashes, and small module closures.

## State Categories

### Generated archive data

`window.CORLEONE_ARCHIVE` in `assets/data/archive.js` is the read model produced by `scripts/build-content.cjs`. It contains chapters, rules, people, timeline entries, quotes, history cards, motifs, stable search targets, and metadata. Treat it as build output: change the Markdown/compiler, regenerate, and reload it.

### DOM/UI state

Use the DOM as the state surface for local presentation:

- `is-open`, `is-active`, `is-visible`, `is-closing`, and `is-expanded` classes describe visual state.
- `aria-expanded`, `aria-hidden`, `aria-pressed`, and `hidden`/visibility behavior describe accessible state.
- `data-group`, `data-person`, `data-motif`, `data-note-jump`, and `data-search-index` identify relationships.
- `index.html` keeps rule, quote, filter, reader, search, timeline, and navigation state close to the element that owns it.

A state change must update its CSS and ARIA representations together. For example, opening a rule changes both `.is-open`/panel visibility and `aria-expanded`; opening the reader changes its open class, `aria-hidden`, body scroll lock, and focus.

### URL/source state

Use hashes and stable IDs for navigable content. Search and timeline links send users to `notes.html#<stable-target>`, and the full-text page derives its Rail TOC from actual `h2`/`h3` IDs. Do not use array indexes as long-lived URL targets.

### Transient lifecycle state

Timers, observer references, current quote index, reader focus target, fullscreen state, and image zoom/scroll anchor belong to the smallest owning module. They are not global application state.

## Promotion Rules

Do not promote local state into a new global store merely because multiple functions need it. First use:

1. a local closure variable;
2. a stable `data-*`/ARIA/class state on the owning DOM node;
3. a generated archive field if the value is content-derived;
4. a URL hash if it is a user-navigable source target.

Only introduce a shared abstraction when two routes truly share the same behavior and the abstraction can preserve the existing focus, reduced-motion, and cleanup contracts. The current image viewer is the established cross-route shared module.

## Server State

There is no server state in the current product. The preview server serves static files only. Do not add fetch/retry/cache behavior to solve a content problem that belongs in the build pipeline.

## Derived State and Filtering

Derive counts and visibility from the rendered records and generated archive data. Character filters in `index.html` clear pending exit timers before switching visibility; preserve that behavior when changing filtering. Search results must use the compiler's stable targets and must not select hidden cards as if they were visible destinations.

## Common Mistakes

- Changing a class without changing the corresponding ARIA attribute.
- Leaving a close timer active so a newly opened reader is closed by an old callback.
- Maintaining a second copy of a chapter/person/motif record in page JavaScript.
- Treating a display index as a source ID.
- Replacing observer-driven navigation/progress with a continuous scroll listener.
- Adding a backend or client cache when the requested data is already bundled locally.
