# Design: 全文角色名称标注与跳转

## Boundary

本任务只改角色映射生成、全文页展示交互、首页人物深链和对应 Playwright 回归：

- `scripts/build-content.cjs`：为现有人物记录生成受控角色名称映射，并在构建时校验映射完整性。
- `assets/data/archive.js`：由构建器重新生成，增加人物名称映射元数据；不手工编辑。
- `notes.html`：在运行时渲染后的全文文本节点上添加角色标注和确认弹窗。
- `index.html`：消费严格校验的 `person` 查询参数，滚动到人物模块并打开已有角色卡片。
- `tests/desktop-smoke.spec.js`：覆盖标注、确认、取消、焦点、共享卡、深链和无效参数。

不改原始 Markdown 的可见内容、原文标点、人物介绍正文、图片、预览白名单、Cloudflare 配置或移动端专门布局。生成的 `archive.js` 只增加由构建器产生的结构化映射字段。

正式浏览器验收沿用当前档案桌面范围：`1920×1080`、`1440×900`、`1024×900`；已有 `390×844` 图片查看器回归继续运行，但不构成移动端交付。

## Mapping contract

### Source of truth

在 `scripts/build-content.cjs` 的 `parsePeople()` 附近增加显式的角色名称规则表。每条规则以当前角色标题作为期望键，并列出可唯一归属的中文全名、英文名和明确别名。规则不以 `person-01` 这类顺序编号作为唯一配置键，避免在源标题增删后静默把别名指向错误人物。

构建时：

1. 解析角色标题并按现有逻辑生成 `person-*` ID和全文 target，保持既有 ID、分组和卡片契约。
2. 用完整期望标题匹配规则；标题缺失、重复或出现未配置人物时构建失败，而不是生成没有映射的页面。
3. 校验别名在全局唯一、非空、不是禁止的泛称/姓氏/演员名，并按确定性顺序输出。
4. 将规则映射到解析出的 `person.id`，输出例如 `mentions` 或等价字段；`person-27` 的两个中文/英文人物名全部明确指向同一个共享卡片 ID。
5. 保持 `person.html`、`person.text`、章节 HTML 和搜索文本不变；只有人物元数据增加映射字段。

别名匹配使用最长优先和非重叠匹配，但最长优先只是同一人物内部的消歧工具，不能替代显式映射校验。泛称、单独姓氏、演员名和无法唯一归属的短称不进入规则表。

## Notes-page data flow

1. `notes.html` 将现有 `archive.sections[].html` 注入 `#noteContent`。
2. 在标题分组和现有 reveal/TOC 初始化的合适位置，遍历允许的文本容器（正文段落、列表项、引用、表格单元格，以及角色档案 `h4` 标题）。使用 `TreeWalker` 处理文本节点，不对完整 HTML 字符串做正则替换。
3. 跳过 `a`、`button`、`code`、`pre`、图片替代文本、脚本/样式节点和已经标注的节点；保留已有链接、块 ID、heading 结构和文本顺序。
4. 将匹配片段替换为原生 `button.person-mention`，设置 `data-person`、稳定的 `data-mention` 和描述性 `aria-label`。按钮样式只增加轻量下划线/颜色/hover/focus 反馈，继承正文排版，不把整段正文改成链接或强制单行。
5. 原文 `textContent` 保持一致，搜索仍使用未装饰的 `archive` 文本；按钮只改变展示层和交互层。

## Confirmation dialog

`notes.html` 增加一个页面级确认弹窗，采用现有原生 HTML/CSS/JavaScript 状态模式，不引入 Radix、React 或外部组件：

- `role="dialog"`、`aria-modal="true"`、标题和说明通过 `aria-labelledby`/`aria-describedby` 关联。
- 内容显示当前角色名称、提示“前往首页查看角色介绍”，以及“继续阅读”和“查看角色介绍”两个明确操作。
- 打开时记录触发按钮和当前滚动状态，设置页面不可操作状态，焦点进入取消按钮或确认按钮；Tab 在弹窗内循环。
- 点击遮罩、关闭、取消和 Escape 关闭弹窗，移除状态并将焦点恢复到原角色标注；不改变阅读位置。
- 正常模式使用 `opacity`、`transform`、必要的轻微 `blur` 做面板进出场；`prefers-reduced-motion` 下立即切换最终状态。过渡期间禁止重复打开或重复导航。
- 确认操作只接受已存在于 `archive.people` 的人物 ID，跳转到 `index.html?person=<encoded-id>#characters`。

该弹窗是站内导航确认，不使用具有破坏性操作语义的警告文案；交互借鉴 shadcn Dialog/Alert Dialog 的结构化标题、说明和取消/继续动作。

## Homepage deep-link flow

`index.html` 在 `renderCharacters()` 完成后读取 `URLSearchParams`：

1. 只接受与 `archive.people` 精确相等的 `person` ID，拒绝空值、未知值和格式异常。
2. 找到对应卡片后，以即时或等待可见的方式滚动至 `#characters`/卡片，避免平滑滚动与弹窗打开竞态。
3. 打开已有 `morphPerson()` 角色介绍，不复制卡片内容、不新增第二套人物弹窗。
4. 成功消费参数后可用 `history.replaceState` 保留 `#characters` 并移除一次性 query，防止刷新重复打开；无效参数则保持普通首页且不抛错。
5. 人物弹窗中的“完整正文”链接继续使用现有 `notes.html#chapter-06-part-*` 目标。

## Compatibility and accessibility

- 标注按钮是可键盘访问的原生控件，支持 Enter/Space；确认弹窗提供可见焦点、焦点循环、Escape 和焦点恢复。
- 角色名称的辅助技术文本只暴露一次；装饰性图标使用本地 Lucide 并保持 `aria-hidden`。
- 不更改 `archive.sections[].text`、搜索索引、目录 hash 或稳定正文块 ID。
- 标注文本的 CSS 不使用全局 `nowrap`，不裁切、不省略、不删除名称；长名称自然换行。
- 正常动效与 reduced-motion 都必须落到可测试的稳定状态。

## Trade-offs

- 运行时文本节点标注比构建阶段拼接 HTML 更能避开现有链接、图片和 Markdown 生成结构，且保留搜索文本；代价是需要严格的 TreeWalker 跳过规则和重复初始化保护。
- 显式标题键规则比按顺序 ID 配置更冗长，但源标题调整时会立即构建失败，避免人物跳转静默错位。
- 同页跳到首页并复用既有卡片会暂时离开全文阅读位置；这是用户确认的目标，取消路径保留原文位置，角色卡片仍提供现有全文返回链接。

## Rollback

- 如果映射校验影响内容构建，可先移除 `mentions` 元数据和规则表，保留原有人物对象字段。
- 如果标注影响正文几何，可关闭 `annotatePersonMentions()` 的展示层调用；不回退原文或搜索数据。
- 如果深链竞态失败，可移除 query 消费逻辑，保留首页普通卡片点击和全文确认弹窗。
