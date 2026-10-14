# Quality Guidelines

## Quality Baseline

The project has no configured lint or TypeScript check. Do not claim either has run. The reliable checks are the content build, JavaScript syntax checks, Playwright browser regression, preview-server boundary checks, and `git diff --check`.

## Required Workflow

### Production Static Bundle

The Cloudflare Workers Builds path for this repository is an assets-only Wrangler deployment. Keep production packaging separate from the source tree:

- `npm run build` must regenerate `assets/data/archive.js` and create a clean `dist/` containing only `index.html`, `notes.html`, `assets/`, `/_redirects`, and `/_headers`.
- `wrangler.jsonc` must point `assets.directory` to `./dist`, set `assets.html_handling` to `"none"` when the site has stable `.html` routes such as `/notes.html`, and must not add a Worker `main` or asset binding for this static site.
- When `html_handling: "none"` is used for a root site, generate a `/ /index.html 200` rule in `_redirects` so `/` remains a working entry; `_redirects` is deployment metadata and must not be served directly.
- The build command must run the publish-boundary verifier before it can hand control to `npx wrangler deploy`; a passing source preview alone is not evidence that the production bundle is safe.
- Verify the bundle with `npm run verify:deploy` and `npx wrangler@4 deploy --dry-run`. For runtime confidence, use `wrangler dev --local` against the generated bundle and check security headers plus rejection of source paths.
- Never expose the repository root as the public asset directory. `content/`, `scripts/`, `.trellis/`, tests, package files, and `.git/` remain build inputs or development files, not published assets.

### When the note or asset references change

1. Edit `content/godfather-trilogy-notes-v4.md` and the corresponding local asset files.
2. Run `npm run build:content`.
3. Check the generated counts and target mapping.
4. Run `npm test`.
5. Review the relevant desktop and targeted narrow-viewport behavior.

Never edit `assets/data/archive.js` as the authoring operation.

### When runtime page behavior changes

Run at least:

```bash
node --check scripts/build-content.cjs
node --check assets/js/image-viewer.js
npm test
git diff --check
```

If the change touches the content pipeline, preview resolver, or generated targets, also run `npm run build:content` and the targeted tests for that boundary.

For image changes, audit both sides of the mapping: source Markdown references and explicit route/module mappings. A passing HTTP request is not enough; the image must be semantically correct and retain its natural aspect ratio. Do not add a generic fallback image just to avoid an empty card.

## Browser and Accessibility Requirements

The Playwright suite in `tests/desktop-smoke.spec.js` is the behavior contract. Maintain coverage for:

- local resource loading and no console/page errors;
- preview allowlist and traversal/source-file rejection;
- unique IDs and source-target existence;
- keyboard activation, focus entering and returning from dialogs;
- `aria-expanded`, `aria-hidden`, `aria-pressed`, and nested Escape behavior;
- image natural-ratio display, viewer zoom/fullscreen, and scroll reachability;
- search routing to chapters, rules, quotes, timeline, and actual body blocks;
- filter transitions, quote changes, TOC tracking, and long-document positioning;
- reduced-motion behavior where animation affects assertions.

Use semantic buttons/links and test keyboard paths, not only mouse clicks. Dialogs must remain scrollable when their content exceeds the viewport and must return focus to the triggering element.

## Motion and Layout

Use the existing class-driven motion patterns and `IntersectionObserver` for reveal/navigation/progress. Respect `prefers-reduced-motion` by switching to immediate state changes. Do not reintroduce a continuous `window` scroll repaint loop for state that can be observer-driven.

For each new interaction, review the full state sequence rather than testing only the final screenshot:

- enter/reveal: opacity, transform, or shared-element setup;
- active feedback: hover, focus, press, filter, tab, or expansion response;
- exit/close: reverse transition or a deliberate immediate fallback;
- continuity: preserve the visual identity and spatial anchor when content moves between a card and a panel, using Morph/FLIP-style measurement where the current module already does so.

The supplied design references are inspiration only—beautifului.dev, beui.dev, rareui.com, transitions.dev, ui.shadcn.com, getdesign.md, variant.com, and tasteskill.dev. Do not add them as runtime dependencies or copy their implementations. Core controls use the vendored Lucide icons and no emoji.


Images must preserve their natural aspect ratio. New zoom or modal behavior must test anchor stability, close/reopen races, nested Escape handling, and full-screen fallback where relevant. Avoid fixed-height grids that leave an empty column when a panel is collapsed.

## Desktop Typography and Quote Display

- Desktop display line groups are established at the `1920×1080` baseline. At `1440×900` and `1024×900`, adjust the container or display size without recomputing a quote's semantic line groups; validate the same stable-ID line-group arrays in all three viewports.
- Restrict `white-space: nowrap` to intentional desktop `.title-line` and `.quote-line` groups under the existing `min-width: 901px` boundary. Never apply it globally to Chinese body text, metadata, lists, tables, or arbitrary headings; narrow layouts must regain natural wrapping.
- The homepage quote contract is structural: `.quote-main` contains the accessible `#quoteText` and paired decorative `.quote-mark--open`/`.quote-mark--close`, while translation, source, explanation, and controls remain in `.quote-details`. Use literal `“` and `”`; both marks are `aria-hidden`, and `#quoteText` exposes the complete Chinese source through its `aria-label` exactly once.
- Quote switching must settle before geometry assertions: wait for `#quoteText` to lose its transition transform, then use `getBoundingClientRect()` to check equal left/right insets, equal mark box widths, and both mark centers against the main quote center for every stable quote ID. Review both a one-line and a two-line quote at each desktop viewport.
- Quote presentation may remove only approved decorative Chinese commas/full stops in `showQuote()`'s display mapping. Source Markdown, generated archive data, full-text notes, English originals, search text, and accessible quote labels remain unchanged.

## Preview Security Boundary

Use `npm run preview`, which calls `scripts/serve-preview.cjs`. The service must continue to:

- expose only `index.html`, `notes.html`, and `assets/`;
- reject `.git`, `content/`, `scripts/`, `package.json`, dot segments, traversal, backslashes, and malformed URLs;
- serve security headers including CSP, `X-Frame-Options`, `X-Content-Type-Options`, and a restrictive referrer policy;
- accept only GET and HEAD.

Do not replace it with `python3 -m http.server` from the repository root.

## Forbidden Patterns

- Reporting a passing static check as proof of browser/runtime correctness.
- Treating a 390px targeted check as complete mobile acceptance.
- Adding an external CDN dependency for core icons or page behavior.
- Deleting or summarizing original note content to simplify a module.
- Bypassing stable IDs, focus management, reduced-motion handling, or image-ratio constraints for visual convenience.
- Adding a button, filter, card, or dialog that changes state with no enter/active/exit feedback in normal motion mode.
- Broadening the public server allowlist without a security regression.
- Using broad exception handling to hide compiler, navigation, or fullscreen errors.

## Review Checklist

- [ ] Product/design scope matches `docs/design-v2.md` and the task PRD.
- [ ] Source Markdown, generated archive, route renderers, and source links agree.
- [ ] New repeated data has stable IDs and no duplicate DOM IDs.
- [ ] Dynamic content is escaped or produced by the controlled Markdown renderer.
- [ ] Semantic controls, keyboard behavior, focus restoration, dialog state, and reduced motion are covered.
- [ ] Desktop regression passes; narrow-viewport checks are labeled accurately.
- [ ] Preview paths and security headers remain constrained.
- [ ] `git diff --check` passes and unrelated product files are not included.
