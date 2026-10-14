# 接入 Cloudflare 生产构建与迁移

## Background Facts

- Cloudflare 截图确认当前项目使用 Workers Builds：构建命令为 `pnpm run build`，部署命令为 `npx wrangler deploy`，根目录为 `/`。
- 旧 GitHub 仓库 `iheee-google/DeepSeek_web` 是 Astro + React + pnpm 项目，旧构建输出 `dist/`，并已有 assets-only `wrangler.jsonc`。
- 当前目录是原生 HTML/CSS/JavaScript 项目，内容链路为 `content/godfather-trilogy-notes-v4.md` → `scripts/build-content.cjs` → `assets/data/archive.js`；`package.json` 目前没有生产 `build` 脚本，只有 `build:content`、`preview` 和测试脚本。
- 当前目录没有配置远程 Git remote，当前分支是 `master`；本任务不推送 GitHub、不覆盖远程历史、不触发生产部署。
- 当前预览服务只允许 `index.html`、`notes.html` 和 `assets/`，但该安全边界不会自动成为 Wrangler 生产响应头或发布目录规则。

## Goal

为当前原生档案站建立可复现、可审计的生产构建：生成受限的 `dist/` 静态资源目录，并让现有 Cloudflare Workers Builds 配置可以在后续推送后用 Wrangler 部署到原有域名，而不公开源码目录。

## In Scope

- 增加 `npm run build` 生产构建入口。
- 构建时先生成最新 `assets/data/archive.js`，再清理并生成 `dist/`。
- 只把 `index.html`、`notes.html` 和 `assets/` 复制到 `dist/`。
- 增加或同步 assets-only `wrangler.jsonc`，指向 `./dist`，不引入 Astro、React、Worker `main` 或 binding。
- 生成 Cloudflare Workers Static Assets 支持的 `_headers`，保留 CSP、frame、MIME、referrer 等安全响应头。
- 将 Cloudflare 构建命令改为 `npm run build` 的本地配置说明；部署命令 `npx wrangler deploy` 和根目录 `/` 保持不变，但本任务不修改 Cloudflare 控制台。
- 增加发布目录内容边界检查，并执行构建、Wrangler dry-run、现有 Playwright 和语法检查。

## Out of Scope

- 不迁移 Astro、React、TypeScript 或现有档案页面结构。
- 不修改原始 Markdown、图片、`notes.html` 内容、域名 DNS 或 Cloudflare 生产设置。
- 不执行 `git push`、强制推送、远程仓库覆盖、Wrangler 正式部署或域名切换。
- 不把仓库根目录、`content/`、`scripts/`、`.trellis/`、测试文件或 `package.json` 作为公开发布目录。
- 不为当前站点新增移动端功能或重新设计页面。

## Requirements

1. 生产构建必须从当前内容源重新生成 archive 数据，不能依赖手工修改生成文件。
2. `dist/` 必须是干净目录，只包含网站运行所需的两个 HTML 入口、`assets/`、`_redirects` 和 `_headers`；源 Markdown、构建脚本和开发配置不得进入发布目录。
3. Wrangler 配置必须使用 `assets.directory: "./dist"` 的 assets-only 形态，并设置 `assets.html_handling: "none"` 保留现有 `.html` 稳定入口；不添加 `main` 或 `assets.binding`。
4. 发布响应头必须覆盖静态资源安全基线；本地预览和生产发布的边界都要能被验证。
5. 当前已有首页、全文页、图片查看器、搜索、规则、史实和时间轴回归不能因新增构建入口而退化。
6. 所有工作停留在本地代码和提交层面，远程推送需另行明确授权。

## Acceptance Criteria

- [x] `npm run build` 在当前依赖环境中成功，并生成最新 archive 数据与 `dist/`；构建输出为 10 章、44 人物、14 时间节点、12 符号、80 张影像。
- [x] 从提交 `4c27099` 进行纯 `git archive` 临时干净检出（未叠加工作区文件），执行 `npm ci --ignore-scripts --include=dev` 后再次通过 `npm run build` 和发布目录校验。
- [x] `dist/` 内容清单符合 allowlist：包含 `index.html`、`notes.html`、`assets/`、`_redirects`、`_headers`，不包含 `content/`、`scripts/`、`.trellis/`、测试、包配置或 `.git`。
- [x] `wrangler.jsonc` 指向 `./dist`，设置 `html_handling: "none"`；`npx wrangler@4 deploy --dry-run` 读取 99 个资源并退出，没有 Astro 配置注入或二次构建。
- [x] `_headers` 包含 CSP、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy` 和 `Permissions-Policy` 声明。
- [x] `npm test` 的 6 项回归、脚本和测试文件语法检查、发布目录检查、任务校验和 `git diff --check` 通过。
- [x] Wrangler 本地生产 smoke 验证 `/`、`/notes.html` 和 archive 资源为 200，源码/部署元文件为 404，安全响应头实际返回。
- [x] 现有本地预览、页面入口和生成数据计数保持有效；未执行远程部署，不声称域名已替换。

## Open Questions

None blocking. Cloudflare 配置截图已确定采用 Workers Builds + Wrangler；本任务明确只做本地准备和验证。
