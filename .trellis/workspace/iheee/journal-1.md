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
- The pre-redesign product baseline was committed through `57ff43c`; the archive/timeline redesign is tracked separately and does not alter the source note or image assets.

## Archive modules and timeline redesign

- The homepage rules now use three native tab selectors and one shared full-content panel through `selectRule`; the complete rule HTML remains compiler-owned.
- The timeline data adds a derived `label` for navigation while preserving the complete `event`; all 14 nodes share one horizontal track, and the connector is measured between actual dot centers.
- The notes portal and fact-checking cards use natural-height desktop layouts; fact-checking cards intentionally render no images.
- This redesign is desktop-focused. Existing 390px checks remain regression coverage only and are not mobile acceptance.
- The desktop timeline keeps dot/connector geometry aligned, supports mouse drag scrolling without hijacking node clicks, and exposes full rule content through the shared panel.
- Final desktop validation passed all 6 Playwright tests; the latest task hardening commit is `183413a`. This task does not claim complete mobile acceptance.

## History evidence bands redesign

- The history module now uses two vertically stacked, natural-height evidence bands. The four historical facts and three interpretation boundaries remain compiler-rendered in full; no history images or source-note changes were introduced.
- Desktop screenshot review confirms the compact section header, controlled body width, stable IDs, chapter 09 link, and no adjacent short-card blank column. Mobile behavior was not treated as a design deliverable.
- Advisor hardening removed the legacy history-card translate hover, wrapped the left metadata/title into a compact aside, and added opacity, overflow, chapter-link, and history-search assertions. Final desktop screenshots cover the header plus both evidence bands.
- Final motion hardening restored opacity/transform transitions alongside the card visual transition. Six Playwright tests verify both history rows reveal on entry, the first row reveals again after leaving and returning, remain uncropped, and keep compact left-rail geometry.

## Cloudflare static migration

- Cloudflare Workers Builds currently uses `pnpm run build`, `npx wrangler deploy`, and root `/`; this task prepares the native archive site for the replacement build command `npm run build` without remote push or production deployment.
- The local production bundle now builds `dist/` from the content generator and publishes only `index.html`, `notes.html`, `assets/`, `_redirects`, and `_headers`. The build self-verifies its publish boundary, rejects hidden paths and symlinks, and preserves `.html` routes with `html_handling: "none"` plus a root 200 proxy.
- A pure `git archive` checkout from `4c27099` (without worktree overlay) passed `npm ci --ignore-scripts --include=dev`, `npm run build`, and `npm run verify:deploy`; Wrangler assets-only dry-run read 99 files with no bindings. Local Wrangler production smoke returned 200 for `/`, `/notes.html`, and archive data, 404 for source and metadata paths, and the expected security headers. The full six-test Playwright suite also passed directly against the Wrangler local production bundle at `127.0.0.1:8787`, separate from source-preview validation; all syntax/diff checks passed.
- Post-deployment record: GitHub `main` and local `master` both point to `740f73b`; `backup/cloudflare-old` preserves `937470a`. Cloudflare production configuration uses `npm run build`, `npx wrangler deploy`, and root `/`. Read-only HTTP checks against `https://iheee.xyz/`, `/notes.html`, and `/assets/data/archive.js` returned 200 with the expected security headers; `/content/...`, `/scripts/...`, `/.git/HEAD`, `/_headers`, and `/_redirects` returned 404. This is an online HTTP verification record, not a claim of live browser Playwright coverage.

## Systematic typography planning

