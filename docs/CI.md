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
5. **构建门禁**：`pnpm build` 必须成功，且字体自检通过（引用的 woff2 真实存在于 `dist/`）。
6. **CI 骨架**：`.github/workflows/ci.yml` 执行安装 → 校验版本一致性 → 格式化检查 → lint → 类型检查 → 结构测试 → 构建 → 上传产物；不包含桌面安装包打包任务。

> Pagefind 全文搜索尚未接入（`package.json` 无该依赖，构建脚本未调用）。这是产品规格 `docs/product-specs/search.md` 的待办，登记为技术债 D8，**尚未成为门禁**。

## 当前状态

原型审批闸门（`docs/requirements.md` §5.4）**已通过**（用户 2026-10-11 确认方向 γ）。Astro 工程与全部门禁脚本已落地。

**验证方式**：以下结果全部在 `git clone` 出的干净副本中复跑取得（不是在工作区里跑的），因为 CI 与 Cloudflare 面对的都是干净检出。

| 命令                             | 状态                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | 通过，960ms                                               |
| `pnpm format:check`              | 通过，`All matched files use Prettier code style!`        |
| `pnpm lint`                      | 通过（退出码 0）                                          |
| `pnpm check`                     | `Result (11 files): 0 errors / 0 warnings / 0 hints`      |
| `pnpm test`                      | `Test Files 2 passed (2)`、`Tests 11 passed (11)`         |
| `pnpm build`（本机字体）         | 通过，产物 868 KB                                         |
| `pnpm build`（强制下载字体）     | 通过，含字体下载共 **34 秒**，产物与上者一致              |
| `node scripts/verify-dist.mjs`   | 8 项断言全部通过，`errors` 全为 0、`hOverflow` 全为 false |

`verify-dist.mjs` 的输出表里 `pct` 与 `ruleScale` 两列恒为空串——这是脚本自身的缺陷，不影响它已断言的 8 项。登记为技术债 D9。

### 构建链路的三个特殊点

1. **字体不入库**（42 MB）。`pnpm build` 内部先跑 `scripts/fetch-fonts.mjs`：按序查 `--from` 参数、`/mnt/c/Windows/Fonts`、`~/.fonts`、`/usr/share/fonts/truetype/noto`，都找不到则从 `notofonts/noto-cjk` 官方仓库下载（超时 180s、体积下限 1 MB 校验）。**字体缺失时构建硬失败**，因为继续会产出指向不存在字体的引用（实测过的静默失败，见 `RELIABILITY.md` §2）。
   - 下载分支已实测：清空本机候选目录后仍能取得 **25125232 字节**的 `NotoSerifSC-VF.ttf` 与 **17773132 字节**的 `NotoSansSC-VF.ttf`，与上游 `Content-Length` **逐字节一致**（不是 LFS 指针、不是错误页）。
   - 本机（WSL）会在第一步命中 `/mnt/c/Windows/Fonts`，因此本机开发是纯复制、不走网络；只有 CI 与 Cloudflare 会走下载。
2. **字体子集化**：构建后 `scripts/subset-fonts.mjs` 按实际字符集裁剪（24 MB → 134 KB），并自检「引用的 woff2 是否真实存在于 `dist/`」。
3. **临时文件不入库**：`docs/generated/`、`prototypes/shots/`、`public/*.ttf`、`prompt-history.txt` 均在 `.gitignore` 内，由脚本复跑重建。

### Cloudflare 构建环境的版本对齐

Cloudflare Pages 默认使用 **v3 构建系统**（Ubuntu 22.04、x86_64、gVisor 容器）。三个版本来源在 v3 下的行为**不一致**，必须区分对待：

| 项        | CF v3 默认值 | 从何处读取                       | 本项目取值              | 是否需要额外配置  |
| --------- | ------------ | -------------------------------- | ----------------------- | ----------------- |
| Node.js   | 22.16.0      | `.nvmrc` / `.node-version` ✅    | `.nvmrc` = `22.12.0`    | 否，会自动读取    |
| pnpm      | 10.11.1      | `pnpm-lock.yaml` ❌ **不检测**   | `packageManager` 字段   | 否，corepack 生效 |
| pnpm 兜底 | —            | `package.json` engines ❌ 不检测 | `engines.pnpm: >=7.1.0` | —                 |

