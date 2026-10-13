# Design: 原生档案站 Cloudflare 生产构建

## Boundary

本任务只为当前原生 HTML/CSS/JavaScript 档案站增加可复现的静态发布产物，不把页面迁移到 Astro/React。源 Markdown、现有页面结构、图片资产和本地预览行为保持不变；远程 GitHub、Cloudflare 控制台、DNS 和正式部署不在本任务内。

## Build Pipeline

```text
content/godfather-trilogy-notes-v4.md
        │
        ▼ npm run build:content
assets/data/archive.js
        │
        ▼ scripts/build-deploy.cjs
        ├─ 清理 dist/
        ├─ 复制 index.html
        ├─ 复制 notes.html
        ├─ 复制 assets/
        └─ 写入 dist/_headers
        │
        ▼ npx wrangler deploy
wrangler.jsonc → assets.directory = ./dist
```

`package.json` 增加 `build` 与发布目录校验脚本，但不引入框架。`markdown-it` 仍作为构建所需依赖使用；构建验证必须在包含开发依赖的干净安装中执行。

## Publish Boundary

`scripts/build-deploy.cjs` 是唯一的生产打包入口：

- 先调用现有 `scripts/build-content.cjs`，确保生成数据来自原始 Markdown。
- 删除旧 `dist/` 后重新复制 allowlist，避免前一次构建遗留文件上线。
- 只复制 `index.html`、`notes.html` 和完整 `assets/`；不复制源码、测试、任务、包管理文件或 `.git`。
- 在 `dist/_headers` 写入 Cloudflare Workers Static Assets 支持的安全头规则。官方文档确认 assets-only 部署会解析该文件，并不会把 `_headers` 本身作为资源提供。

`dist/` 是可重建产物，不作为作者输入；加入 `.gitignore`，避免把本地产物误当成源代码提交。

## Wrangler Contract

保留旧项目已经验证的 assets-only 配置形态：

```jsonc
{
  "name": "deepseek-web",
  "compatibility_date": "2026-10-06",
  "assets": {
    "directory": "./dist"
  }
}
```

不设置 `main` 或 `assets.binding`，避免把静态资产部署变成需要 Worker 入口的模式。Cloudflare Workers Builds 的面板配置目标为：

- 构建命令：`npm run build`
- 部署命令：`npx wrangler deploy`
- 根目录：`/`

本地只执行 `npx wrangler@4 deploy --dry-run` 或等价的 dry-run 检查；不执行正式部署。

## Security and Compatibility

- 生产发布目录和本地预览 allowlist 使用同一组公开入口，避免根目录源码暴露。
- `_headers` 声明 `Content-Security-Policy`、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy` 和 `Permissions-Policy`；CSP 允许当前页面已有的内联脚本/样式、同源图片和本地字体，不放行外部 CDN。
- 保留现有首页和全文页稳定路径；`archive.js` 继续由生成器生成。
- `wrangler.jsonc` 中的 Worker 名称保持 `deepseek-web`，以便后续在确认远端资源对应关系后沿用现有域名绑定；本任务不证明绑定当前仍然有效。

## Verification

发布目录校验脚本检查：

1. 必须存在 `index.html`、`notes.html`、`assets/`、`_headers`。
2. 禁止存在 `content/`、`scripts/`、`.trellis/`、`tests/`、`.git/`、`package.json` 等顶层公开路径。
3. `_headers` 必须包含安全头关键字。
4. `assets/data/archive.js` 必须存在且包含预期生成数据。

然后运行现有 `npm test`，确认生产构建入口不会改变浏览器行为。

## Trade-offs and Rollback

- 选择静态 staging 而不是直接发布根目录，增加一次复制步骤，但阻断源码泄露风险。
- 选择原生 `npm` 而不是保留旧 `pnpm` 命令，减少当前项目与旧 Astro 锁文件/脚本的耦合；Cloudflare 控制台只在后续推送前改构建命令。
- 回滚只需删除本次新增构建脚本、`wrangler.jsonc`、发布校验和 package 脚本改动；原始页面和生成数据链路不受影响。