- The active typography task includes desktop viewports `1920×1080`, `1440×900`, and `1024×900`; the user reports that the isolated `默` also occurs at `1920×1080`, so 1920 is a formal acceptance viewport.
- Mobile phones/tablets are explicitly out of scope: no mobile layout development, mobile-specific visual adjustment, mobile screenshot, or mobile acceptance will be added. Any historical narrow-viewport check must not be described as mobile delivery.
- Planning research incorporated the applicable parts of the design-taste-frontend skill, shadcn Typeset, Transitions.dev, beUI, and public reference patterns. The task uses four text layers: display title (usually 1–2 lines), main quote (1–3 semantic lines), short metadata (single line when space allows), and natural-flow body text. React, Tailwind, external fonts, mobile rules, and copied reference code are excluded because they conflict with the repository constraints.
- The user approved presentation-only punctuation normalization for the homepage quote hero: decorative Chinese commas and full stops may be omitted in the large display and sentence boundaries become visual lines; source Markdown, generated data, `/notes.html`, English source, search text, and accessible full quote retain original punctuation. Quote decorations must use explicit paired `“` and `”`, not a rotated opening glyph.
- The plan records that the current six-test suite includes one historical `390×844` image-viewer regression; typography tests will use only `1920×1080`, `1440×900`, and `1024×900`. The quote checks cover all nine records, the longest quote, rapid final-state switching, reduced motion, actual CSS viewport/DPR/font metrics, and ID-keyed display mappings rather than a global punctuation sanitizer.

## Systematic typography implementation

- `index.html` now uses shared desktop title rules and semantic `.title-line` groups for the rules, portal, timeline, people, history, motifs, and ending modules. The quote display uses stable-ID punctuation mappings, explicit `“`/`”` decorations, one accessible Chinese version, and cancellable quote transitions so rapid selection cannot leave mixed metadata.
- `notes.html` now uses the same hero title grouping and a controlled generated heading grouping that keeps parenthetical title segments together without changing source text, heading IDs, or Rail TOC text. The title and column rules were checked at the formal desktop viewports rather than by adding mobile design.
- User clarified that 1920×1080 is the standard desktop composition. Quote line groups are therefore fixed from the 1920 baseline: 1440×900 and 1024×900 may reduce columns or type size, but must not collapse a quote into a different line grouping merely because it happens to fit. The regression now compares all nine quote line-group arrays across all three desktop viewports; the result is identical.
- The added Playwright typography regression measures real `Range.getClientRects()` line boxes, title/container overflow, chapter heading lines, paired quote-mark geometry, all 9 quote records, rapid switching, and reduced motion. It records CSS viewport, DPR, declared font stack, loaded font status, and explicitly notes that CSSOM cannot expose the actual rendered font.
- Validation passed: `npm run build` (10 chapters / 44 people / 14 timeline nodes / 12 motifs / 80 images plus deploy-boundary verification), `npm test` 7/7, inline and standalone JavaScript syntax checks, and `git diff --check`. Final screenshots were reviewed at 1920×1080, 1440×900, and 1024×900 for both routes; no source Markdown, generated archive, images, or deployment configuration changed.
- Follow-up after `e276d4e`: quote-02 now groups “一个不抽时间陪伴家人的男人 / 永远算不上真正的男人”, and quote-06 groups “当我以为我已经抽身了 / 他们又把我硬生生拽了回去！”; the desktop regression asserts these stable-ID line groups across 1920/1440/1024. Dedicated quote-02/quote-06 main-display screenshots cover all three desktop viewports; the final quote-index label patch was additionally rechecked at 1024, and the full 7-test suite passed. `bb5711a` also contains the pre-existing Cloudflare post-deployment journal record; it did not change deployment configuration or publish assets.
- Final quote-mark correction: the real paired `“`/`”` decorations now live in a separate `.quote-main` grid with the Chinese `#quoteText`; both marks use equal width and vertical-center alignment to the main quote, while translation, source, explanation, and controls remain in `.quote-details`. For each of all nine quote records at 1920/1440/1024, the regression waits for quote-transition completion and checks left/right insets plus both mark centers against the main quote center. Single-line quote-01 and two-line quote-06 screenshots at all three viewports show the marks on the same horizontal axis.
- User confirmed the local visual result. Final `npm test` passed 7/7; typography spec commit `af92270` and task archive commit `3a3d492` landed. No remote push or deployment occurred; the repository still contains pre-existing untracked Trellis scaffold files that were intentionally excluded.

## Auxiliary text typography task

