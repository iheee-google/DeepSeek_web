# 执行计划：打通 GitHub → Cloudflare Pages 自动部署

**状态**：进行中（GitHub 侧已完成；等用户在 Cloudflare 创建 Pages 项目）
**创建日期**：2026-10-11
**负责人**：用户（仓库创建、授权）+ 智能体（本地准备、验证、文档）
**关联**：`docs/CI.md`「部署：GitHub → Cloudflare Pages」、`docs/requirements.md` §5.3、用户 m01305

## 目标

用户 push 代码到 GitHub 后，Cloudflare Pages 自动构建并部署到 `iheee.xyz`，无需手工上传。

**可行性结论：可行，且是 Cloudflare Pages 的标准用法。** 本文档记录已完成的本地准备、用户需要执行的步骤、以及每一步的验证方式。

## 为什么必须先有 GitHub 仓库

Cloudflare Pages 的 Git 集成要求先在 GitHub 上存在仓库，才能授权 Cloudflare 访问并选择它。**这一步无法由智能体代劳**：需要用户的 GitHub 账号授权（OAuth），且本机**没有任何推送凭据**（实测：`gh` 未安装、`credential.helper` 未配置、`~/.ssh/id_*` 不存在）。

## 智能体已完成的本地准备

| 项           | 状态                                             | 说明                                                                   |
| ------------ | ------------------------------------------------ | ---------------------------------------------------------------------- |
| git 仓库     | 已初始化                                         | 5 个提交，已推送 `main` 到 GitHub                                      |
| 分支名       | 已改为 `main`                                    | CI 与 Cloudflare 都默认监听 main；原为 `master`                        |
| git 身份     | 已配置                                           | `user.name=iheee`、`user.email=2100918674@qq.com`                      |
| Node 版本    | `.nvmrc` = 22.12.0                               | Cloudflare v3 镜像会读这个文件                                         |
| pnpm 版本    | `package.json` 的 `packageManager: pnpm@10.30.3` | v3 不从 lockfile 检测 pnpm 版本，只能靠这个字段                        |
| 构建命令     | `pnpm build` 一条足够                            | 内部含字体准备 → astro build → 子集化 → 自检                           |
| 输出目录     | `dist`                                           | Astro 静态输出                                                         |
| 字体         | 不入库，构建时下载                               | 42 MB；已在干净克隆中实测下载分支，字节与上游一致                      |
| CI 工作流    | `.github/workflows/ci.yml`                       | 已写好，含 artifact 上传                                               |
| `.gitignore` | 已就位                                           | 排除 `dist/`、`node_modules/`、`public/*.ttf`、`prompt-history.txt` 等 |

**全部门禁已在干净 `git clone` 副本中复跑通过**（不是在工作区里跑的）：`install` / `format:check` / `lint` / `check` / `test`(11 项) / `build` / `verify-dist`(8 项断言)，退出码全为 0。含字体下载的完整构建耗时 34 秒。

## 用户需要执行的步骤

### 第 1 步：在 GitHub 创建空仓库 —— ✅ 已完成

> 仓库已存在且为 **Public**，默认分支 `main`。以下为当时的操作记录，保留供参考。

1. 打开 <https://github.com/new>
2. **Repository name**：`DeepSeek_web`（必须与本地目录名一致，或后续改 remote 地址）
3. **Owner**：`iheee-google`
4. **Public / Private 都可以**。Cloudflare Pages 对私有仓库的支持需要额外授权 GitHub App，但同样可行。**若不确定，选 Public 最省事。**
5. **不要**勾选 "Add a README file"、"Add .gitignore"、"Choose a license" —— 本地已有提交，勾选会造成两边历史分叉，push 时被拒。
6. 点 **Create repository**。

> 实测确认：`https://github.com/iheee-google` 存在（HTTP 200），`.../DeepSeek_web` 尚不存在（HTTP 404）。

### 第 2 步：关联并推送 —— ✅ 已完成（2026-10-11）

> 推送成功：`e4178e489668242385c7ed242ea157dd7fa957b3 refs/heads/main`。以下为操作记录。

