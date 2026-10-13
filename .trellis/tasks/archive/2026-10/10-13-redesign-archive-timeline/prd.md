# 重做档案模块与时间轴

## Goal

在保留原笔记全部内容和现有档案探索方向的前提下，重设计规则区、全文入口、史实区，并把时间轴改成真正连续的可导航轨道，解决截图中明显的空白、层级、错位和断线问题。

## In Scope

- 重做 `#rules`、`#notes-portal`、`#history` 的结构与视觉层级。
- 将 `#timeline` 改为单一连续轨道，优化节点摘要、详情面板和导航交互。
- 更新首页搜索、键盘操作、动画状态和 Playwright 回归覆盖。

## Out of Scope

- 不修改原 Markdown 的内容语义，不删除原文段落、人物、事件或图片引用。
- 不重做 `/notes.html` 的全文阅读布局，不更换整体主题，不引入新的前端框架或依赖。
- 不为史实模块新增图片，不借用未语义映射的剧照作为装饰。
- 本轮以桌面端视觉和交互为唯一设计目标；不新增移动端功能或进行移动端视觉开发。

## Confirmed Problems

- 规则区位于 `index.html` 的 `#rules` / `#ruleGrid`：三张规则卡内容密度和高度差异很大，标题、正文和卡框的视觉起点不统一；完整正文需要保留，但当前三列同时展开的呈现不利于阅读。
- 全文入口位于 `#notes-portal`：大标题、统计和行动按钮的关系弱，容器留下大面积空白，入口不像一个清晰的档案门户。
- 史实区位于 `#history` / `#historyGrid`：两张纯文字史实卡缺少证据层级，卡片仍显得像空容器；本模块必须继续无图，不得重新塞入与段落无关的图片。
- 时间轴位于 `#timeline` / `#timelineItems`：14 个节点使用七列网格后自动换成两行，但连接线只在第一行上方，第二行节点没有连续连接；事件标题和正文重复，文字排版拥挤。

## Design Constraints

- `content/godfather-trilogy-notes-v4.md` 仍是唯一内容源；不得删减、改写或手工复制原文来适应新布局。
- `assets/data/archive.js` 继续由 `npm run build:content` 生成，不手工编辑。
- 保留原生 HTML/CSS/JavaScript、Lucide 图标、家庭—权力浅色档案视觉，不引入 React、TypeScript、新 UI 框架或新运行时依赖。
- 保留现有搜索、稳定 ID、弹窗、全文链接和 `prefers-reduced-motion` 约束。
- 参考 Transitions.dev 的 card resize / panel reveal、Rare UI 的 Step Player / Rail TOC、shadcn/ui 的 Tabs / Accordion 状态边界，只提炼交互模式，不复制代码或引入其运行时。
- 普通模式的状态变化要有进入、激活、退出反馈；本任务只验收桌面端，既有窄屏检查不扩展为移动端设计。

## Confirmed UX Decision

规则区采用三个紧凑规则选择器 + 一个共享的完整内容面板：一次展示一条规则，切换时使用 panel reveal / FLIP 过渡；三条原文全部保留在生成数据中，切换到对应规则时完整进入可访问 DOM。这样消除三列不等高和大面积空白，代价是用户需要点击或键盘切换规则。

## Acceptance Criteria

- [x] 规则区采用用户确认的呈现方案；三条规则内容完整可达，切换有动画、键盘状态和 reduced-motion 回退。
- [x] 全文入口重建为明确的档案门户，标题、统计、说明和按钮层级清楚，桌面端无异常大空白或溢出。
- [x] 史实区保持无图，改为有编号、证据标签、标题和正文层级的纯文字档案卡；两卡不依赖固定高度制造空白。
- [x] 时间轴 14 个节点位于同一连续轨道/滚动坐标系，第一项到最后一项连接线连续可见，不因换行断开。
- [x] 时间轴导航摘要与完整事件正文分离；点击节点、键盘操作和首页搜索都能正确激活节点并更新详情面板。
- [x] 搜索、稳定链接、弹窗、全文入口和原文内容回归不受影响。
- [x] 新增回归覆盖：规则切换与完整内容、史实无图、时间轴首尾节点/连接几何、搜索激活、动画状态和 reduced-motion。
- [x] `npm run build:content`、`npm test`、语法检查和 `git diff --check` 通过；以桌面视觉截图复核为本轮交付依据。现有 390px 回归只作为既有功能不回归的附带检查，不作为移动端验收。

## References

- `docs/design-v2.md`
- `index.html`：`#ruleGrid`、`#notes-portal`、`#historyGrid`、`#timelineItems`
- `tests/desktop-smoke.spec.js`
- `scripts/build-content.cjs`
