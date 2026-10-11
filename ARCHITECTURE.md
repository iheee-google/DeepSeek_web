# ARCHITECTURE.md

## 系统概览

本项目是一个内容驱动的个人网站：作品集 + 长期笔记空间。构建期把仓库内 Markdown 内容编译为静态 HTML，并在构建后生成全文搜索索引，最终部署到 Cloudflare Pages。

```text
Markdown 内容（作品 / 笔记 / 简历）
        │
        ▼
Astro Content Collections（边界 schema 校验）
        │
        ├─▶ 静态页面（Astro 组件）
        └─▶ 交互岛（React islands：主题、搜索、动效）
        │
        ▼
astro build → dist/ → Pagefind 索引 → Cloudflare Pages
```

## 目录职责

| 路径                                            | 职责                                           | 依赖                |
| ----------------------------------------------- | ---------------------------------------------- | ------------------- |
| `src/types/`                                    | 领域类型与内容 schema 定义                     | 无                  |
| `src/config/`                                   | 站点配置、导航、locale 与常量                  | Types               |
| `src/content/`                                  | Markdown 内容与 Content Collections 配置       | Types, Config       |
| `src/repo/`                                     | 内容读取与查询（集合访问、排序、过滤 `draft`） | Types, Config       |
| `src/service/`                                  | 业务逻辑（搜索索引构建、内容关联、i18n 解析）  | Types, Config, Repo |
| `src/runtime/`                                  | 页面渲染期装配（路由、布局、Providers 注入）   | 以上全部            |
| `src/components/`、`src/layouts/`、`src/pages/` | UI 与路由出口                                  | Runtime             |

依赖方向严格单向：`Types → Config → Repo → Service → Runtime → UI`。低层不得引用高层。

## 横切关注点

主题（明暗）、国际化、搜索、动效降级统一经由 **单一 Providers 接口**注入，UI 不直接读取环境或全局变量。这是 Harness §5 的强制约束，用于避免关注点散落。

## 内容模型

- Markdown 通过 Astro Content Collections 建模，front matter 用 zod schema 在边界校验（Harness §6 T4）。
- 每项内容标记 `draft` 或 `published`；只有 `published` 生成公开页面并进入搜索索引。
- 笔记字段包含日期、分类、标签；项目字段包含问题、职责、技术、成果、截图、仓库与演示链接。
- 中英文内容使用稳定 locale 路由，并用可校验的关联字段连接同一内容的两种语言版本。

## 渲染策略

- 内容页面默认静态输出（零客户端 JS）。
- 只有确实需要浏览器状态的区域使用 React island，并显式选择 hydration 策略（`client:visible` 优先，避免 `client:load` 拖累首屏）。
- 动效优先使用 CSS，必要时用 WAAPI；不得为动效引入重量级运行时。

## 性能与可访问性预算

- 首屏不加载非关键 JS；island 按需水合。
- 影像素材必须生成响应式尺寸与懒加载，非首屏影像不进入关键路径。
- 交互元素具备可见键盘焦点；尊重 `prefers-reduced-motion`，降级为更少更温和的过渡而非完全移除。
- 颜色对比度满足 WCAG AA。

## 已知约束

- **原型审批闸门**：正式实现前必须先通过独立 HTML 原型验收（`docs/requirements.md` §5.4）。
- 框架判定为"其他类型（Web 静态站点）"，无桌面打包流水线（`docs/CI.md`）。
- `godfather-trilogy-notes-v4/` 为旗舰公开内容，含 77 张影像素材，需纳入影像优化管线。

## 相关文档

- `docs/design-docs/core-beliefs.md`：技术栈与视觉方向决策
- `docs/CI.md`：门禁与自动化
- `docs/exec-plans/active/`：当前执行计划
