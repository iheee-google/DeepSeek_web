# Design: 强化角色标注、补全简称映射与全文页人物卡

## Boundary

本任务只改以下职责边界：

- `scripts/build-content.cjs`：扩展生成器拥有的受控人物简称规则、冲突/保护校验和生成元数据。
- `assets/data/archive.js`：由内容构建重新生成，不手工编辑。
- `assets/js/person-reader.js`：必要时抽取首页现有的人物介绍 HTML 清理/渲染逻辑，供首页和全文页消费同一份人物数据，不复制正文。
- `index.html`：如果抽取共享渲染函数，只做最小接线；不再为全文角色标注新增跨页入口。既有合法首页人物卡交互保持。
- `notes.html`：调整 `.person-mention` 展示层级和匹配器，点击后直接在本页打开人物详情层；移除新流程对首页 query/hash/return state 的依赖。
- `assets/css/image-viewer.css`、`assets/js/image-viewer.js`：修复图片查看器关闭生命周期。
- `tests/desktop-smoke.spec.js`：增加标注默认可见性、简称正反例、同页人物详情、焦点/滚动和关闭即时状态回归。

不改原始 Markdown 可见内容、人物正文、首页模块布局、搜索契约、部署白名单或移动端专门布局。

## Research references

本任务只借鉴公开交互原则，不复制实现，也不引入运行时依赖：

- https://design-system.service.gov.uk/styles/links/
- https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- https://ui.shadcn.com/docs/components/radix/dialog

这些参考支持默认可见链接线索、独立键盘焦点和可访问弹层；实际样式仍遵循本项目的 family–power 视觉变量。

## Controlled alias model

### Source of truth

继续以人物当前完整标题校准 44 条人物规则，不按数组顺序推断目标。将当前 `names: string[]` 扩展为可表达匹配约束的规则结构，保持简单别名仍可读：

```js
{
  id: 'person-02',
  title: '麦克·柯里昂 (Michael Corleone / Don Michael)',
  names: ['麦克·柯里昂', 'Michael Corleone', 'Don Michael'],
  aliases: [
    { name: '麦克', protect: ['麦克拉斯基', '麦克莱伦', '麦克白'] }
  ],
  exclusions: []
}
```

实现可采用同等结构，但生成到 archive 的元数据必须保留每个简称的 `name`、目标 ID 和保护/排除语义；不能只把保护逻辑硬编码在 `notes.html`。

### Validation

构建期验证：

1. 规则标题与解析人物一一匹配，44 个稳定 ID 全部存在。
2. 别名非空、全局目标唯一；普通别名冲突直接失败。
3. 跨人物包含关系只有在短别名声明了完整保护词/排除条件时才允许；保护词必须覆盖较长的现有别名和实际扫描发现的反例。
4. 禁止泛称、演员姓名、姓氏和无法唯一归属的短称。
5. 对每个别名扫描生成文本，输出匹配数和上下文摘要；映射规则中未覆盖的高频候选进入构建报告/测试 fixture，而不是静默添加。
6. 继续检查 `person-43` 的 `教皇若望·保禄一世` 历史块排除和 `person-27` 双人共享卡。

首轮审计重点候选：`维托`、`老维托`、`索洛佐`、`麦克`、`汤姆`、`凯`、`康妮`、`卡洛`，以及源文中实际出现的英文短称 `Mike` 等。最终只有上下文唯一且有反例保护的候选进入映射。

### Runtime matching

- 保持一次 TreeWalker、逐文本节点处理、最长优先和非重叠替换。
- `findMentionMatches()` 在接受候选前检查生成的保护/排除条件；保护词命中时跳过该候选并继续扫描，不能跳过整段文本。
- 保护判断允许读取同一语义块内的连续文本窗口，以识别 `麦克<strong>拉斯基</strong>`、`汤姆<em>逊</em>`、`凯<strong>恩斯齐格</strong>` 这类跨内联节点的复合词；但只替换实际命中的原文本节点，不合并、移动或重建节点。跨节点的完整人物名称仍不强行标注。
- 保护词只屏蔽具体匹配区间，不能因为同一段出现一个复合词就跳过整段中其他合法简称。英文短称同时执行 ASCII 字母/数字边界检查。
- 所有生成的按钮仍写入稳定 `data-person`、`data-mention` 和 `aria-label`。

## Annotation presentation

默认态使用正文继承字号与行高，同时提供两种持续线索：

- 角色强调色（使用现有 `--accent`/`--olive` 体系，保证与正文有稳定对比）；
- 可见的双层/较粗底部标记或 `text-decoration`，不依赖 hover 才出现；
- 可选极浅暖色底，仅作为辅助，不把每个名称变成胶囊标签。

hover/active 只增强颜色、底纹和短暂 transform/box-shadow；focus-visible 使用清晰 outline/ring，不能被正文容器裁切。长名自然换行，不使用全局 `nowrap`。保留 `prefers-reduced-motion` 的即时状态。

视觉验收使用截图目标段落与三种正式桌面视口：默认未悬停时按钮与同段普通文字的颜色/底线差异可见，且不改变正文行盒、标点和滚动定位。

## Same-page person detail

### Data and rendering