- User requested larger text in the `/notes.html` top bar and Rail TOC, then approved applying the same auxiliary-text review to `/`. The new task is `.trellis/tasks/10-14-typography-support-text/`; mobile design and acceptance remain out of scope.
- Baseline review in Linux/Chromium with DPR 1 and `document.fonts.status === "loaded"` found notes top-bar/TOC support text around `9.3–10.9px` and homepage peers around `9.3–11.8px`; body copy was already `16px` and was not globally scaled.
- `index.html` and `notes.html` now use desktop-only role variables for navigation, TOC, actions, metadata, micro labels, and support copy. The notes header has matched vertical space and TOC links have larger line height/padding; homepage peer selectors use the same semantic roles. No mobile media rule, content source, generated data, image, interaction, or deployment file changed.
- Added desktop Playwright checks measure computed font roles, ensure notes header regions do not overlap, verify the TOC last link is reachable after scrolling, and retain the existing title, quote, interaction, and no-overflow checks. The first run exposed a higher-specificity roster-card rule and a low preferred nav value; both were fixed at the source selector/variable, not by weakening assertions.
- Validation passed: `npm run build` (10 chapters / 44 people / 14 timeline nodes / 12 motifs / 80 images and deploy-boundary verification), `npm test` 7/7, all requested JavaScript syntax checks, `git diff --check`, and screenshots at `1920×1080`, `1440×900`, and `1024×900`. CSSOM recorded the declared font stacks and loaded state but did not claim the actual CJK font.
- Advisor closeout found that parent-only font checks could hide child overrides, that the history chapter link had been assigned the decorative micro role, and that the TOC end check needed an actual viewport position. I changed the test to inspect text-bearing elements, moved the history link into the action role, scrolled the sidebar before checking the last link, and added directory link-boundary checks.
- The final geometry pass found the active full-width TOC link's existing desktop `translateX(.2rem)` created a small horizontal scroll area. Desktop feedback now uses `translateY(-1px)` while color, border, and motion feedback remain; mobile rules are unchanged. The final 1440 evidence covers the timeline track, character spotlight, quote main display, footer, and TOC end, all with no section/page horizontal overflow.
- `implement.jsonl` and `check.jsonl` now each contain one local frontend spec reference; `task.py validate` passes. Final build, 7/7 Playwright, syntax, and diff checks pass. The initial task activation was recorded after the first implementation pass; no subagent was called and no remote push/deployment occurred.
- Final advisor pass found a real search-result grid overflow: long result content kept the middle grid track at its intrinsic width. The desktop typography block now sets `.search-result > div { min-width: 0; }`; search tests open the panel and enter “教父” at all three desktop viewports, check actual result text sizes and title/type clipping, and preserve the explicit excerpt `nowrap + ellipsis` contract.
- Final search evidence reports 9 results, shell `scrollWidth === clientWidth`, result buttons inside the shell, and no page horizontal overflow at `1920×1080`, `1440×900`, and `1024×900`; a visible `1440×900` result screenshot was reviewed. Final build, 7/7 Playwright, syntax, task-context, and diff checks pass.
- The final advisor evidence pass waits for the search shell to reach `opacity=1` and `transform=none` before geometry or screenshots. The TOC end assertion now waits for the active link's own geometry to stabilize before diagnostic scrolling, then confirms two consecutive stable samples of `scrollTop` and the last-link bounds; the stable `notes-1440-toc-end.png` and search screenshot were regenerated and visually reviewed.
- After this stabilization change, the full 7-test Playwright suite passed again, task context validation passed, and syntax/diff checks passed. The local preview remains the handoff state; no task archive, remote push, or deployment was performed.


## Session 1: 完成档案辅助文字排版任务
<!-- trellis-session: v=2 fp=62d45352e9328395 -->

**Date**: 2026-10-14
**Task**: 完成档案辅助文字排版任务
**Branch**: `master`

### Summary

用户确认本地效果无误。完成全文页顶栏、侧栏目录及首页同类辅助文字的桌面层级放大，修复搜索结果长标题撑破弹窗的问题；1920×1080、1440×900、1024×900 几何回归和 7/7 Playwright、构建、语法、任务校验、diff 检查均通过。更新 frontend quality spec，任务已归档到 .trellis/tasks/archive/2026-10/10-14-typography-support-text/；未推送远程或部署。

### Main Changes

- 提交 e677f12 完成实现，324b292 固化辅助文字几何验收约定。

### Git Commits

