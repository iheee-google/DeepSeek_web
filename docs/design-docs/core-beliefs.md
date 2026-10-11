# 核心信念与技术栈决策

## 智能体优先的操作原则

1. 人类掌舵，智能体执行；需求、决策和验收由人类确认，代码与工件由智能体产出。
2. 上下文必须进入仓库并版本化；只存在于对话或人脑中的约束不算项目事实。
3. 入口文档只做地图，具体规则进入对应设计文档、工具和结构测试。
4. 在边界解析并校验数据形状；不凭猜测访问外部数据字段。
5. 先建立反馈回路，再用自动化门禁约束代码、文档和架构。
6. 交互式决策必须落盘；没有仓库记录的确认不能作为后续会话的依据。
7. 技术债小额、高频偿还；发现智能体卡点时，优先补工具、约束或文档。
8. 视觉实现以用户可验收的原型为起点；正式前端实现不得绕过原型审批闸门。

## 已确认的技术栈

> 以下五项由用户在 2026-10-11 交互确认，无 AI 自行假设项（Harness §3.2）。

| 项目         | 结论                                                                          | 依据                                                             |
| ------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 目标平台形态 | Web 静态站点                                                                  | 用户确认部署到 Cloudflare Pages                                  |
| 语言         | TypeScript                                                                    | 用户确认 Astro + React islands 方案                              |
| 框架         | Astro + React islands                                                         | 内容优先静态页面，交互与动效区域用 island 隔离，不拖累首屏与 SEO |
| 包管理器     | pnpm                                                                          | 用户确认                                                         |
| 构建方式     | Astro 静态构建输出 `dist/`，构建后生成 Pagefind 索引，部署到 Cloudflare Pages | 静态供应链路最短，与内容型站点形态匹配                           |

## 已确认的视觉方向

> 2026-10-11 交互确认。原 `../personal-website/` 项目被用户判定为失败作废，本项目不复用其原型、截图或设计结论。

- **方向 B「证据剧场」**：全屏真实影像 + 大字号标题压印 + 滚动驱动运镜 + 章节式推进。
- **首屏主体 = 作品先行**：以精选项目开场，不先讲自我简介。
- 明确**拒绝**近黑底 + 单一亮强调色的通用"高级感"方案（该组合是当下生成式设计的头号特征，无法形成辨识度）。
- 明确**拒绝**纯网格 + 编号 + 等宽字体的"技术档案馆"方案（理性但情绪浓度低，达不到用户要求的视觉冲击）。
- 《教父》笔记作为**旗舰专题公开发布**，含其 77 张影像素材；版权风险已由用户确认承担。

## 视觉冲击力的来源原则

- **冲击来自真实影像与内容的密度**，不来自装饰性渐变、发光或粒子特效。
- 素材密度是本项目的护城河：44 位人物、96 年编年史、12 个视听符号、77 张影像——这套结构无法被通用模板复制。
- 全站保持中性壳层与内容语义色：字体、网格、边界和交互规则统一；强调色只进入对应内容的证据区。
- 动效必须有明确目的（空间一致性 / 状态指示 / 反馈 / 避免突兀变化），禁止"为了酷"而在高频交互上加动画。
- 性能预算与 `prefers-reduced-motion` 降级是一等公民，不是事后补丁。

## 关键架构约束

- Markdown 内容通过 Astro Content Collections 建模，并在边界用 schema 解析和校验。
- `draft` 内容不得生成公开页面，也不得进入 Pagefind 索引。
- 中英文内容使用稳定的 locale 路由和可校验的内容关联关系。
- 静态内容保持 Astro 输出；只有确实需要浏览器交互的区域才使用 React island。
- 动效、主题切换和全文搜索必须有无障碍降级和性能预算。
- 在正式 Astro 前端实现前，必须先交付并获得用户确认的独立 HTML 原型（见 `docs/requirements.md` §5.4）。

## 调研依据

- [Cloudflare：Deploy an Astro site to Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Astro：Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro：Internationalization](https://docs.astro.build/en/guides/internationalization/)
- [Astro：Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Pagefind：Getting Started](https://pagefind.app/docs/)
- [web.dev：prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
- [Chrome：Scroll-driven Animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)
