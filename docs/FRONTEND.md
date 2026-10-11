# 前端规范

> 动效能力边界与写法约束见 [`design-docs/animation-capabilities.md`](./design-docs/animation-capabilities.md)（**实现动效前必读**）。
> 视觉方向与文案规则见 [`DESIGN.md`](./DESIGN.md)。
> 目录职责与依赖方向见仓库根 [`ARCHITECTURE.md`](../ARCHITECTURE.md)。

## 1. 分层

依赖方向**单向**：`Types → Config → Repo → Service → Runtime → UI`。

```text
src/types/       类型与内容模型（不依赖任何其它层）
src/config/      站点配置与动效 token（仅依赖 types）
src/repo/        数据访问：内容读取、front matter 解析（依赖 types、config）
src/service/     业务逻辑：内容聚合、检索（依赖 types、config、repo）
src/runtime/     运行时行为：主题、动效编排（依赖 types、config、repo、service）
src/components/  UI 组件（可依赖所有层）
src/layouts/     页面骨架
src/pages/       路由入口
src/styles/      全局样式与 token
```

结构测试会扫描 import 图，下层引用上层直接失败。

## 2. 内容渲染

- Markdown 内容通过 **Astro Content Collections** 建模，**在边界用 schema 解析和校验**。未校验的 front matter 一律视为 `unknown`，禁止直接假设字段存在。
- `draft: true` 的内容**不生成页面、不进搜索索引**。
- 静态内容保持 Astro 输出（零客户端 JS）；**只有确实需要浏览器交互的区域才使用 React island**。
- island 优先 `client:visible`，避免 `client:load` 拖累首屏。

### 不同体裁不同版式

不套统一模板（用户 m00250 决策）。体裁判定见 `src/types/content.ts` 的 `NoteKind`：

| kind       | 版式                                     |
| ---------- | ---------------------------------------- |
| `thread`   | 论坛讨论：楼层号在左沟槽，立场与原文在右 |
| `glossary` | 科普速查：表格当主角                     |
| `longform` | 技术长文：目录脊 + 正文                  |
| `product`  | 产品记录：版本时间线 + 截图横向轨道      |
| `essay`    | 理论随笔：定义与对照                     |
| `index`    | 目录索引页：进列表不进搜索结果           |

## 3. 动效

> 完整写法约束见 `design-docs/animation-capabilities.md`。违反其中任何一条，**动画会静默失效**（不报错、不动画）。

### 决策顺序（emil-design-eng）

1. **该不该动**：每天 100+ 次的交互不动；键盘触发的动作**永不加动画**。
2. **目的**：空间一致性 / 状态指示 / 解释 / 反馈 / 避免突兀变化。没有目的就不加。
3. **缓动**：进入用 `--ease-out`，屏上移动与形变用 `--ease-in-out`，hover 与颜色用 `ease`，持续运动用 `linear`。**UI 动画永不使用 ease-in**。
4. **多快**：按压 120ms、tooltip 160ms、下拉 200ms、modal 250ms、面板 350ms、揭示 500ms。**UI 动画保持在 300ms 以下**。

### token

缓动与时长定义在 `src/config/site.ts` 的 `MOTION`，再由 `src/styles/global.css` 暴露为 CSS 变量。**组件内不写裸的 cubic-bezier 与毫秒数**。

### 硬规则

| 规则                                                          | 原因                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| 只动画 `transform` 与 `opacity`（`clip-path`、`filter` 可用） | 跳过 layout 与 paint，走 GPU                          |
| 不用 `overflow: hidden` 做裁剪，**一律 `overflow: clip`**     | `hidden` 让容器成为滚动容器，冻结内部 `view()` 时间轴 |
| 不同时给 `html` 与 `body` 设 `overflow-x: hidden`             | 同上，会冻结全页滚动驱动动画。用 `overflow-x: clip`   |
| `view-transition-name` 同一时刻全文档唯一                     | 重名会中止过渡并报 `Snapshot capture failed`          |
| `animation-timeline` 不写在 `animation` 简写里                | 构建压缩器会折叠两条声明，浏览器丢弃整条              |
| 高度折叠写 `minmax(0, 0fr) → minmax(0, 1fr)`                  | 裸 `0fr → 1fr` 不插值                                 |
| 按压反馈用 `scale` 属性，不用 `transform: scale()`            | 与其它 transform 解耦，且 `:active` 可读              |
| hover 动画包在 `@media (hover: hover) and (pointer: fine)` 内 | 触屏 tap 会误触发 hover                               |
| 不用 `window.addEventListener('scroll')`                      | 用 IntersectionObserver 或滚动驱动动画                |
| 可快速重复触发的 UI 用 transition，不用 keyframes             | transition 可被中断重定向，keyframes 从零重启         |

### 降级

`prefers-reduced-motion: reduce` 意味着**更少更温和的动画，而非零**：

- 保留透明度与颜色过渡。
- 移除移动与位置动画。
- **浏览器不自动降级 View Transitions**，必须自己写 `::view-transition-group(*) { animation-duration: .01ms !important }`。

## 4. 可访问性

- 可见键盘焦点（`:focus-visible`），不得 `outline: none` 了事。
- 每页有跳转到主内容的 skip link。
- 对比度达 WCAG AA。
- 装饰性图片用空 `alt`，内容图片写真实 `alt`。
- 纯 CSS 隐藏文字用 `overflow: clip` + `clip-path: inset(50%)`，不用 `display: none`（屏幕阅读器要能读到）。

## 5. 图标

**禁用 emoji**（用户 m00625 要求）。使用开源图标，当前选型 **Lucide（ISC 许可）**。内联 SVG，不用图标字体。

## 6. 性能预算

- 首屏不加载非关键 JS。
- 影像用响应式尺寸与懒加载；非首屏图片 `loading="lazy"`。
- 构建产物：字体子集化后 `dist/` 应保持在 1 MB 量级。

## 变更历史

| 日期       | 变更                                                     |
| ---------- | -------------------------------------------------------- |
| 2026-10-11 | 建立。汇总分层、内容渲染、动效硬规则、可访问性与图标选型 |
