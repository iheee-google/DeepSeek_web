# 原型目录

原型是**独立 HTML 文件**，用浏览器直接打开即可（`file://` 协议），不需要构建、不需要服务器。

## 规则

1. 原型只用于**验收**，不是正式代码。正式实现见 `src/`。
2. 原型一旦通过验收，其结论写回 `docs/requirements.md` §5 与 `docs/design-docs/core-beliefs.md`。
3. 外部依赖（字体、图片）必须本地化到 `assets/`，保证离线可打开。
4. 禁止引用 `../../personal-website/`（该项目已作废）。
5. **界面文案是本轮的主要评审对象**：只陈述事实，禁止排比、对仗、"这就是……"式总结、替读者解读、伪造金句。禁止在每个标题上方加全大写 eyebrow 小标签。
6. 只动画 `transform` 与 `opacity`；动效必须尊重 `prefers-reduced-motion`，降级为**更少更温和**（保留透明度与颜色过渡），不是全部移除。

## 现有原型

| 文件 | 方向 | 议题 | 状态 |
|---|---|---|---|
| `01-timeline.html` | — | 首屏：两段时间轴对位 | 已废弃（长度差不可见，前提在屏幕上失败） |
| `alpha-scenes.html` | α 一幕 | 全屏影像 + 巨大事实句 + 滚动换幕 | 待验收 |
| `beta-organize.html` | β 散落与归位 | 影像随滚动从散落归位到年份网格 | 待验收（已修：散落改为抖动网格、去掉与滚动打架的 transform 过渡） |
| `gamma-blinds.html` | γ 百叶窗 | 14 条横缝复现教父影像的百叶窗骨架；下方四套笔记版式 | 待验收 |

三个方向的差异不是配色，是**机制**：α 换的是"哪一幕占满屏"，β 换的是"影像的位置"，γ 换的是"画面怎么被切开"。

`shots/` 是交付给用户看的截图自审产物，命名对应原型。

## 资产

- `assets/fonts/` — NotoSerifSC-VF.ttf、NotoSansSC-VF.ttf（可变字重，来自系统 Windows 字体目录）
- `assets/godfather/` — 23 张教父影像（场景 13 + 肖像 10），源自 `godfather-trilogy-notes-v4/`
- `assets/inkwell/` — 5 张 InkWell Ai 界面截图，源自 linux.do 帖子的 `.assets/`（原作者 Elijahxs，非本人作品）
- `assets/t2i/` — 6 张文生图测试样张，源自 `工作/文生图双主体.assets/`