| Hash | Message |
|------|---------|
| `ca5738f` | 放大档案辅助文字层级 |
| `7761142` | 完善辅助文字排版验收 |
| `a921802` | 补齐辅助文字与搜索排版验收 |
| `e677f12` | 稳定辅助文字排版回归证据 |
| `324b292` | 记录辅助文字几何验收约定 |

### Testing

- [OK] npm run build、npm test 7/7、JavaScript 语法检查、task.py validate 和 git diff --check 均通过。

### Status

[OK] **Completed**

### Next Steps

- 如需后续改动，创建新的 Trellis 任务；当前仅保留本地预览状态。

## 2026-10-14 · 全文角色名称标注与人物卡跳转

- 任务 `10-14-note-character-links` 已按批准方案实施：构建器为 44 条人物记录生成受控 `mentions`/`mentionExclusions` 映射，全文页对明确可唯一归属名称生成 `.person-mention` 控件；泛称、英文词边界、链接/代码节点和 `person-43` 历史同名语境不会误标。
- 角色名称点击后进入原生确认弹窗；取消、遮罩、Escape、Tab、Enter/Space、焦点恢复、滚动锁、`inert`、立即重开和 `prefers-reduced-motion` 均有回归。确认后进入首页，目标人物卡在初始化、hash 定位和 reveal/几何稳定后打开，保留其他 query 并消费 `person` 参数。
- 确认跳转前把当前 hash/滚动位置写入历史条目的临时 `history.state`，普通返回和真实 BFCache `pageshow.persisted=true` 均等待滚动稳定后恢复并清理弹窗状态；不使用持久化存储。
- 验证：生产构建、内容构建、发布白名单、脚本和两页内联脚本语法、`git diff --check` 通过；Playwright 11/11 通过。1920×1080、1440×900、1024×900 均为 DPR 1、字体 loaded、237 个标注、无横向溢出和页面/控制台错误；三种视口均重新查看了非空弹窗/人物卡截图，390px 仅作为既有历史回归。
- BFCache 测试使用 Chromium 新 headless 模式移除默认禁用参数，不再启动可见黑屏窗口。当前实现尚未推送远程；Cloudflare 仍由 GitHub `main` 的 Workers Builds 自动部署，不执行手动 Wrangler 发布。

## 2026-10-14 · 角色跳转返回锚点与最终回归修正

- 按 advisor 复核修正 `notes.html`：返回恢复绑定真实正文锚点的 viewport 顶部位置，等待字体、前置图片和 reveal 稳定；hash 改变、用户交互和页面离开会取消恢复；没有临时返回 state 时不再误取消普通 hash/search 高亮。
- `tests/desktop-smoke.spec.js` 的普通返回和真实 BFCache 返回均先滚动到非 hash 起点的正文位置，分别确认 `pageshow.persisted=false/true`、弹窗/inert/滚动锁清理、固定顶栏遮挡和 viewport 锚点恢复；搜索高亮由测试侧 MutationObserver 记录实际出现，避免 1.7 秒过渡造成假失败。
- 在 1920×1080、1440×900、1024×900 无界面 Chromium 下重新检查 237 个标注、稳定确认弹窗和人物卡截图；DPR 1、字体 loaded、无页面/控制台/请求错误。完整 Playwright 11/11 通过，未启动可见浏览器，也未推送远程。
- 按最终复审进一步收紧恢复：只缓存锚点之前没有稳定尺寸预留、实际可能改变高度的待加载图片；三张全文海报按 `800×1136`、`800×1140`、`800×1199` 真实比例预留，屏外 lazy 图片保持未加载也不会阻塞。稳定完成要求字体、reveal 最终态、几何和缓存图片集合均就绪，4 秒期限只停止并清理未收敛 state。测试记录 `pageshow → state 消费` 耗时与终止几何，增加普通返回中用全新 `<img>` 节点挂起真实海报响应的独立反例：释放并确认 `fulfill()`、`complete`、`currentSrc`、`800×1136` 固有尺寸和 `decode()` 后，再以连续稳定几何比较同一 viewport 锚点；先确认 state 已消费，再检查连续稳定 viewport 锚点，并验证 hash 改变后旧恢复不再覆盖滚动；普通返回与真实 BFCache 定向回归均通过。最终完整 Playwright 为 12/12，相关提交为 `4880331`、`65be817`，未推送远程。

