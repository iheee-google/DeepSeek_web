# 暗幕与红线：电影感视觉冲击力技术设计

## 1. 设计边界

本任务是上一版 `10-16-godfather-visual-theme` 的视觉构图迭代，不改变站点架构和内容数据流：

```text
content/godfather-trilogy-notes-v4.md
  -> scripts/build-content.cjs
  -> assets/data/archive.js
  -> index.html / notes.html
  -> 现有原生 CSS、DOM 事件、IntersectionObserver、image-viewer.js
```

原则：优先使用现有 DOM 类名和 CSS 状态完成构图；只有现有 DOM 无法表达明确层级时，才在 `index.html`/`notes.html` 增加无语义副作用的结构 class 或装饰性元素。不得通过 JavaScript 重写布局、内容或交互状态。

### 文件边界

- 可能修改：`assets/css/archive-theme.css`、`index.html`、`notes.html`、`assets/css/image-viewer.css`（仅当视觉层需要同步）。
- 可能修改：`tests/desktop-smoke.spec.js`（新增视觉层级、主题阶段、几何/对比度证据，不降低既有断言）。
- 必须同步：`docs/design-v2.md`、`.trellis/spec/frontend/index.md` 或 `quality-guidelines.md` 中实际发生变化的产品/工程约束、任务记录和 journal。
- 不修改：`content/`、`scripts/build-content.cjs`、`assets/data/archive.js` 的语义、人物映射、图片文件、`assets/js/` 行为逻辑、`wrangler.jsonc`、部署脚本与依赖。

## 2. 视觉层级模型

### 2.1 三个语义场景

共享 token 保留上一版暖纸/暗书房语义，并新增有限的“冲击力结构”角色，不使用页面局部硬编码来制造第三套主题：

| 场景 | 背景/前景 | 用途 |
|---|---|---|
| `paper-archive` | 暖纸 + 墨褐 | 规则、人物、史实、符号、全文正文 |
| `study-cut` | 多层近黑 + 象牙/暖灰 | 开场、权力转折、主引文、结尾 |
| `line-focus` | 深酒红线/块 + 象牙或墨褐 | 章节分隔、节点焦点、选中/活动状态 |

`line-focus` 不是独立页面主题；它只能作为细线、编号、边界或明确选中面使用。琥珀保留为暗面细节和编号，不承担浅面小字。

### 2.2 首页节拍

1. **Hero / 暗幕**
   - `.hero` 保持暗色全幅叙事底。
   - `.hero-media` 从三张近等量海报改为有意的前后层级：`godfather1.jpg`（《教父》I）固定为中央主海报和第一视觉锚点，`godfather2.jpg`、`godfather3.jpg` 为两侧次级海报，分别错位、缩放和层叠；全部使用自然 aspect-ratio，不用 `object-fit: cover` 隐藏内容。
   - 标题、海报、编号的 z-index 和安全区明确；CTA 不被海报层遮挡，海报图片仍可触发现有 viewer。
   - 红线只作为 hero 底部/标题附近的结构标记；不用全局发光。

2. **Archive / 暖纸档案**
   - 规则和内容入口保持暖纸，但标题栏通过编号、短结构线、跨栏留白形成开场后的“落地”层级。
   - 不把每个卡片做成悬浮软卡；边界采用纸色阶和细线。

3. **Consequence / 暗色权力段**
   - 明确将现有 `.timeline-section` 作为暗色切场，时间线保留单轨、拖拽、节点和详情几何；只改 surface、节点、线和文字配对。
   - 红线表达时间轴的连续结构或当前节点，不增加虚假的人物关系；搜索、人物详情和 viewer 不在本轮重设计，只做回归。

4. **Quote / 电影停顿**
   - 保持现有 paired quote DOM、九条稳定 ID、行组和无障碍中文版本。
   - 暗面增加明确的引用舞台：引号、主引文和来源形成前中后层级；不改变 `showQuote()` 的映射或切换逻辑。

5. **Bloodline / 家族权力地图**
   - 人物亮面仍可读，但焦点人物和 roster 不能全部同重量：焦点卡拥有更大的影像/标题空间，次级卡保持紧凑。
   - 通过跨栏标题、纵向编号、边界线和空白制造地图感；装饰线不能暗示不存在的关系。
   - filter/selected/focus 仍使用语义按钮和明显状态，不能仅靠颜色。

6. **Fact / Motif / 查证层**
   - 史实证据带保留上下全宽和完整正文；通过左侧元信息与右侧正文的重量差强化“档案证据”，不改内容。
   - 符号模块保持影像对应，允许用局部影像比例、编号和分隔节拍强化“物件先开口”，不新增图片。

7. **Finale / 暗影余波**
   - 保留 `michael-chair.jpg` 和现有结尾内容，但不复制 hero 的左右构图；采用更少元素、更大的留白和不同的标题重心，形成结束而非首屏回环。

### 2.3 全文页

- `notes.html` 继续以暖纸正文和 Rail TOC 为主，不复制首页海报舞台。
- hero、目录当前态、章节边界、引用/人物标注可使用墨褐、酒红和少量暗面；正文、表格和长文保持稳定行宽与阅读对比度。
- 角色标注保留默认下划线/颜色、hover/focus/active；不使用红色胶囊覆盖正文。
- person detail 和 image viewer 的布局/生命周期保持已有契约；必要时只调整 surface、border、shadow 和层级。

## 3. CSS 与行为边界

- 共享视觉 token 继续集中在 `assets/css/archive-theme.css`；页面本地样式按模块使用，避免文件末尾无限追加覆盖块。
- 主题层不得重命名全部旧变量；兼容 alias 保留，新的暗/亮 surface 明确指定前景。
- 动效只使用现有 `data-reveal`、`is-visible`、`is-active`、`is-entering`、`is-leaving`、`is-closing` 和已有 Morph/FLIP 机制。CSS transform 只改变视觉层，不改变文档锚点、按钮语义或点击路径。
- 不引入 continuous `window` scroll listener；首屏/模块状态继续由 IntersectionObserver 驱动。
- 海报与图片默认保留 `object-fit: contain` 或自然比例展示；如需层叠，使用外层位置和 transform，而不是裁切源图。首屏三张海报的真实点击区域必须独立可达，且 CTA 层不能被海报遮挡。
- `prefers-reduced-motion: reduce` 取消 transform/opacity/blur 过渡，保证构图最终态立即可见。

## 4. 兼容性与回退

- 第一检查点：只更新 token 与首页 hero；若出现文字/图片遮挡，回退 hero 层级而不改交互。
- 第二检查点：加入时间线暗切与红线；若拖拽或轨道几何变化，回退 surface/线色而保留亮面版本。
- 第三检查点：加入人物/史实/符号地图层级；若内容可达性或标题行组受影响，优先移除视觉 transform，不删内容。
- 所有回退只针对本任务 scoped 文件；不回退上一版已验收的角色链接、图片关闭、阅读位置恢复或部署配置。

## 5. 核心取舍

- **冲击力 vs 可读性**：用少数暗切和尺度对比制造冲击，不把所有正文置暗。
- **首屏识别 vs 内容完整**：`godfather1.jpg` 成为首屏主海报，II/III 保持次级回声；三张都保留、可达和可查看，不能让标题/CTA 被影像吞没。
- **地图感 vs 语义诚实**：只用结构线和编号表达栏目层级，不绘制没有数据支持的关系图。
- **动效感 vs 回归稳定**：优先已有 reveal/Morph/FLIP；不新增依赖时间和持续滚动的复杂动画。