创建后 GitHub 会显示仓库地址。在项目目录执行：

```bash
cd /home/iheee/code/web/DeepSeek_web

# 关联远程仓库
git remote add origin https://github.com/iheee-google/DeepSeek_web.git

# 推送（会提示输入 GitHub 用户名与密码）
git push -u origin main
```

**关于密码**：GitHub 从 2021 年起不再接受账号密码，`git push` 提示密码时要填 **Personal Access Token**（PAT），不是登录密码。

- 创建 PAT：<https://github.com/settings/tokens> → **Generate new token (classic)** → 生成后**立刻复制**（页面关闭后不再显示）。
- 权限勾选：**必须同时勾 `repo` 和 `workflow`**。原因见下面的实测记录。
- 输入时：用户名填 `iheee-google`，密码处粘贴 PAT。
- 想省去每次输入：`git config --global credential.helper store`（会以明文存在 `~/.git-credentials`，仅建议个人机器使用）。

#### 实测：只勾 `repo` 会被拒（2026-10-11）

```
! [remote rejected] main -> main (refusing to allow a Personal Access Token
  to create or update workflow `.github/workflows/ci.yml` without `workflow` scope)
```

GitHub 对 `.github/workflows/` 下的文件有**独立的权限门**：PAT 只有 `repo` 权限时可以推送普通代码，但**不能创建或更新 CI 工作流文件**。本项目仓库里有 `.github/workflows/ci.yml`，因此必须在同一个 token 上补勾 `workflow`。

**这次拒绝是原子的，没有丢东西**：远程仓库仍为空，本地 4 个提交、178 个文件、工作区全部完好。

修法（二选一）：

- **A. 给现有 token 补权限**（推荐）：<https://github.com/settings/tokens> → 点该 token → 勾上 **`workflow`** → **Update token**。HTTP 远程地址不变，重试即可。若系统缓存了旧凭据，先清掉：
  ```bash
  git config --global --unset credential.helper   # 若之前设过 store
  rm -f ~/.git-credentials                        # 清除已缓存的旧 token
  ```
- **B. 新建一个含 `repo` + `workflow` 的 token**，推送时用新的。

如果不想用 token，也可以改用 SSH（`git remote set-url origin git@github.com:iheee-google/DeepSeek_web.git`），SSH 密钥不受此限制——但本机当前**没有 SSH 密钥**，需要先生成并上传公钥。

**其它 push 被拒的情况**（提示 `non-fast-forward`）：说明第 1 步勾选了初始化文件，两边历史不一致。此时**不要**用 `git push -f`（会丢东西）。改用：

```bash
git pull --rebase origin main
git push -u origin main
```

**关于 CI 工作流与 Cloudflare 的关系**：这个报错**不影响 Cloudflare 部署**。`.github/workflows/ci.yml` 是 GitHub Actions 的门禁，Cloudflare 构建只读仓库代码、跑 `pnpm build`，不关心 Actions。但既然仓库里已有这个文件，推送时就必须解决它。

### 第 3 步：Cloudflare Pages 连接仓库

1. 打开 <https://dash.cloudflare.com/> → 左侧 **Workers & Pages** → **Create** → **Pages** 标签 → **Connect to Git**
2. 授权 Cloudflare 访问 GitHub（若只选单个仓库，授权页面可限定为 `DeepSeek_web`）
3. 选中 **`DeepSeek_web`** → **Begin setup**
4. 填写构建配置：

| 字段                   | 值                                                                        |
| ---------------------- | ------------------------------------------------------------------------- |
| Project name           | 任意，例如 `iheee-xyz`（决定 `xxx.pages.dev` 子域，**与自定义域名无关**） |
| Production branch      | `main`                                                                    |
| Framework preset       | **Astro**（会自动填好构建命令与输出目录；若没有该选项就选 None 并手工填） |
| Build command          | `pnpm build`                                                              |
| Build output directory | `dist`                                                                    |