## 2026-10-15 · 强化角色标注、同页人物卡与图片关闭

- 用户确认采用点击即开卡：全文 `.person-mention` 不再经过确认弹窗或首页跳转，直接在 `notes.html` 打开由 `archive.people` 驱动的人物详情；关闭、遮罩、Escape、Tab 和键盘激活均恢复原阅读锚点与触发焦点，URL/hash/history 不变。新增 `assets/js/person-reader.js` 复用首页与全文页的人物正文清理逻辑。
- 受控映射完成全量上下文审计：新增并验证维托、老维托、索洛佐、麦克、汤姆、凯、康妮等简称及其他人物常用名；保护麦克拉斯基、汤姆逊、凯恩斯齐格、吕凯西、帕特里克，排除罗科的圣罗科语境、卡洛和莉乔的歧义块，并保留 person-27 共享卡与 person-43 历史同名排除。
- `.person-mention` 默认态使用角色强调色、2px 底线/下划线和浅暖底，焦点使用高对比 ring；图片查看器关闭不再等待 280ms，下一帧清理 dialog、body 锁和 closing 状态，异步全屏退出由序列号保护，嵌套 Escape 不穿透人物层。
- 验证：`npm run build:content`、`npm run build`、`npm run verify:deploy`、脚本语法检查、`git diff --check`、Trellis 校验和完整 Playwright 10/10 通过；同页人物卡专项回归在正式 `1920×1080`、`1440×900`、`1024×900` 视口均通过，DPR 1、字体 loaded、无页面/控制台/请求错误。未推送远程。

## 2026-10-15 · 顾问复审后的全量简称与竞态收口

- 顾问要求不只补截图中的名称。我重新扫描 44 条人物的正文上下文，加入唯一归属的 `本纳瑟拉`、`吕凯西`、`罗斯`、`欧拉`、`吉尔里` 等，并审查 `布拉西`、`芳丹`、`格林`、`吉尔代`；组织/家族语境中的 `巴西尼`、`塔塔基利亚`、`斯特拉奇`、`库尼奥` 继续排除，`罗萨托兄弟` 不会被 `罗斯` 误包裹。
- 连续 `strong`/`em` 文本只用于保护词检测，替换仍限于原始文本节点；移除无证据的 pointerdown 位置补偿。人物详情在正常和 reduced-motion 下都验证了关闭帧内切换另一人物、URL/history 不变、inert/滚动锁和焦点最终恢复。
- 图片查看器覆盖延迟及拒绝 `exitFullscreen()`、关闭后立即重开和焦点恢复；完整 Playwright 10/10、`npm run build`、`npm run verify:deploy`、语法、Trellis 校验和三种正式桌面视口专项回归均通过。追加提交为 `c37e2f3`，未推送远程。

## 2026-10-15 · 最终证据补强

- 按最终顾问复审，将正常/减弱动效的人物详情竞态测试收紧为同一次浏览器 `evaluate`：同步触发 Escape，确认旧层 `is-closing && !hidden`，立即点击第二个人物，再检查新标题、正文、inert、滚动锁和最终焦点；另用隔离正文 fixture 真实验证 `布拉西`、`芳丹`、`本纳瑟拉`、`格林`、`吉尔代` 的按钮文本与 `data-person` 目标。
- 采集并检查 `1920×1080`、`1440×900`、`1024×900` 的稳定证据：无弹窗标注截图、完整人物详情截图，以及嵌套图片关闭后人物层仍保持打开的截图；等待字体、reveal、详情过渡和图片层最终态，三视口均无页面错误、失败请求或布局溢出。
- 最终完整 Playwright 10/10、内容/生产构建、发布边界、语法、Trellis 校验和差异检查通过；追加测试提交为 `4d0ffbc`，保留 `c37e2f3`、`b5ec2a8`，未推送远程。

## 2026-10-15 · 最终顾问验收闭环

