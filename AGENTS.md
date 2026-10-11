# AGENTS.md

个人网站项目：作品集 + 长期笔记空间。Astro + React islands + TypeScript + pnpm，静态输出部署 Cloudflare Pages。

## 先读什么

| 文件                               | 用途                               |
| ---------------------------------- | ---------------------------------- |
| `docs/HARNESS-RULES.md`            | 强制工程规则。施工期不得删改或精简 |
| `docs/requirements.md`             | 需求与已确认决策（§5）             |
| `docs/design-docs/core-beliefs.md` | 技术栈、视觉方向、架构约束         |
| `docs/CI.md`                       | 框架判定与自动化门禁               |
| `docs/exec-plans/active/`          | 当前执行计划、决策日志与进度       |
| `ARCHITECTURE.md`                  | 目录职责与依赖方向                 |

## 硬约束

- **原型审批闸门**：正式 Astro 前端实现前，必须先交付 `prototypes/` 下的独立 HTML 原型并通过用户验收（`docs/requirements.md` §5.4）。
- **技术栈不得擅自变更**：五项结论以 `docs/design-docs/core-beliefs.md` 为准；变更须用户确认并同步该文件。
- **框架判定**：本仓库为"其他类型（Web 静态站点）"，已跳过 Tauri 三问，不生成桌面打包流水线（`docs/CI.md`）。
- **禁止复用 `../personal-website/`**：该项目已被用户判定失败作废，其原型、截图与设计结论一律不得复制。
- **依赖方向单向**：`Types → Config → Repo → Service → Runtime → UI`，横切关注点只经 `Providers` 进入（Harness §5）。
- **边界解析数据形状**：Markdown front matter 一律经 schema 校验，禁止直接假设字段存在。
- **`draft` 不公开**：仅 `published` 内容生成页面并进入搜索索引。

## 常用命令

```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发
pnpm build        # 静态构建（含 Pagefind 索引）
pnpm check        # astro check：类型与内容 schema
pnpm lint         # ESLint
pnpm format       # Prettier 写入
pnpm test         # Vitest 结构测试
```

> 工程尚未初始化（原型闸门未通过），以上命令在 Astro 骨架落地后可用。

## 目录地图

```text
docs/                     规则、需求、设计文档、执行计划
  design-docs/            架构与设计信念
  exec-plans/{active,completed}/  执行计划与归档
  product-specs/          产品规格
  references/             外部参考资料
  generated/              生成产物（不手工编辑）
godfather-trilogy-notes-v4/  旗舰笔记素材（Markdown + 77 张影像）
prototypes/               原型与验收工件（含 assets/）
src/                      Astro 源码（待创建）
tests/structure/          结构测试（待创建）
```

## 工作纪律

- 提交遵循 Conventional Commits，单一职责；末次提交注明 `[已测试]` 或 `[未测试]`。
- 每轮追加 `prompt-history.txt`（不提交），格式见 Harness §7.3。
- 视觉与动效决策依据 `frontend-design` 与 `emil-design-eng` 技能规则，禁止生成式设计反模式。
- 交付前做截图自审，并验证响应式、键盘焦点与 `prefers-reduced-motion` 降级。