关键事实：v3 文档明确列出**不支持**「Detecting pnpm version detection based `pnpm-lock.yaml` file version」与「Detecting Node.js and package managers from `package.json` -> `"engines"`」。因此 pnpm 版本**只能**靠 `package.json` 的 `packageManager: "pnpm@10.30.3"` 字段（corepack 据此切换），lockfile 版本与 engines 都不起作用。

> 若构建日志显示 pnpm 用的是 10.11.1 而非 10.30.3，在 Pages 项目里加环境变量 `PNPM_VERSION=10.30.3`。**这一点尚未在真实 Cloudflare 构建中验证**——首次部署后应检查构建日志确认。

**已实测的 CF 镜像时间表**：v1 镜像 2026-09-15 自动迁 v3；v2 镜像 2027-02-23 自动迁 v3。本项目新建，直接落在 v3。

## 部署：GitHub → Cloudflare Pages

**选定方案：Git 集成**（Cloudflare Pages 直连 GitHub 仓库）。

| 项       | 值                                                                       |
| -------- | ------------------------------------------------------------------------ |
| 仓库     | `https://github.com/iheee-google/DeepSeek_web`（已创建并推送）           |
| 生产分支 | `main`                                                                   |
| 构建命令 | `pnpm build`                                                             |
| 输出目录 | `dist`                                                                   |
| 域名     | `iheee.xyz`（已绑定并生效，HTTPS 正常）                                  |
| 适配器   | **不需要** `@astrojs/cloudflare`（该适配器只用于 SSR，本项目为静态输出） |
| 部署配置 | `wrangler.jsonc`（**必须存在**，理由见下）                               |

**能力**（已核对 Cloudflare 官方文档）：push 自动构建部署；自定义分支生成预览 URL 且不影响生产；PR 内显示预览链接；构建状态回写 Git 仓库；可用 commit message 跳过构建。

**限制**：官方文档明确「If you deploy using the Git integration, you cannot switch to Direct Upload later.」——选定 Git 集成后不能改为直传（可关闭自动部署后改用 Wrangler，但那是另一条路径）。

### 🔴 `wrangler.jsonc` 不是可选配置，是安全开关

Cloudflare 的部署命令是 `npx wrangler deploy`。**仓库里若没有 wrangler 配置**，wrangler 在非交互环境下会自动执行 `astro add cloudflare`：注入适配器、改写 `package.json` 与 `astro.config.mjs`，然后**用适配器再构建一次**（所有确认提示都取默认值，日志里只留下一行 `Configuring project for Astro`）。

后果与完整分析见 [`RELIABILITY.md`](./RELIABILITY.md) 的「线上跑的构建和 CI 验证的构建不是同一个」。一句话概括：**CI 验证扁平 `dist/`，线上跑带适配器的 `dist/client/`，两边产物不同，本地永远测不出来。**

因此 `wrangler.jsonc` 的内容刻意保持最小（assets-only）：

```jsonc
{
  "name": "deepseek-web",
  "compatibility_date": "2026-10-06",
  "assets": { "directory": "./dist" },
}
```

**不要加 `main` 或 `assets.binding`** —— 实测报错 `Cannot use assets with a binding in an assets-only Worker`。若将来真需要 SSR，再显式引入适配器并同步改这个文件（那应是一次有意识的决策，而不是平台替我们做的）。

**验证方式**：`npx wrangler@4 deploy --dry-run`，输出应形如 `✨ Read N files from the assets directory .../dist` 且**全程不出现 `astro add`**。这条已由 `tests/structure/deploy.test.ts` 钉住。

## 变更历史

| 日期       | 变更                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-10-11 | 首次判定为"其他类型（Web 静态站点）"，明确跳过 Tauri 三问，记录技术栈与门禁计划                             |
| 2026-10-11 | 工程落地：门禁全绿，记录构建链路三个特殊点与 GitHub → Cloudflare Pages 部署方案                             |
| 2026-10-11 | 门禁结果改为在干净克隆中复跑取得；补节点/pnpm 版本对齐表与强制下载字体的逐字节校验数据                      |
| 2026-10-11 | 站点上线（`iheee.xyz` 200）；记录 `wrangler.jsonc` 为必需配置 —— 无它则 wrangler 会擅自注入适配器并二次构建 |