- 将人物详情竞态的第二触发器收紧为同一正文块的“麦克”；正常与 reduced-motion 分别使用同段 `维托/麦克` 和 fixture `Don Vito/麦克`，都在同一个 `evaluate` 中确认旧层 `is-closing && !hidden`，立即打开新人物，等待新层 `is-open`、面板 opacity/transform、关闭按钮焦点和完整新正文，再关闭并核对 `aria-hidden`、inert、滚动锁和触发焦点。提交为 `d4a3017`、`802df90`。
- 证据脚本在 `1920×1080`、`1440×900`、`1024×900` 分别记录实际 viewport、DPR 1、`document.fonts.status=loaded`、无横向溢出、无 console/page/request 错误；等待正文 reveal 和人物详情 opacity/transform 稳定后重新生成并人工检查标注、完整人物详情、嵌套图片关闭后三组截图。
- 角色专项与最终完整 `npm test` 均为 10/10；此前一次搜索高亮观察失败经单项重跑和完整重跑通过，未修改搜索实现或放宽断言。`node --check tests/desktop-smoke.spec.js` 与 `git diff --check` 通过。

## 2026-10-16 · 暖纸与暗书房视觉主题重设计

- 用户选择 A「暖纸与暗书房」：首页开场、主引文和结尾使用有限暗色叙事区；规则、时间轴、人物、史实、符号与 `/notes.html` 以暖纸作为主要阅读面。未新增图片、字体、依赖、主题开关或移动端交付。
- 新增 `assets/css/archive-theme.css` 作为两页共享语义 token；修改 `index.html`、`notes.html`、`assets/css/image-viewer.css`，保留标题/引文行组、图片比例、既有 JavaScript 生命周期、URL/history 和所有交互契约。
- 更新 `docs/design-v2.md`、`.trellis/spec/frontend/index.md` 与 `quality-guidelines.md`，固化明暗表面/前景配对、实际合成背景对比度和稳定截图要求。
- `tests/desktop-smoke.spec.js` 新增三种正式桌面视口的 token、实际背景、对比度、字体、DPR 和横向溢出检查；稳定主题证据截图保存在 `.tmp/`，已检查首页开场/规则/时间轴/暗引文/人物/史实/符号/结尾、全文和深色图片查看器。
- 验证：`npm test` 11/11、`npm run build`、`npm run verify:deploy`、`node --check scripts/build-content.cjs`、`node --check assets/js/image-viewer.js`、`node --check tests/desktop-smoke.spec.js`、`git diff --check`、Trellis 校验均通过。未推送、未部署；预存 scaffold 与 `.tmp/` 未纳入任务提交。
- 顾问复审后将主题 token 与模块声明合回两页原有样式区，删除重复的末尾覆盖块；对比度脚本沿祖先 surface 合成透明背景，避免把透明元素直接当作纸色。修正后主题专项 1/1、完整 Playwright 11/11 和三视口稳定主题证据截图均通过。
- 最终收尾补强将人物筛选激活态改为琥珀底/墨褐字并通过实际 `4.5:1` 对比度断言，人物卡照片明确使用 `filter:none` 保留原色；顾问要求后，主题证据脚本用原生 `scrollIntoView` 逐项经过目标内 reveal 元素，再返回调整后的稳定取景位置，对所有相交目标/祖先检查最终态和连续几何，并显式等待图片查看器 opacity/identity transform 稳定。人物工具栏的可见稳定态由主题专项回归验证；1920/1440/1024 三视口共 33 张证据（首页 24、全文 6、viewer 3）重新采集并逐张读取；最终完整 `npm test` 为 11/11。结构收尾提交为 `e0d183b`，测试/记录提交为 `d2c29f1`，最终证据提交为 `899c40d`，未推送或部署。

## 2026-10-16 · 暗幕与红线视觉冲击力实现