5. **环境变量**：先留空，直接点 **Save and Deploy**。

   > 只有在构建日志显示 pnpm 版本不是 10.30.3 时，才回来加 `PNPM_VERSION=10.30.3`（原因见 `docs/CI.md` 的版本对齐表：CF v3 不从 lockfile 检测 pnpm 版本）。

6. 首次构建开始。**预期耗时 1–3 分钟**（其中约 34 秒是字体下载）。

### 第 4 步：绑定 iheee.xyz

#### 先理解这一步在做什么

部署成功后，网站**已经可以访问了**，但地址是 Cloudflare 分配的临时地址，形如：

```
https://<项目名>.pages.dev
```

这个地址能用、能分享，但它不是你的域名。**此刻 `iheee.xyz` 还指向空处**——实测确认：`iheee.xyz` 与 `www.iheee.xyz` 的 A 与 CNAME 记录**均为空**，即域名虽然托管在 Cloudflare（NS 为 `brady.ns.cloudflare.com` / `leanna.ns.cloudflare.com`），但没有任何记录告诉浏览器「访问这个域名时该去哪个服务器」。

**「绑定自定义域名」就是把这两件事接起来**：告诉 Cloudflare「当有人访问 `iheee.xyz` 时，把 Pages 项目的内容返回给他」。

#### 涉及的两个概念

| 概念           | 是什么                                       | 在这里的作用                                                                                                      |
| -------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **DNS 记录**   | 域名的「通讯录」条目，说明域名指向哪台服务器 | 添加一条记录，把 `iheee.xyz` 指向这个 Pages 项目                                                                  |
| **CNAME 记录** | 一种 DNS 记录，表示「别名」——「A 等于 B」    | `iheee.xyz` → 项目的 `pages.dev` 地址。用 CNAME 而不是写死 IP，是因为 Cloudflare 的边缘 IP 会变，CNAME 能自动跟随 |
| **SSL 证书**   | 让网站走 HTTPS（地址栏的锁图标）             | Cloudflare 自动签发并续期，免费，无需操作                                                                         |

#### 操作

1. 构建成功后，进 Pages 项目 → **Custom domains** 标签 → **Set up a custom domain**
2. 输入 `iheee.xyz` → 点继续
3. **如果域名已托管在同一个 Cloudflare 账号，它会自动添加 DNS 记录，不需要手工配置。**

   > 你的域名满足这个条件（已实测 NS 指向 Cloudflare），所以这一步应该是点几下就完成，不会出现「请去你的 DNS 服务商添加以下记录」的提示。
   >
   > 只有当域名托管在**别处**（比如阿里云、Namecheap）时，才需要手工去那边加记录。那种情况下 Cloudflare 会给你一条 CNAME 值让你复制过去。

4. `www.iheee.xyz` 是**可选的第二步**：再加一次自定义域名，输入 `www.iheee.xyz`。加完后 Cloudflare 通常会问要不要把 `www` 重定向到主域名——**建议选是**，这样两个地址都能打开，但搜索引擎只认一个，不会算作重复内容。

   > `iheee.xyz` 和 `www.iheee.xyz` 在技术上是两个不同的域名，需要分别添加。只加一个的话，另一个打不开。

5. 证书自动签发。**通常几分钟内生效**，极少数情况（DNS 传播慢）要等到几小时。

#### 生效后

绑定成功的标志：直接在浏览器输入 `https://iheee.xyz` 能打开网站，且地址栏是 HTTPS。

此后每次 push 到 `main`，Cloudflare 自动重新构建，`iheee.xyz` 上的内容随之更新——**这一步绑定只需要做一次**。

## 验证清单

首次部署后逐项确认：

- [x] GitHub 仓库页面的 **Actions** 标签出现一次成功运行（绿勾）—— 2026-10-11 已确认（见下）
- [ ] Cloudflare Pages 的**构建日志**里，字体下载步骤成功（出现 `取得 NotoSerifSC-VF.ttf` 而不是 `已有`）
- [ ] 构建日志里 pnpm 版本是 **10.30.3**
- [ ] 构建产物大小在 **1 MB 量级**（若看到 40+ MB，说明字体子集化没生效）
- [ ] `https://iheee.xyz` 能打开，**中文正常显示**（这是关键——字体链路任一环断了中文会整片消失，见 `docs/RELIABILITY.md`）
- [ ] 首屏五幕随滚动切换，标题滑入
- [ ] 手机打开正常，无横向滚动条
- [ ] 改一行代码 push，确认 Cloudflare **自动**重新构建（这是本次设置的核心目的）

