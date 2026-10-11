# AGENTS.md

个人网站项目：作品集 + 长期笔记空间。Astro + React islands + TypeScript + pnpm，静态输出部署 Cloudflare Pages。

## 先读什么

| 文件                                         | 用途                                               |
| -------------------------------------------- | -------------------------------------------------- |
| `docs/HARNESS-RULES.md`                      | 强制工程规则。施工期不得删改或精简                 |
| `docs/requirements.md`                       | 需求与已确认决策（§5）                             |
| `docs/design-docs/core-beliefs.md`           | 技术栈、视觉方向、架构约束                         |
| `docs/design-docs/animation-capabilities.md` | **写动效前必读**：6 条写法约束，违反则动画静默失效 |
| `docs/DESIGN.md` / `docs/FRONTEND.md`        | 视觉规范 / 前端实现规范                            |
| `docs/exec-plans/tech-debt-tracker.md`       | 已知技术债与推迟原因                               |
| `docs/CI.md`                                 | 框架判定、门禁状态、Cloudflare 部署方案            |
| `ARCHITECTURE.md`                            | 目录职责与依赖方向                                 |

## 硬约束

- **技术栈不得擅自变更**：五项结论以 `docs/design-docs/core-beliefs.md` 为准；变更须用户确认并同步该文件。
- **禁止复用 `../personal-website/`**：该项目已被用户判定失败作废，其原型、截图与设计结论一律不得复制。
- **依赖方向单向**：`Types → Config → Repo → Service → Runtime → UI`，横切关注点只经 `Providers` 进入（Harness §5）。
- **边界解析数据形状**：Markdown front matter 一律经 schema 校验，禁止直接假设字段存在。
- **`draft` 不公开**：仅 `published` 内容生成页面并进入搜索索引。
- **界面文案只陈述事实**：禁止排比、对仗、「这就是……」式总结、替读者解读、伪造金句（用户 m00173/m00178/m00250）。
- **裁剪一律 `overflow: clip`**：`hidden` 会让容器成为滚动容器并冻结内部滚动驱动动画。
- **禁用 emoji**：用开源图标（当前选型 Lucide，ISC）。
- **不得发布敏感内容**：密钥位置与脱敏清单见 `docs/SECURITY.md`。

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 本地开发
pnpm build            # 静态构建（自动准备并子集化中文字体）
pnpm check            # astro check：类型与内容 schema
pnpm lint             # ESLint
pnpm format           # Prettier 写入
pnpm test             # Vitest 结构测试
pnpm fonts            # 仅准备字体（构建已内置，一般不需要单独跑）
node scripts/verify-dist.mjs        # 构建产物的浏览器断言
node scripts/verify-prototypes.mjs  # 三个原型的浏览器断言
```

> `verify:*` 脚本需要 Playwright。本机可用：`PLAYWRIGHT_DIR=/tmp/mosaic/node_modules node scripts/verify-dist.mjs`。

## 目录地图

```text
docs/                     规则、需求、设计文档、执行计划、产品规格
  design-docs/            架构与设计信念（含动效能力边界）
  exec-plans/active/      活跃计划；completed/ 归档
  product-specs/          按领域切分的产品规格
  generated/              生成产物（截图等，不手工编辑，不入库）
godfather-trilogy-notes-v4/  旗舰笔记素材（Markdown + 80 张影像）
prototypes/               已验收的原型（闸门已过，作参考不作依赖）
src/{types,config,repo,service,runtime,components,layouts,pages,styles}/
public/                   静态资源（字体由 scripts/ 生成，不入库）
tests/structure/          结构测试
scripts/                  构建与验证脚本
```

## 工作纪律

- 提交遵循 Conventional Commits，单一职责；末次提交注明 `[已测试]` 或 `[未测试]`。
- 每轮追加 `prompt-history.txt`（不提交），格式见 Harness §7.3。
- 视觉与动效决策先加载 `frontend-design` 与 `emil-design-eng` 技能，禁止生成式设计反模式。
- 交付前做截图自审，并验证响应式、键盘焦点与 `prefers-reduced-motion` 降级。
- **「不报错」不等于「在工作」**：动画与资源引用必须验证计算值或产物内容，并**故意写错一次确认检查会真失败**。