- 按用户批准的融合方向实现桌面视觉：首屏将 `godfather1.jpg` 放入中央主位，II/III 作为自然比例的错位次级海报；不改图片、viewer 点击区域、内容数据或 URL。1920/1440/1024 均检查了海报比例、主次 z-index、CTA 可达性和页面溢出。
- 将 `.timeline-section` 设为暗色权力切场，并显式修正详情按钮的暗面前景/背景；规则、人物、史实、符号保留暖纸阅读面。人物焦点卡使用 5/3/2/2 不等宽地图布局，1024px 改为 7/5、5/7 两行，避免窄卡把正文压成逐字换行；全文页只强化暗色 hero 和内边距，不复制首页舞台构图。
- `tests/desktop-smoke.spec.js` 增加三视口海报自然比例、中央主海报位置/z-index、暗时间轴 surface/按钮配对、人物焦点不等宽和全文 hero surface 断言。主题专项 1/1，完整 `npm test` 11/11；语法检查、`npm run verify:deploy`、Trellis 校验、`git diff --check` 均通过，`npm run build` 待本轮记录更新后作为末尾命令执行。
- 当前实现提交前等待用户检查稳定截图；未推送、未部署，预存 scaffold、错误的 `10-17` 草稿目录和 `.tmp/` 不纳入任务提交。

## 2026-10-16 · 重新规划电影感与视觉冲击力

- 用户反馈上一版暖纸与暗书房“太平淡、视觉冲击力不够”。基线审计确认问题在构图和叙事节奏：首屏左侧大标题与右侧等量三联海报关系规整，规则/人物/史实/符号模块重量接近，暗色尚未形成权力转折。
- 用户选择融合方案：A「暗幕与红线」定气氛，B「三联海报主导」定首屏，C「家族权力地图」定内容结构。暖纸继续承担主要阅读面，暗色只用于开场、权力/引文停顿和结尾；红线只表达章节/焦点/选中，不绘制虚假关系线。
- 研究记录已写入 `.trellis/tasks/10-16-godfather-visual-impact/research/visual-impact.md`：Gordon Willis 的 brown-and-black、blue-black 与地点质感差异；编辑式暗色的多层近黑、非对称网格、大比例摄影、极大标题和克制酒红；Transitions.dev 的 panel reveal 与 reduced-motion 模式。LOC 页面受限，仅保留馆藏元数据边界，不冒充海报色彩审阅。
- 已完成 `prd.md`、`design.md`、`implement.md`、`implement.jsonl`、`check.jsonl`；Trellis 校验通过。进一步明确 `godfather1.jpg` 为主海报、`.timeline-section` 为暗色权力段，搜索/人物详情/viewer 只做回归。
- 在 `research/visual-draft-home.svg` 与 `visual-draft-rhythm.svg` 生成并渲染了两张非产品构图草案，展示 A 暗幕与红线、B 三联海报主导、C 家族权力地图的融合关系。产品代码尚未修改，真实任务仍等待最终规划批准和 `task.py start`。

## 2026-10-16 · 暗幕与红线收尾证据

- 顾问收尾要求已落实：`.timeline-section .section-kicker` 使用暗面专用前景，避免普通酒红在近黑背景上失去对比度；`implement.jsonl`/`check.jsonl` 的研究路径统一为真实 `10-16` 任务，错误的 `10-17` 草稿目录保持未跟踪且未删除。
- 主题回归新增真实坐标证据：1920/1440/1024 三种桌面视口均逐张命中 I/II/III 海报的实际 `<img>`，打开 viewer 后同时核对命中图片的 `currentSrc` 与 viewer 的 `src` 属性，检查主海报相对两张次海报的实际变换面积与中央位置、两个 CTA 不遮挡、时间轴 kicker/按钮对比度和全文 hero 暗面。
- 主题证据脚本已同时采集 normal 与 reduced-motion；normal 模式不禁用动画，先用原生滚动逐项经过 reveal 目标并等待有限动画稳定。人物证据改为与验证范围一致的局部裁剪：工具栏、四张焦点卡和名册首行，三种正式视口均已复读，无大面积空白，不把局部图冒称完整 viewport。最终完整 `npm test` 为 11/11，专项为 1/1；用户视觉确认前任务不归档、不推送、不部署。

## 2026-10-18 · 修正人物与符号卡片几何

- 用户指出人物焦点卡和符号卡的方框大小不一致。已将正式桌面人物焦点区改为四等宽等高卡片，`1024px` 改为二乘二等宽等高卡片；符号区改为三等宽卡片，保留各行自然高度和完整正文。
- 三种正式视口测量确认页面无横向溢出；人物卡宽高一致，符号卡同一行宽高一致。主题专项回归通过，后续需执行完整回归、构建和任务校验。
