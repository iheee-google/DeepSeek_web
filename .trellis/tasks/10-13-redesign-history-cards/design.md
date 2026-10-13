# Design: 史实对照全宽证据带

## Boundary

本任务只重设计首页 `#history` 模块及其桌面回归，不改变原始 Markdown、生成数据结构、`notes.html`、图片文件或其他首页模块。继续使用原生 HTML/CSS/JavaScript 和本地 Lucide。

## Information Architecture

### Section header

- 保留 `#history`、第九章全文链接和现有稳定定位。
- 将当前占据较大高度的标题/说明区域压缩为紧凑的导览头：标签、标题和一句说明形成明确的阅读入口，减少标题与卡片之间的空场。
- 不把“事实核查”写成脚注；第九章链接仍然可见并可键盘访问。

### Evidence rows

`#historyGrid` 从双列网格改为垂直证据列表，仍渲染两个 `archive.history` 记录：

- 每条记录保留 `id="history-01/02"`、`data-reveal`、原始标题和完整 `item.html`。
- 左侧为固定但紧凑的元信息栏：编号、`FACT CHECKING`、标题和简短类型标记。
- 右侧为正文栏，设置受控最大行宽，防止完整屏幕宽度造成过长行；正文中的列表、段落和强调保持原 Markdown 生成结构。
- 两条记录按自然内容高度独立结束，记录之间使用明确的间距和分隔线；不设置统一高度、不用空段落填充、不增加内部滚动。
- 保留正文中所有四条/三条证据，不把正文改写成摘要，也不渲染图片。

## Motion and Accessibility

- 记录进入时使用现有 `data-reveal`/`is-visible` 生命周期；悬停和键盘焦点使用边框、背景和轻微颜色反馈，不用位移破坏阅读基线。
- `prefers-reduced-motion: reduce` 下立即显示，不隐藏任何正文。
- 标题、链接、正文使用现有语义元素；全文链接仍然是 `<a>`，不把整张证据带伪装成按钮。
- 任何新增结构不复制正文 ID，稳定来源 block ID 继续只由生成器提供。

## Data Flow

```text
content/godfather-trilogy-notes-v4.md
        │
        ▼ npm run build:content（本任务不改数据契约）
assets/data/archive.js.history
        │
        ▼ index.html renderHistory()
#history header + #historyGrid evidence rows
        │
        ▼ existing reveal/search/source links
browser regression + desktop screenshot
```

## Compatibility

- `archive.history` 继续使用 `id/title/html/text/blocks` 现有形状，不修改 `scripts/build-content.cjs`。
- 搜索结果、稳定 hash、`notes.html#chapter-09-heading` 和正文 block ID 不变。
- 当前历史模块无图片；任务不新增图片映射或图片资源。
- 本任务只验收桌面布局和交互，不新增移动端设计；现有媒体查询只保留防止明显溢出的保护。

## Documentation Alignment

同步 `docs/design-v2.md` 中“历史勘误”描述，将“双栏证据卡”改为“上下全宽证据带”，避免产品设计说明与实际布局冲突；不复制任务计划全文。

## Rollback

回退本任务提交即可恢复历史模块原有双列布局；源 Markdown、生成数据、图片和其他页面不受影响。
