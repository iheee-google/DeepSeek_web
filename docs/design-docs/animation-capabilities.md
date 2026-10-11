# 动画能力边界说明

回答用户提问（m00625）：现有 HTML 原型方案能否 100% 实现所要求的动画效果，哪些动画或 UI 组件受限。

全部结论来自本机实测，不是文档推测。测试浏览器为 Chrome for Testing 153.0.8010.12（Playwright chromium-1243），测试页面位于 `/tmp/cap/`、`/tmp/vt/`、`/tmp/xdoc/`。

## 一、结论速览

| 用户要求                 | 能否 100% 实现 | 说明                                                                   |
| ------------------------ | -------------- | ---------------------------------------------------------------------- |
| 每个元素有出现动画       | ✅ 可以        | `@starting-style` + `transition`                                       |
| 每个元素有消失动画       | ✅ 可以        | `transition-behavior: allow-discrete`                                  |
| 每个元素有过渡动画       | ✅ 可以        | 常规 `transition` / WAAPI                                              |
| 无缝衔接、Morph 形变过渡 | ✅ 可以        | 同文档 View Transitions；尺寸/圆角/位置均可连续插值                    |
| 跨页面 Morph             | ✅ 可以        | `@view-transition { navigation: auto }`，实测 `file://` 与 HTTP 均生效 |
| 小交互有动画（按钮缩放） | ✅ 可以        | `:active { scale: .95 }`，实测生效                                     |
| 不用 emoji，用开源图标   | ✅ 可以        | Lucide（ISC 许可）可用                                                 |
| 文字省略标点             | ✅ 可以        | 纯文案决定，无技术障碍                                                 |
| **滚动驱动动画**         | ⚠️ 有条件      | 见下节；写法错误会完全失效                                             |

**没有任何一条要求是做不到的。** 但有 6 处必须遵守的写法约束，违反时动画会静默失效（不报错、不动画）。

## 二、必须遵守的写法约束（实测得出）

### 1. 禁止用 `overflow: hidden` 做裁剪

**实测**：任何元素一旦成为滚动容器（`overflow` 为 `hidden`/`auto`/`scroll`），其内部元素的 `animation-timeline: view()` 会**冻结在固定值**，永不随滚动变化。

| 容器设置                    | `view()` 动画   |
| --------------------------- | --------------- |
| `overflow: visible`         | 正常            |
| `overflow: clip`            | **正常**        |
| `overflow: hidden`          | **冻结在 0.50** |
| `overflow: auto` / `scroll` | **冻结在 0.50** |

→ **本项目一律用 `overflow: clip` 代替 `overflow: hidden`。** `clip` 不创建滚动容器，因此不冻结时间轴。

### 2. 禁止 html 与 body 同时设 `overflow-x: hidden`

**实测**：

| 设置                                             | `view()` 动画       |
| ------------------------------------------------ | ------------------- |
| 只给 `body` 设 `overflow-x: hidden`              | 正常                |
| 只给 `html` 设 `overflow-x: hidden`              | 正常                |
| `html` 与 `body` **同时**设 `overflow-x: hidden` | **全页冻结在 0.62** |
| `html` 与 `body` 同时设 `overflow-x: clip`       | **正常**            |

→ 防横向溢出的首选写法是 **`overflow-x: clip`**。若确实要用 `hidden`，只能给 `body` 或 `html` 其中一方设。

### 3. 滚动容器内改用 `scroll(root)`

若某个元素不得不身处裁剪容器内，其 `view()` 会失效，但 `animation-timeline: scroll(root)` **仍然正常**（实测在 `overflow: hidden` 容器内 `scroll(root)` 从 0.61 → 0.81 → 1.00 正常变化，同容器内 `view()` 恒为 0.38）。

### 4. `view-transition-name` 同一时刻必须全文档唯一

**实测**：两个元素带相同的 `view-transition-name` 时，过渡直接抛错并完全不播：

```
Transition was aborted because of invalid state. Snapshot capture failed
```

`view-transition-name: var(--n)` 这种变量形式同样不可靠，必须用字面量名，并在切换时保证唯一（切换前先移除旧元素的类，再给目标元素加类）。

### 5. `grid-template-rows` 折叠必须写 `minmax()`

裸写 `0fr → 1fr` 会被解析成意外值。必须写 **`minmax(0, 0fr) → minmax(0, 1fr)`**。实测：`0px → 23px → 47px → 0px` 过渡正常。

