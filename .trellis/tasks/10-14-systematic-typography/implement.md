# Implementation Plan: 系统化修复档案文字排版

## Ordered Work

1. 以当前提交和工作区为基线，记录 `/` 与 `/notes.html` 在 1920×1080、1440×900、1024×900 的实际 CSS `innerWidth`/`innerHeight`、DPR、声明的 `font-family`、`document.fonts` 状态、可确认的实际字体、字号、标题行盒、列宽、说明文字行宽和无溢出状态；无法确认实际字体时如实标注，不修改内容源，不启动新增移动端视口。
2. 在 `index.html` 和 `notes.html` 将主要显示标题的设计断点整理为语义行组，覆盖规则、时间轴、全文入口、人物、史实、符号、结尾和全文页首屏；同时整理引文主显示为显式成对开闭引号和 1–3 行展示组，并确保展示映射与完整中文原文只向辅助技术暴露一个版本；保留全部文案、kicker、统计和稳定链接。
3. 在两页现有内嵌 CSS 中建立共享的显示标题/引文/说明/正文排版层级，修正 `.section-header`、`.timeline-head`、`.notes-portal-card`、`.notes-hero` 的可收缩列宽、内边距、显示字号、行高和窄桌面降级；不得用全局 `nowrap` 或固定高度掩盖溢出。
4. 对全文页正文、章节标题、目录、列表、表格和首页动态标题做一次边界审查，只修复排版回归直接证明的行宽或裁切问题；引文只在主显示组件内按稳定引文 ID做明确的展示层标点映射，源 Markdown、生成数据和全文正文保持不变，不用通用删标点函数。
5. 在 `tests/desktop-smoke.spec.js` 增加排版回归：等待字体和 reveal 稳定，使用文本 `Range.getClientRects()` 验证主要语义行组的实际行盒、标题/说明容器无横向溢出、页面无水平滚动，并在 1920/1440/1024 桌面视口执行；以 1920 为引文基准，比较三个视口的稳定行组数组；同时覆盖全部 9 条引文和最长文本，验证真实开闭引号、完整中英文/来源/解读、快速切换后的最终状态与 reduced-motion；不增加移动端排版测试。
6. 执行验证：
   - `npm run build`
   - `npm test`
   - `node --check scripts/build-content.cjs`
   - `node --check assets/js/image-viewer.js`
   - `node --check tests/desktop-smoke.spec.js`
   - `git diff --check`
7. 复核 1920×1080 与 1440×900 首页/全文页截图，补做 1024×900 桌面边界检查；确认文本完整、图片和业务交互未被改动。
8. 检查 diff 范围，只提交本任务的页面、测试、必要产品设计记录、任务文档和 journal；不纳入 `.agents/`、`.pi/`、其他 Trellis scaffold、凭据或 Cloudflare 部署配置。
9. 实施完成后先做 Trellis quality check 和 advisor 最终审阅，再提交并归档任务；未获实施批准前不执行步骤 2 以后。

## Validation Matrix

| Area | Observable check |
|---|---|
| Display titles | 首页/全文页主要标题按语义行组显示，无孤立单字、裁切或容器溢出 |
| Quote display | 引文使用真实成对开闭引号，主显示 1–3 行且标点映射只发生在展示层，完整原文保持不变 |
| Layout | 1920/1440 保留桌面构图；1024 可读且不溢出；移动端不在验收范围 |
| Copy measure | 说明、正文、列表、表格使用合适行宽，不因排版删除或改写原文 |
| Runtime | 现有 6 项 Playwright 行为回归（含 1 项历史 390×844 图片查看器检查）无退化，新增排版检查只覆盖桌面，页面无 console/page/HTTP 错误 |
| Accessibility | 标题、链接、按钮语义和焦点路径保持不变，reduced-motion 仍有效 |
| Scope | 不改 content、生成器、图片、archive.js、Cloudflare 配置或远程仓库 |

## Review Gates

- 不通过全局 `white-space: nowrap`、`word-break: keep-all`、固定高度、隐藏文字、省略号或过度缩小字号掩盖排版问题；1–2 行标题和 1–3 行引文只是目标，不是删文硬约束。
- 不通过全局规则删除标点；引文展示映射必须局部、可审计，并保留语义原文。
- 不新增移动端布局、移动端视觉调整、移动端截图或移动端验收；现有套件中的历史 `390×844` 回归按既有契约保留，不改造成排版验收。
- 不为了让截图对齐删除原文、统计、目录、列表或表格内容。
- 不改变 `/`、`/notes.html`、稳定 hash、搜索目标和动态交互契约。
- 不调用或委派 Trellis subagent；由当前主会话完成规划和实施。

## Rollback Points

- 标题标记阶段：恢复页面中语义行组改动，CSS 和交互不变。
- CSS 阶段：按共享层级块回退，保留已确认无关的内容与结构调整。
- 测试阶段：只回退新增排版断言，不弱化现有行为回归。
- 提交前：使用 scoped `git add` 和 `git diff --check` 阻止无关 scaffold、凭据或部署文件进入提交。
