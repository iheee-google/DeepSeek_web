# Implementation Plan: 全文角色名称标注与跳转

## Preconditions

- 当前阶段为 planning；用户需要在本计划完成后再次明确批准，才能运行 `task.py start`。
- 项目禁止调用或委派 subagent；实施、检查和收尾由主会话完成。
- 不改原始 Markdown、图片、部署配置或预览白名单。

## Ordered checklist

1. **确认映射基线**
   - 读取当前 44 条人物标题、`person-*` ID、全文 target 和已有角色卡片选择器。
   - 建立显式人物标题/别名规则表，覆盖明确中文全名、英文名、正式别名和 `person-27` 的两位人物。
   - 在 `parsePeople()` 中校验规则与当前标题、当前 `person-*` ID 一一对应；检查英文词边界、别名重叠、禁止泛称/姓氏/演员名和同名语境反例，并把映射输出到生成数据。
   - 输出别名出现上下文供审查；跨语境无法唯一归属的名称不进入映射或明确加入排除清单。

2. **接入全文展示标注**
   - 在 `notes.html` 注入 archive HTML 后，使用文本节点遍历对允许的正文容器做最长优先、非重叠匹配。
   - 跳过现有链接、代码、图片替代文本、控件和已处理节点；保留稳定 ID、块结构、文本内容和自然换行。
   - 用原生 `button.person-mention` 输出标注，补充 hover/focus/active/reduced-motion CSS。

3. **实现确认弹窗**
   - 增加可访问的页面级 `role=dialog`、标题、说明、取消/确认按钮和遮罩。
   - 实现打开、取消、遮罩关闭、Escape、Tab 循环、焦点恢复、重复触发防护和 reduced-motion 即时状态。
   - 确认时生成严格校验的 `index.html?person=<id>#characters` URL；取消不改变 hash、滚动位置或正文状态。

4. **接入首页人物深链**
   - 在 `renderCharacters()` 完成后消费 `person` query，只接受现有 `archive.people` ID。
   - 找到卡片后滚动至人物模块并调用既有 `morphPerson()`；成功后清理一次性 query，避免刷新重复打开。
   - 无效参数保持普通首页且无 console/page error；现有角色卡片和全文链接行为不变。

5. **扩展浏览器回归**
   - notes：检查明确中文名、英文名/正式别名和 `person-27` 两个人名均生成正确 `data-person`；检查泛称、姓氏、`chapter-09-block-008` 的历史同名语境没有被标注，`chapter-06-part-49` 的角色标题可标注。
   - notes：点击标注、取消、Escape、Tab、焦点恢复、滚动位置保持、重复初始化不重复包裹和 dialog ARIA 状态。
   - notes：比较标注前后完整 `#noteContent.textContent`、已有链接属性、heading/block ID 和未标注文本；覆盖当前清点结果及跨 `strong/em` 文本节点的安全跳过。
   - 跨页：确认后 URL、首页人物模块、角色卡片标题和正文链接对应正确人物。
   - 首页：完成全部初始化后先滚动目标卡，再等待 reveal/几何稳定后开卡；非法 `person` query 不打开错误卡片、不报错，保留其他 query；关闭卡片焦点回到目标卡片。
   - 返回路径：确认跳转后使用浏览器 Back 返回全文，验证 BFCache/`pageshow` 后 dialog、inert、滚动锁和重复标注状态清理，阅读位置恢复。
   - reduced-motion：弹窗和深链交互均能到达最终状态；连续关闭后立即重新打开不出现重复层或重复导航。

6. **验证与证据**
   - `npm run build:content`
   - `npm run build`
   - `node --check scripts/build-content.cjs`
   - `node --check assets/js/image-viewer.js`
   - `node --check tests/desktop-smoke.spec.js`
   - `npm test`
   - `git diff --check`
   - 复核 `1920×1080`、`1440×900`、`1024×900` 的全文标注、弹窗和首页角色卡片截图；保留现有 `390×844` 历史回归，不表述为移动端交付。
   - 记录 `document.fonts.status`、CSS viewport、DPR、页面错误、失败请求和预览白名单结果。