### 6. 构建压缩器会把 `animation-timeline` 折进 `animation` 简写，导致动画静默消失

**这是本项目正式实现时踩到的真 bug（2026-10-11）。**

Astro 的 CSS 压缩器把这两条：

```css
.rule-fill {
  animation: rule-grow linear both;
  animation-timeline: scroll(root block);
}
```

合并成了简写：

```css
.rule-fill {
  animation: linear both rule-grow scroll(root);
}
```

而 Chromium 153 **不接受在 `animation` 简写里写时间轴**：整条声明被丢弃，`animation-name` 变成 `none`，动画完全不播，且不报任何错。

实测对照（三份等价写法，同一页面）：

| 写法                                                    | `animation-name` | 是否随滚动变化       |
| ------------------------------------------------------- | ---------------- | -------------------- |
| `animation: linear both g scroll(root)`（简写含时间轴） | `none`           | ❌ 恒为 `scale:none` |
| `animation: g linear both;` + `animation-timeline: …`   | `g`              | ✅ 0 → 0.37 → 0.74   |
| 全用长属性分别声明                                      | `g`              | ✅ 0 → 0.37 → 0.74   |

**规避办法**：让两条声明落在**不同特异性**的选择器上，压缩器就无法合并。例如：

```css
.foot .rule-fill {
  animation: rule-grow linear both;
}

@supports (animation-timeline: scroll()) {
  /* 多一个 body 提升特异性，阻止压缩器合并成简写 */
  body .foot .rule-fill {
    animation-timeline: scroll(root block);
  }
}
```

写完后**必须验证**：在浏览器里读 `getComputedStyle(el).animationName`，它不能是 `none`。

## 三、reduced-motion 的一个坑

**浏览器不会自动降级 View Transitions。** 实测在 `prefers-reduced-motion: reduce` 下，同文档过渡仍有 10 个动画、时长 250ms。

→ 必须自己写：

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
  }
}
```

按 `emil-design-eng` 的规则，降级是**更少更温和**而非全部移除：保留透明度与颜色过渡，移除位移与缩放。

## 四、能力清单（实测支持）

同文档 View Transitions、跨文档 View Transitions、`view-transition-class`、`@view-transition { types: }`、滚动驱动动画 `view()` / `scroll()`、`ScrollTimeline` 与 `ViewTimeline` 构造器、WAAPI `Element.animate`（含 `composite: 'add'`、`commitStyles`）、`@starting-style`、`transition-behavior: allow-discrete`、`@property`、`linear()` 缓动、`clip-path: path()`、`corner-shape`、`interpolate-size: allow-keywords`、`calc-size()`、锚点定位 `@position-try`、`scroll-state()` 容器查询、`text-box-trim`、`field-sizing: content`、`:has()`、容器查询、`backdrop-filter`、`mask-image`、3D transform、`@scope`、`@layer`、Popover API、`Dialog`、Canvas 2D / WebGL2 / OffscreenCanvas / WebCodecs。

图标：**Lucide** 可用（`lucide-static`，ISC 许可，实测 SVG 正常返回）。

## 五、浏览器兼容性（需说明的边界）

以上实测均在 Chromium 内核完成。实际影响：

- **View Transitions**：Chrome / Edge 支持；Safari 18+ 支持同文档与跨文档；Firefox 尚未默认开启。
- **滚动驱动动画**：Chrome / Edge 支持；Safari 26+ 开始支持；Firefox 在实验标志后。

→ 因此正式实现必须按**渐进增强**写：动画全部建立在「不支持的浏览器看到完整静态内容」的基础上，用 `@supports (animation-timeline: view())` 包裹增强部分。**不支持的浏览器会看到静态但完整的页面，不会看到坏掉的页面。** 这是实现时的硬要求，不是可选项。

## 六、不受限的部分

以下均为纯 CSS / 原生 Web API，无任何第三方依赖，也没有能力上限：

- 元素级出现、过渡、消失动画
- Morph 形变过渡（同页与跨页）
- 按钮等小交互的缩放反馈
- 滚动驱动的运镜、揭示、排列重组
- 文字省略标点

## 变更历史

| 日期       | 变更                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| 2026-10-11 | 建立本文件，记录六条动画要求的可行性结论与五处写法约束                  |
| 2026-10-11 | 新增第 6 条约束：压缩器折叠 `animation-timeline` 进简写导致动画静默失效 |
