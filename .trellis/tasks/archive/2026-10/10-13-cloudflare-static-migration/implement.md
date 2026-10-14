# Implementation Plan: Cloudflare 原生静态构建迁移

## Ordered Work

1. 读取 frontend spec、当前 package 和 Cloudflare 旧仓库部署资料；确认不触碰 Astro/React 迁移、不推送远程、不修改 Cloudflare 控制台。
2. 新增 `scripts/build-deploy.cjs`：调用内容生成器、清理 `dist/`、复制公开 allowlist，并生成 `dist/_redirects` 与 `dist/_headers`。
3. 新增 `scripts/verify-deploy.cjs`：检查发布目录清单、禁止源码路径和安全头关键字。
4. 在 `package.json` 增加 `build` 与 `verify:deploy` 脚本；在 `.gitignore` 忽略 `dist/`；新增 assets-only `wrangler.jsonc` 指向 `./dist`，并设置 `html_handling: "none"` 保持 `/notes.html` 路由。
5. 在本地执行 `npm run build`，检查生成数据数量、发布目录文件清单和 `_headers` 内容。
6. 在本地执行 `npm run verify:deploy` 与 `npx wrangler@4 deploy --dry-run`；确认 dry-run 只读取 `dist/`，不注入 Astro 配置、不进行二次构建；确认 `npm run build` 自身也会自动阻断不合规发布目录。
7. 从当前 `HEAD` 导出临时干净检出，执行 `npm ci --ignore-scripts --include=dev`、`npm run build` 和 `npm run verify:deploy`，记录干净依赖环境结果；不修改当前工作区依赖树。
8. 启动 `wrangler dev --local` 做本地生产产物 smoke：检查 `/`、`/notes.html`、`/assets/data/archive.js` 的 200 响应与安全头，并确认 `/content/...`、`/scripts/...`、`/_headers` 不公开；测试结束后只停止本次启动的本地进程。
9. 运行现有验证：
   - `node --check scripts/build-content.cjs`
   - `node --check scripts/build-deploy.cjs`
   - `node --check scripts/verify-deploy.cjs`
   - `node --check assets/js/image-viewer.js`
   - `npm test`
   - `git diff --check`
10. 检查 diff 和 Git 状态，确认没有改动原 Markdown、图片、`notes.html` 内容或预先存在的未跟踪 scaffold；不执行 `git push`、`wrangler deploy` 正式部署或远程覆盖。
11. 按用户已授权的项目规则直接提交本地任务改动；提交后由 advisor 做最终审阅。
12. 取得归档确认后归档 Trellis 任务；最终报告只声明本地构建准备完成，不声明线上已替换。

## Validation Matrix

| Area | Observable check |
|---|---|
| Build | `npm run build` 成功，重新生成 archive 数据并创建干净 `dist/` |
| Publish boundary | `dist/` 只有入口 HTML、`assets/`、Cloudflare 元文件 `_redirects`/`_headers`，禁止源码/配置/任务目录 |
| Wrangler | `wrangler.jsonc` 为 assets-only 且 dry-run 成功，无 Astro 注入或二次构建 |
| Security | `_headers` 含 CSP、frame、MIME、referrer 和 permissions 策略 |
| Regression | 现有 Playwright、JS 语法和 diff 检查通过 |
| Scope | 原文、图片、页面内容、远程仓库、Cloudflare 控制台和 DNS 无改动 |

## Review Gates

- 不新增 Astro、React、TypeScript 或运行时依赖。
- 不把根目录 `/` 作为公开资产目录；`/` 仅代表构建工作目录。
- 不手工编辑 `assets/data/archive.js`。
- 不执行正式 Wrangler 部署、远程 push 或强制推送。
- 不把未跟踪 `.agents/`、`.pi/`、`.trellis` scaffold 或 `AGENTS.md` 带入任务提交。

## Rollback Points

- 构建脚本阶段：删除 `scripts/build-deploy.cjs`、`scripts/verify-deploy.cjs` 和 package script，页面源码不变。
- Wrangler 阶段：删除 `wrangler.jsonc` 与 `.gitignore` 的 dist 条目；不触碰远程 Worker。
- 提交前：用 `git diff --check` 和 scoped `git add` 阻止无关文件进入提交。
