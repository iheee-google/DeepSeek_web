# Design: 档案模块与时间轴重设计

## Boundary

本任务只改首页档案探索体验及其浏览器回归，不改原始 Markdown、全文页的信息结构或图片文件。实现继续使用 `index.html` 中的原生 DOM/CSS/JavaScript、`assets/data/archive.js` 的生成数据和现有本地 Lucide。

## Module Design

### 1. 规则共享面板

保留 `#ruleGrid` 作为搜索和测试锚点，但把它从三张同时展开的长卡改为：

- 三个紧凑选择器，使用 `role="tab"`、`aria-selected`、`aria-controls` 和稳定规则 ID。
- 一个共享 `tabpanel`，展示当前规则的完整 `rule.html`；切换时只改变面板内容，不删减原文。所有规则正文保留在生成数据中，当前规则切换后完整进入可访问 DOM。
- `selectRule(ruleId, options)` 作为唯一切换入口，供点击、方向键和搜索结果复用。
- 选择器支持 `ArrowLeft/ArrowRight`、`Home`、`End`，切换后焦点仍可预测。
- 面板用高度测量、opacity/translate 和短暂的内容替换状态实现 panel reveal；`prefers-reduced-motion` 下取消过渡并立即展示。
- 原有规则源块 ID 继续出现在面板内容中，全文跳转和搜索目标不改变。

这借鉴 shadcn Tabs 的“选择器 + 单一面板”边界和 Transitions.dev 的 panel reveal 思路，但不引入 React 或第三方运行时。

### 2. 全文档案门户

保留 `#notes-portal`、`#portalImageCount` 等既有数据锚点，重排为明确的入口层级：

- 左侧为“完整原文”标题、短说明和主入口按钮。
- 右侧为章节、人物、影像统计和一条档案元信息带。
- 删除无法表达信息的固定空高度；容器高度由内容和响应式网格决定。
- CTA、统计块和入口 hover/focus 共享同一组 enter/active/exit 动效。
- 维持 `notes.html` 直接入口和现有搜索/章节链接。

### 3. 史实档案卡

`#historyGrid` 继续渲染两条 `archive.history`，但每条采用自动高度的纯文字证据卡：

- 编号、`FACT CHECKING` 标签、标题、证据列表和结论边界分层排版。
- 不渲染 `cover`，不增加图片兜底；现有 `archive.history` 数据中的正文完整保留。
- 卡片使用实际 gap 和自然高度，不用相邻卡片的最大高度制造空白。
- 桌面两列，窄屏单列；每张卡均可作为明确的视觉单元，文本从标题下方对齐开始。

### 4. 连续时间轴

保留 `#timelineItems`、`#timelineFocus` 和每个 `timeline-XX` ID，但调整坐标系：

- 外层 `.timeline-scroll` 负责横向滚动；内部 `.timeline-track` 同时包含连接线和全部 14 个节点。
- 节点使用单行 `grid-auto-flow: column` / 固定最小列宽，禁止自动换成第二行。
- 连接线伪元素或独立元素位于同一个 track 的节点中心线，起点和终点覆盖第一至最后一个节点；滚动时与节点一起移动。
- 节点只显示序号、时代、作品和短摘要，不重复渲染完整 `event`；完整事件放在下方 focus panel。
- 生成器增加由事件文本派生的短 `label`，只作为导航摘要；`event` 原文仍是唯一完整描述。
- 点击节点、键盘 Enter/Space、首页搜索结果都调用统一的 `selectTimeline(id)`，更新 active 状态和 `#timelineFocus`。
- 首尾节点都可聚焦、可点击、可滚动到可视区域；当前节点状态与动画不依赖 window scroll listener。

## Data Flow

```text
content/godfather-trilogy-notes-v4.md
        │
        ▼ npm run build:content
scripts/build-content.cjs
        │
        ▼
assets/data/archive.js
  ├─ rules.html / blocks       → shared rule panel
  ├─ history.html              → image-free evidence cards
  └─ timeline.event + label    → continuous track + focus panel
        │
        ▼
index.html render/select/search functions
        │
        ▼
Playwright geometry, keyboard, visibility, and diagnostics checks
```

## Compatibility and Accessibility

- Preserve all existing stable IDs needed by search, source links, and tests.
- Use native `button`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, and visible focus styles.
- Do not make a decorative card image or empty region the only activation target.
- Search must activate the correct rule or timeline node before scrolling/focusing it.
- Keep existing dialog/image-viewer behavior unchanged except for shared CSS interactions if selectors overlap.
- Motion is enabled in normal mode, has explicit active/exit states, and is disabled or made immediate under `prefers-reduced-motion`.

## Risks and Trade-offs

- Shared rule panel reduces simultaneous scanning; the trade-off is one extra tab interaction. Full prose remains accessible and searchable.
- The single horizontal timeline keeps the existing narrow-screen overflow guard, but narrow-screen visual design is outside this task. No mobile feature or mobile acceptance claim is added.
- Adding `timeline.label` changes generated data shape but is backward-compatible because consumers still receive the original `event` field.

## Rollback

Revert the task commit. The source Markdown and image assets remain untouched, and regenerated `assets/data/archive.js` can be recreated with `npm run build:content`.