## 已知风险与对策

| 风险             | 表现                       | 对策                                                                                                                  |
| ---------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 字体下载失败     | 构建失败并报「字体未就绪」 | 这是**故意设计的硬失败**（静默产出坏引用的教训见 `RELIABILITY.md`）。重试即可；持续失败则改用 GitHub Release 托管字体 |
| pnpm 版本不对    | 构建日志显示 10.11.1       | 加环境变量 `PNPM_VERSION=10.30.3`                                                                                     |
| 中文字体没生效   | 页面中文变方框/消失        | 检查构建日志的子集化步骤；确认 `dist/` 内有 `*-subset.woff2`                                                          |
| 私有仓库无法授权 | Pages 选不到该仓库         | 在 Cloudflare 的 GitHub App 设置里授予该仓库访问权，或把仓库改为 Public                                               |
| 构建超时         | 极少见                     | 字体已是最耗时环节（34s），正常不会触发                                                                               |

## 决策日志

| 日期       | 决策                              | 理由                                                                                                                                              |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-11 | 选 **Git 集成**而非 Direct Upload | 用户要的就是「push 后自动更新」；Direct Upload 需要自己写 CI 调 Wrangler API，多一层维护。**注意：选了 Git 集成后官方不允许回退到 Direct Upload** |
| 2026-10-11 | 不装 `@astrojs/cloudflare` 适配器 | 该适配器只用于 SSR；本项目静态输出，装了反而引入不必要的运行时                                                                                    |
| 2026-10-11 | 字体不入库、构建时下载            | 42 MB 入库会让每次 clone 都拉 42 MB，且字体可从官方仓库稳定取得。下载分支已实测字节一致                                                           |
| 2026-10-11 | `pnpm build` 做成一条命令         | 本地、CI、Cloudflare 三处配置完全相同，避免「本地能跑 CI 不能跑」                                                                                 |

## 进度日志

| 日期       | 进展                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-11 | 本地准备完成并验证：分支改 main、配置身份、写入 `.nvmrc`、CI 工作流、字体下载路径实测。**等待用户创建仓库**                                                                                                                                                    |
| 2026-10-11 | 用户首次推送被 GitHub 拒绝（PAT 缺 `workflow` scope，详见第 2 步下的实测记录）。拒绝是原子的，远程仓库仍为空，本地 4 个提交完好                                                                                                                                |
| 2026-10-11 | 用户补权限后**推送成功**：`e4178e489668242385c7ed242ea157dd7fa957b3 refs/heads/main`。仓库为 **Public**、默认分支 `main`                                                                                                                                       |
| 2026-10-11 | **GitHub CI 首次运行通过**：`CI \| completed \| success`，run 创建于 `14:47:23Z`（距推送 6 秒）。验证了此前只在本机模拟过的环节：runner 上的 `pnpm/action-setup`、corepack、`--frozen-lockfile`、从 `notofonts/noto-cjk` 下载字体的真实网络路径、artifact 上传 |
| 2026-10-11 | 实测 `iheee.xyz` 的 A 与 CNAME 记录**均为空**，NS 指向 `brady.ns.cloudflare.com` / `leanna.ns.cloudflare.com` → 确认域名已托管在 Cloudflare，第 4 步不会出现「请去 DNS 服务商添加记录」的提示。**等待用户创建 Cloudflare Pages 项目**                          |
| 2026-10-11 | 扩写第 4 步为教学式说明（先理解这一步在做什么 / DNS 与 CNAME 与 SSL 三个概念 / 操作 / 生效后），因为用户追问「这个什么意思啊」——说明原文档只写了「怎么做」没写「在做什么」                                                                                     |