7. **收尾**
   - 只提交 `scripts/build-content.cjs`、生成的 `assets/data/archive.js`、`notes.html`、`index.html`、必要的 `tests/desktop-smoke.spec.js`、本任务文档和 workspace journal。
   - 不纳入 `.agents/`、`.pi/`、`.tmp/`、凭据、其他 Trellis scaffold 或部署产物。
   - 运行主会话 quality check；如发现只修复本任务范围内的错误，不扩大功能。

## Validation matrix

| Area | Observable check |
|---|---|
| Mapping | 44 人物规则与标题一一对应；别名无冲突；共享卡双名同目标 |
| Text fidelity | 标注前后正文可见字符、标点、顺序和稳定 block ID 不变 |
| Notes interaction | 标注按钮可见、可键盘激活；dialog 标题/说明/取消/确认正确 |
| Focus and motion | Cancel/Escape/Tab/confirm 的焦点、滚动、ARIA 和 reduced-motion 状态正确 |
| Deep link | 合法 ID 打开准确人物卡；非法 ID 安全忽略；卡片全文链接不变 |
| Regression | 既有桌面/全文/搜索/目录/图片查看器回归通过；无 page/console/HTTP error |
| Scope | 只改授权文件；预览公开边界和部署配置不变 |

## Rollback points

- 规则表/生成元数据：移除映射字段与构建校验，不改原有人物字段。
- 文本标注：移除 TreeWalker 调用和 `.person-mention` 样式，保留 archive 原文。
- 弹窗：移除 dialog 触发和确认路由，保留普通全文阅读。
- 首页深链：移除 query 消费函数，保留既有角色卡片和全文链接。

## Review gates

- 不对完整 HTML 字符串使用正则做正文替换。
- 不把泛称、姓氏、演员姓名或无法唯一归属的短称映射到人物。
- 不复制角色卡片正文到全文页，不添加外部组件依赖。
- 不用固定延时代替弹窗、滚动、reveal 或跨页卡片最终状态的条件等待。
- 不削弱现有焦点、Escape、reduced-motion、搜索、目录和预览边界回归。

## Execution record

- 已在 `scripts/build-content.cjs` 中建立 44 条按完整标题校验的受控角色名称映射，生成 `mentions` / `mentionExclusions` 元数据；`person-27` 的两位人物共用 `person-27`，`person-43` 的历史同名语境按块 ID 排除。
- `notes.html` 使用一次性文本节点遍历生成原生 `.person-mention` 按钮，保留正文字符、链接、稳定 ID 和受保护节点；页面级确认框支持取消、遮罩、Escape、Tab、Enter/Space、焦点恢复、滚动锁、`inert`、reduced-motion、立即重开和 `pageshow` 清理。
- `index.html` 消费严格校验的 `person` query，在 hash 初始定位后补偿一次滚动，等待目标卡 reveal/几何稳定后复用 `morphPerson()`，成功只删除 `person` 并保留其他 query。
- `notes.html` 在确认跳转前把当前 hash、阅读锚点 ID、viewport 顶部位置和滚动位置写入历史条目的临时 state；返回时按锚点校正、等待字体/前置图片/reveal 稳定后消费，并在 hash 改变、用户交互或离开页面时取消恢复；不使用持久化存储。初始无返回 state 时不取消普通 hash/search 高亮定时器。
- `tests/desktop-smoke.spec.js` 新增正文保真、别名/共享卡、映射排除、焦点与弹窗状态、跨页普通返回、真实 BFCache 返回、非法 query、隔离 fixture 和 reduced-motion 回归；返回检查真实滚动位置、`pageshow.persisted=false/true`、viewport 内容锚点和 hash 取消；BFCache 用 Chromium 新 headless 模式移除默认禁用参数，不创建可见窗口。搜索高亮使用测试侧 `MutationObserver` 记录瞬时 class 的实际出现，不改变产品高亮时长。
- 验证：生产构建和发布白名单通过；完整 Playwright 11/11 通过（含新增 4 项）；内容构建、脚本语法、内联脚本语法、预览边界和 `git diff --check` 通过。正式桌面视口为 1920×1080、1440×900、1024×900，DPR 1，字体 loaded，237 个标注，无横向溢出或页面错误；三种视口均重新检查无弹窗正文标注、稳定确认弹窗和人物卡截图；390px 仅沿用历史回归。