- 从 `archive.people` 按严格 `person.id` 取人物记录；不从按钮文本反推目标，也不从 query/hash 读取目标。
- 将首页 `readerHtml(data)` 中“使用生成的 `person.html`、移除外层标题/稳定 ID”的纯渲染部分抽到小型本地共享模块，或以同等方式复用，供 `index.html` 与 `notes.html` 使用。
- 模块只处理受控 archive HTML 的清理和内容渲染；详情层的打开、焦点、滚动锁和路由状态仍由页面各自管理。
- 详情层可以复用首页 reader 的信息层级（kicker、主标题、别名、肖像、人物正文、元信息），但必须在 `notes.html` 使用独立 ID，不能把首页 reader 的 DOM 复制过来或制造重复 ID。

### Layer state

人物层只有 `closed` 与 `detail` 两个状态，不再显示确认视图：

1. 点击 `.person-mention`：记录触发按钮、当前 `scrollY` 和人物 ID，校验 ID 后直接填充并打开详情；不写 history、不改 URL。
2. 详情层打开时设置自己的 `inert`/滚动锁和 ARIA 状态，初始焦点进入关闭控件；背景状态不能被图片查看器单独清除。
3. 点击关闭、遮罩或 Escape：详情层立即进入关闭完成状态，清理内容/状态，恢复原 `scrollY`，焦点以 `focus({ preventScroll: true })` 回到触发按钮。
4. Tab 只在详情层的可聚焦控件内循环；详情中的图片按钮仍由全局 image viewer 接管。
5. Escape 顺序为：图片查看器 → 人物详情层 → 其他页面层，不能同一事件穿透关闭两层。
6. 快速打开另一人物时递增状态序号并清理旧关闭回调，不能显示旧人物或解除新详情层的背景锁。

原来的 `index.html?person=<id>#characters` 生成逻辑必须停止被 notes 触发。实现前检查 `noteCharacterReturn` 和首页深链消费器的其他调用方：若只是旧角色跳转遗留代码，删除直接无调用方的返回恢复路径；若需兼容已有手工 URL，保留首页安全消费器，但不再从全文生成该 URL。

## Image-viewer close lifecycle

当前问题是 `closeViewer()` 先等待 280ms，再调用 `dialog.close()` 和解除 body 锁；原生全屏退出只应作为异步浏览器清理，不得阻塞应用关闭。

1. 关闭入口先递增 sequence、清理旧关闭 timer、标记当前实例不可重入，并保存触发元素。
2. 若当前真实全屏，调用 `document.exitFullscreen()`，但不 `await`；拒绝或晚到的 `fullscreenchange` 只能清理对应旧 sequence，不能阻塞应用关闭。
3. 同步移除模拟全屏/closing 类，调用 `dialog.close()`，移除图片查看器自己的 `body.image-viewer-open`，恢复原滚动和焦点；下一帧可观察到这些应用状态已完成。
4. `requestFullscreen()`、`exitFullscreen()`、`fullscreenchange`、旧 timer 和焦点回调都携带 sequence；新打开后，任何旧回调不得修改新实例的图片、class、全屏按钮或焦点。
5. 图片层关闭时只释放图片层自己的锁；如果人物详情层仍打开，不能移除人物层的 inert/滚动锁。
6. 快速再次打开时重新设置 trigger、图片和 class，不能被上一次关闭回调覆盖。
7. CSS 不再用 280ms timer 作为必要生命周期；如保留极短视觉反馈，只能是非阻塞的按钮 active/即时状态，reduced-motion 直接稳定。

## Testing design

新增/强化测试：

- 从截图对应段落查询 `维托`、`索洛佐`、`桑尼`，检查默认 computed color、border/text-decoration/background 和稳定按钮数量。
- 断言 `麦克` 等简称正确指向 `person-02`，同时断言 `麦克拉斯基`、`汤姆逊`、`凯恩斯齐格`、演员名和 `person-43` 历史同名不被错误包裹。
- 比较标注前后正文 `textContent`、已有链接/图片/code 结构、稳定 ID 和搜索目标。
- 点击一个简称，验证仍为 `notes.html`、URL/hash/history length 不变，详情标题/正文/图片来自 `archive.people`；关闭后用稳定正文锚点比较阅读位置和焦点。
- 验证详情内图片打开后 Escape 只关闭图片层，再次 Escape 才关闭人物详情；覆盖 Tab、遮罩、重复打开和 reduced-motion。
- 在正常动效、reduced-motion、真实全屏可用/不可用和快速关闭重开场景中，点击图片关闭后下一帧检查 `dialog.open === false`、图片查看器自身 body 锁清除、closing class 清除、焦点回到触发图片；人物层仍保持自己的锁定。原生全屏退出允许异步完成，不用固定 sleep 证明应用状态关闭。
- 保留现有图片比例、缩放、搜索、TOC、hash 和历史 390px 检查。

## Trade-offs

- 受控保护词元数据比简单把更多短串塞入 `mentions` 更复杂，但能解释“麦克”与“麦克拉斯基”等包含关系，避免错跳。
- 同页人物详情需要在 `notes.html` 增加一个页面层，并可能抽取共享渲染 helper；这比跳首页复杂，但符合用户的阅读连续性要求，也避免跨页恢复、BFCache 和人物大全滚动竞态。
- 人物层与图片层各自拥有锁定和清理职责：图片层关闭只释放图片层状态，不能解锁仍打开的人物层。
- 默认更明显的下划线/强调色比当前浅底线更容易发现，但仍保持正文排版而不使用大面积标签背景。
- 关闭时移除 280ms 视觉退场会牺牲少量淡出连续性，换取关闭按钮的即时可预测反馈；打开动画和按钮 active 反馈保留，避免异步 fullscreen API 阻塞主交互。
