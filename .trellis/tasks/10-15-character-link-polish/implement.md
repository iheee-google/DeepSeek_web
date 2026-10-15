# Implementation Plan: 强化角色标注、补全简称映射与全文页人物卡

## Preconditions

- 任务已进入 `in_progress`；本轮实施已获得用户批准并由主会话执行。
- 项目禁止调用或委派 subagent；实施、检查和收尾由主会话完成。
- 用户已明确纠正导航：点击角色名称后留在 `notes.html`，在原页面直接打开人物介绍；不得跳首页人物大全。
- 不改原始 Markdown、图片、部署配置或预览白名单。

## Ordered checklist

1. **核对同页人物详情边界**
   - 读取 `index.html` 的 `characterData`、`readerHtml()`、`openReader()`、`closeReader()` 和人物卡数据形状。
   - 读取 `notes.html` 的确认弹窗、旧 `person` 跳转、`noteCharacterReturn`/pageshow 恢复调用方。
   - 决定是否抽取最小共享人物正文渲染 helper；确保首页现有卡片行为不变，全文页不复制人物正文。
   - 记录预期改动文件和明确不做的旧首页深链兼容范围。

2. **校准受控简称映射**
   - 在 `scripts/build-content.cjs` 中将新增简称表达为生成器规则元数据，覆盖截图中的“维托”“索洛佐”，并逐项审查“老维托”“麦克”“汤姆”“凯”“康妮”“卡洛”以及实际出现的英文短称。
   - 增加保护词/排除上下文契约，使 `麦克`、`汤姆`、`凯` 等短串不会包裹复合人名、演员名或普通词。
   - 保持 44 条标题与稳定 ID 校验、全局冲突校验、`person-27` 共享卡和 `person-43` 历史同名排除。
   - 重新生成 `assets/data/archive.js`，检查映射条目、计数和出现上下文；不手工编辑生成文件。

3. **增强全文标注视觉层**
   - 调整 `notes.html` 的 `.person-mention` 默认态，使角色色与持续下划线/底部标记同时可见；hover/active/focus-visible 和 reduced-motion 维持完整状态。
   - 不改变按钮文本、正文行高、标点、链接、稳定 ID、TreeWalker 跳过边界和重复初始化保护。
   - 将现有确认层改为直接人物详情层：点击标注即打开详情，保持页面级层的背景 inert、滚动锁和 Escape 顺序，不再创建确认步骤。

4. **实现 notes.html 同页人物详情**
   - 在 `notes.html` 增加独立的详情视图/面板结构，标题、元信息、肖像和正文由 `archive.people` 当前记录填充。
   - 点击标注只校验 `person.id` 并打开同页详情，不写 `location`、hash、query 或 history；不执行首页滚动。
   - 详情打开时记录触发按钮和阅读位置；关闭、遮罩、Escape 和 Tab 循环正确；关闭后用 `focus({ preventScroll: true })` 恢复相同正文锚点和焦点。
   - 图片通过现有 `assets/js/image-viewer.js` 装饰；详情层 Escape 与图片查看器 Escape 分层互斥。
   - 若共享渲染 helper 确实必要，先完成最小抽取，再验证 `index.html` 的人物卡/全文链接/图片行为无变化；否则保持路由内实现，避免无收益重构。

5. **修复图片查看器关闭生命周期**
   - 将 `closeViewer()` 的逻辑关闭与全屏异步清理解耦，清除固定 280ms 阻塞路径和旧 timer 竞态。
   - 关闭后立即清除 `dialog.open`、body scroll lock、模拟全屏/closing 状态并恢复触发图片焦点；`exitFullscreen()` 的拒绝或晚到事件不能重新打开/布局旧状态。
   - 覆盖快速关闭后立即打开、正常动效、reduced-motion、真实全屏和 fullscreen fallback。

6. **扩展浏览器回归**
   - notes：默认态检查“维托”“索洛佐”“桑尼”的 computed color、下划线/底纹和按钮文本。
   - mapping：验证简称目标 ID、`person-27` 双人共享、`person-43` 历史排除以及 `麦克拉斯基`、`汤姆逊`、`凯恩斯齐格`、演员名等反例。
   - fidelity：比较标注前后完整 `#noteContent.textContent`、已有链接属性、heading/block ID、图片/code/strong/em 结构和搜索文本。
   - same-page detail：点击标注后 URL/hash/history length 不变，详情标题/肖像/正文与 archive 一致；关闭后稳定阅读锚点、滚动锁、inert、焦点和重复打开状态正确。
   - nested Escape：人物详情中打开图片，第一次 Escape 只关闭图片，第二次关闭人物详情；确认背景不被同一事件穿透。
   - image viewer：关闭按钮、Escape、遮罩在下一帧检查图片层已关闭，不等待固定 sleep；检查真实全屏/模拟全屏/reduced-motion/快速重开，并确认图片层关闭不会解锁仍打开的人物层。

7. **验证与证据**
   - `npm run build:content`
   - `npm run build`
   - `node --check scripts/build-content.cjs`
   - `node --check assets/js/image-viewer.js`
   - `node --check tests/desktop-smoke.spec.js`
   - 若新增共享脚本：`node --check assets/js/person-reader.js`
   - `npm test`
   - `git diff --check`
   - 正式桌面视口 `1920×1080`、`1440×900`、`1024×900` 采集标注默认态、同页人物详情和图片关闭稳定截图；记录 CSS viewport、DPR、字体状态、页面/控制台/请求错误。
   - `npm run verify:deploy` 和必要的 Wrangler dry-run，确认发布树与预览边界未扩展。

