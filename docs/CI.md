# CI 与自动化门禁

## 框架判定

| 项目                                | 结论                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| 判定结果                            | **其他类型（Web 静态站点）**                                                          |
| 判定时间                            | 2026-10-11                                                                            |
| 判定方式                            | 交互确认（用户明确选择 Astro + React islands + TypeScript + pnpm → Cloudflare Pages） |
| 是否适用 Tauri 三问（Harness §3.4） | **不适用，明确跳过**（Harness §3.5）                                                  |
| 交付物形态                          | 静态站点，`astro build` 输出 `dist/`，部署到 Cloudflare Pages                         |

判定依据：本项目是内容型个人网站，产物为静态 HTML/CSS/JS 与预构建搜索索引，不存在需要打包为桌面安装包的 Runtime；仓库内 `cargo` 命令不存在，也不满足 Tauri 工具链前置条件。因此不生成 `.github/workflows/` 下的桌面打包流水线。

## 交互确认记录

| 决策项       | 用户结论                                                    | 时间       |
| ------------ | ----------------------------------------------------------- | ---------- |
| 目标平台形态 | Web 静态站点（Cloudflare Pages）                            | 2026-10-11 |
| 语言         | TypeScript                                                  | 2026-10-11 |
| 框架         | Astro + React islands                                       | 2026-10-11 |
| 包管理器     | pnpm                                                        | 2026-10-11 |
| 构建方式     | Astro 静态构建 → `dist/` → Pagefind 索引 → Cloudflare Pages | 2026-10-11 |
| Tauri 三问   | 跳过（非 Tauri 项目）                                       | 2026-10-11 |

## 落地说明

即使判定为非 Tauri 项目，仍建立与保留以下门禁（Harness §3.5）：

1. **格式化**：Prettier 统一代码与 Markdown 格式。
2. **Lint**：ESLint + `eslint-plugin-astro` + `typescript-eslint`；所有自定义规则报错必须内嵌修复指令（Harness §6.2）。
3. **类型检查**：`astro check` 做全量 TypeScript 与内容 schema 校验。
4. **结构测试**：用 Vitest 断言仓库不变量（见 `tests/structure/`），例如文档必填节、内容 front matter 契约、依赖方向、文件大小限制。
5. **构建门禁**：`pnpm build` 必须成功，且构建后 Pagefind 索引可生成。
6. **CI 骨架**：`.github/workflows/ci.yml` 执行安装 → 格式化检查 → lint → 类型检查 → 结构测试 → 构建；不包含桌面安装包打包任务。

## 当前状态

原型审批闸门（`docs/requirements.md` §5.4）**已通过**（用户 2026-10-11 确认方向 γ）。Astro 工程与全部门禁脚本已落地，本地全绿。

| 命令                           | 状态                                            |
| ------------------------------ | ----------------------------------------------- |
| `pnpm format:check`            | 通过                                            |
| `pnpm lint`                    | 通过（退出码 0）                                |
| `pnpm check`                   | `Result (10 files): 0 errors`                   |
| `pnpm test`                    | `Test Files 1 passed (1)`、`Tests 6 passed (6)` |
| `pnpm build`                   | 通过，产物 868 KB                               |
| `node scripts/verify-dist.mjs` | 8 项断言全部通过                                |

### 构建链路的三个特殊点

1. **字体不入库**（42 MB）。`pnpm build` 内部先跑 `scripts/fetch-fonts.mjs`：按序查 `--from` 参数、`/mnt/c/Windows/Fonts`、`~/.fonts`、`/usr/share/fonts/truetype/noto`，都找不到则从 `notofonts/noto-cjk` 官方仓库下载（超时 180s、体积下限 1 MB 校验）。**字体缺失时构建硬失败**，因为继续会产出指向不存在字体的引用（实测过的静默失败，见 `RELIABILITY.md` §2）。
2. **字体子集化**：构建后 `scripts/subset-fonts.mjs` 按实际字符集裁剪（24 MB → 134 KB），并自检「引用的 woff2 是否真实存在于 `dist/`」。
3. **临时文件不入库**：`docs/generated/`、`prototypes/shots/`、`public/*.ttf`、`prompt-history.txt` 均在 `.gitignore` 内，由脚本复跑重建。

## 部署：GitHub → Cloudflare Pages

**选定方案：Git 集成**（Cloudflare Pages 直连 GitHub 仓库）。

| 项       | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 仓库     | `https://github.com/iheee-google/DeepSeek_web`（待用户创建后填入）       |
| 生产分支 | `main`                                                                   |
| 构建命令 | `pnpm build`                                                             |
| 输出目录 | `dist`                                                                   |
| 域名     | `iheee.xyz`（用户已托管 Cloudflare）                                     |
| 适配器   | **不需要** `@astrojs/cloudflare`（该适配器只用于 SSR，本项目为静态输出） |

**能力**（已核对 Cloudflare 官方文档）：push 自动构建部署；自定义分支生成预览 URL 且不影响生产；PR 内显示预览链接；构建状态回写 Git 仓库；可用 commit message 跳过构建。

**限制**：官方文档明确「If you deploy using the Git integration, you cannot switch to Direct Upload later.」——选定 Git 集成后不能改为直传（可关闭自动部署后改用 Wrangler，但那是另一条路径）。

## 变更历史

| 日期       | 变更                                                                            |
| ---------- | ------------------------------------------------------------------------------- |
| 2026-10-11 | 首次判定为"其他类型（Web 静态站点）"，明确跳过 Tauri 三问，记录技术栈与门禁计划 |
| 2026-10-11 | 工程落地：门禁全绿，记录构建链路三个特殊点与 GitHub → Cloudflare Pages 部署方案 |