8. **收尾**
   - 只提交本任务必要的生成器、生成 archive、notes/index（如确有共享接线）、图片查看器、测试、任务文档和 workspace journal。
   - 不纳入 `.agents/`、`.pi/`、`.tmp/`、预存 scaffold、凭据、其他任务或部署产物。
   - 运行主会话 quality check；只修复本任务范围内的语法、类型/结构和明确回归错误，不扩大为首页重设计。

## Execution record

- 已将角色短名纳入生成器受控规则：覆盖 44 条人物记录中的可审查常用名，新增“维托”“老维托”“索洛佐”“麦克”“汤姆”“凯”“康妮”“本纳瑟拉”“吕凯西”等，并审查“布拉西”“芳丹”“格林”“罗斯”“欧拉”“吉尔里”“吉尔代”等唯一语境候选；为 `麦克拉斯基`、`汤姆逊`、`凯恩斯齐格`、`帕特里克` 等重叠/反例保留保护词，组织/家族语境的“巴西尼”“塔塔基利亚”“斯特拉奇”“库尼奥”不标注；`罗科`、`卡洛`、`莉乔` 和 `person-43` 的历史语境使用块级排除。
- `notes.html` 的标注默认态改为强调色、稳定下划线和浅暖底；点击标注直接在当前全文页打开由 `archive.people` 驱动的人物详情，不改变 URL/hash/history。详情层保留焦点循环、背景 inert、滚动锁、同页滚动/焦点恢复，以及详情内图片查看器的分层 Escape。
- 新增 `assets/js/person-reader.js` 作为首页与全文页共用的人物正文清理渲染边界；首页既有人物卡仍使用原数据和交互。
- `assets/js/image-viewer.js` 的逻辑关闭已与全屏异步退出解耦：下一帧清理 dialog、滚动锁和关闭状态，序列号阻断旧回调，Escape 使用 immediate propagation 防止穿透到人物层。
- 测试已覆盖 44 人物映射、简称反例和历史排除、正文/链接/稳定 ID 保真、`布拉西`/`芳丹`/`本纳瑟拉`/`格林`/`吉尔代` 隔离正文 fixture 的真实按钮目标、三种桌面视口的同页人物详情、Tab/Escape/遮罩/关闭按钮、嵌套图片 Escape、reduced-motion 以及图片查看器下一帧关闭。
- 顾问复审后补强了连续语义文本的跨 `strong`/`em` 保护：维托里奥·杜塞、亚历克斯·罗科、文森佐·潘坦捷利、巴西尼/斯特拉奇/库尼奥的演员、兄长和家族语境均有块级或保护词回归；补充了“罗斯”与罗萨托兄弟、`本纳瑟拉`/`吕凯西` 等实际正文命中检查；移除了未经必要性证明的 pointerdown 滚动快照。人物详情竞态现在在同一个页面 evaluate 中先确认旧层 `is-closing && !hidden`，再立即触发下一人物，正常与 reduced-motion 都验证旧 RAF 不会清空新层。
- 图片查看器新增延迟 fullscreen 退出、拒绝 fullscreen 退出和关闭后立即重开回归；应用层关闭状态不等待 Promise，旧异步回调不重新打开查看器。人物详情新增正常/减弱动效下关闭帧内立即切换到另一人物的竞态回归，并验证同页 URL/history、inert、滚动锁和焦点最终状态。

## Validation matrix

| Area | Observable check |
|---|---|
| Visibility | 默认态颜色与下划线明显，hover/focus/reduced-motion 稳定 |
| Mapping | 44 人物规则完整；简称目标唯一；保护词和历史反例不误标 |
| Text fidelity | 原文字符、标点、链接、图片/code/内联节点和稳定 ID 不变 |
| Same-page detail | 点击后不改 URL/history/hash；详情数据来自 archive；关闭回原阅读位置和焦点 |
| Modal accessibility | ARIA、inert、scroll lock、Tab、Escape 分层和 reduced-motion 正确 |
| Image close | 下一帧逻辑关闭；全屏拒绝、快速重开和旧 timer 不污染新状态 |
| Regression | 现有桌面/全文/搜索/目录/图片回归继续通过，无 page/console/HTTP error |
| Scope | 不修改源文可见内容、移动端交付范围、预览白名单和部署配置 |

## Rollback points

- 简称规则：移除新增 alias/保护字段和生成元数据，保留现有完整名映射。
- 标注样式：回退 `.person-mention` 展示层 CSS，不回退正文或搜索数据。
- 同页人物详情：停用详情视图调用，保留普通正文标注；不恢复从 notes 自动跳首页，除非用户另行指定。
- 图片关闭：回退生命周期函数和 CSS 关闭状态，但保留既有图片加载、缩放和全屏功能。

## Review gates

- 不用完整 HTML 正则替换正文，不把简称规则硬编码在页面而绕过生成器。
- 不把所有短串、姓氏、演员名或泛称都标注；仅标注上下文能唯一归属人物、且不处于组织/家族语境的名称。
- 不从 `notes.html` 生成 `index.html?person=...`，不滚动到首页人物大全。
- 不复制人物介绍正文；共享 archive 数据和必要渲染逻辑必须只有一个内容来源。
- 不用固定延时证明同页详情或图片查看器关闭完成；状态检查必须基于 DOM/下一帧/事件。
- 不让图片查看器或人物详情的 Escape 穿透关闭多个层，不留下 inert/scroll lock/旧 timer。
- 不启动可见 Chromium；回归使用现有无界面 Playwright 配置。
