# 可靠性要求

> 静态站点的可靠性问题集中在**构建链路**与**外部依赖**，而不是运行时可用性。
> 部署形态见 [`CI.md`](./CI.md)；安全事项见 [`SECURITY.md`](./SECURITY.md)。

## 1. 可靠性目标

| 目标             | 值                                   | 依据                         |
| ---------------- | ------------------------------------ | ---------------------------- |
| 构建可重复       | 同一 commit 两次构建产物一致         | 内容站点无需不确定性         |
| 构建失败要响     | 缺关键输入时**硬失败**，不产出坏引用 | 已实测过一次静默失败（见下） |
| 首屏可用         | 不依赖客户端 JS                      | 内容优先，静态输出           |
| 降级完整         | JS 全关时内容仍完整可读              | 渐进增强                     |
| 外部依赖失败可见 | 下载/网络失败时给出可操作报错        | CI 环境必须自证              |

## 2. 已实测的失败模式

### 字体缺失导致构建「成功」但产物坏掉（已修）

**现象**：移走 `public/*.ttf` 后 `pnpm build` **返回退出码 0**，并打印 `1 page(s) built in 472ms` + `Complete!`。但 `dist/` 里**没有任何 woff2 文件**，而 `dist/_astro/*.css` 已改写成 `/NotoSerifSC-subset.woff2?v=0.1.0`。结果是字体全 404，**中文整片消失**。

**为什么危险**：本机 `fc-list :lang=zh` 返回 **0 条**中文字体，所以字体是唯一渲染手段，没有系统字体兜底。而在 CI 上这个问题表现为「构建绿灯、线上中文不见」。

**修法（双保险）**：

1. 字体缺失时 `process.exit(1)`，报错说明「继续构建会产出指向不存在字体的引用」。
2. 构建末尾自检升级为「引用了 `/Xxx-subset.woff2` 但该文件不在 `dist/`」即失败。

**反向验证**（必须做，否则不知道检查是否在检查空气）：移走字体 → 构建确实失败（`ELIFECYCLE Command failed with exit code 1`）；恢复 → 通过。

### CSS 压缩器折叠声明导致动画静默消失（已修）

Astro 的 CSS 压缩器把 `animation: g linear both` 与 `animation-timeline: scroll(root)` 折叠成 `animation: linear both g scroll(root)`。**Chromium 不接受在 `animation` 简写里写时间轴**，整条声明被丢弃，动画完全不播且不报错。

修法：让两条声明落在不同特异性的选择器上，压缩器无法合并。详见 [`design-docs/animation-capabilities.md`](./design-docs/animation-capabilities.md) 第 6 条约束。

**通用教训**：**「不报错」不等于「在工作」。** 动画与资源引用都必须主动验证计算值或产物内容，不能只看退出码。

### 被 `.gitignore` 拦下的文件仍会留在 `.git` 里（已修）

早期执行过一次 `git add -A`，当时 `public/*.ttf` 尚未写进 `.gitignore`，两个字体（24.0 MB + 16.9 MB）已作为 blob 写入对象库。之后补上忽略规则再提交，**这两个 blob 不会出现在任何提交树里，但也不会被删除**——它们成为悬空对象，长期占据 `.git` 体积。

症状：`du -sh .git` 报 **38 MB**，而 `git ls-files` 统计的跟踪文件总量只有 **12.8 MB**，两者对不上。用 `git fsck --unreachable` 才能看到那两个 blob。

```bash
# 定位：跟踪文件总字节与 .git 体积明显不符时
git ls-files -z | xargs -0 stat -c%s | awk '{s+=$1} END {printf "%.1f MB\n", s/1048576}'
du -sh .git
git fsck --unreachable --dangling
git count-objects -vH          # 看 size 与 size-pack
```

修法（**先确认悬空对象没被任何提交引用**，否则会丢历史）：

```bash
git rev-list --objects --all | grep <object-hash>   # 无输出 = 确实悬空
git reflog expire --expire=now --all
git gc --prune=now
```

本次清理后 `.git` 从 **38 MB 降到 9.7 MB**，`fsck --full` 无输出、HEAD 未变、3 个提交与 178 个文件不变、工作区干净。

**预防**：`.gitignore` 要在**第一次 `git add` 之前**写好；大文件进过暂存区之后，光加忽略规则是不够的。

**通用教训**：**`.gitignore` 管的是「未来是否跟踪」，不是「过去是否已存储」。** 判断仓库是否真的干净，不能只看 `git status`，要拿跟踪文件总字节与 `.git` 体积对账。

### 配置了 `credential.helper` 不等于凭据已存在（已解决）

2026-10-11 推送成功后，用户执行了 `git config --global credential.helper store`，目录里也确认 `~/.gitconfig` 写入了 `[credential] helper = store`。但此后 git 仍然无法免密推送，读到的错误是：

```
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

**根因是时机，不是配置错误。** `store` helper 只在**下一次认证成功的那一刻**把凭据写盘。用户此前那次成功推送发生在 helper 被启用**之前**，git 当时并没有在监听——helper 不会回头去捡已经发生过的认证。于是形成一种很隐蔽的中间状态：

```
配置：store                 ✅ 已就位
文件：~/.git-credentials    ❌ 不存在（因为启用后还没发生过认证）
```

对照时间线可以确认：推送在 `22:47:17`，而 `.gitconfig` 的 mtime 是 `23:10:29`——配置晚于那次认证 23 分钟。

**修法**：让 helper 处于启用状态下**再认证一次**即可（任意一次 `git push`，提示时正常输入用户名与 PAT）。此后 `~/.git-credentials` 出现，免密推送生效。

**排查命令**：

```bash
git config --list --show-origin | grep -i credential   # 配置在哪一层、来自哪个文件
ls -la ~/.git-credentials                              # store helper 的落盘位置
git config --get credential.helper                     # 只查值，查不出「是否已生效」
```

**通用教训**：**`credential.helper` 是一个「监听器」而不是「存储器」——它只能捕获启用之后发生的认证。** 判断凭据是否真的可用，要看凭据文件是否存在，不能只看配置项有没有写上。

**另外**：本机的 shell 不是 TTY（`tty` 返回 `not a tty`），所以自动化执行时任何需要交互输入凭据的 `git` 操作都会直接失败。凭据文件一旦就位，这条路才通。

## 3. 外部依赖

| 依赖                                            | 失败时的行为                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 中文字体（本机目录 / `notofonts/noto-cjk` raw） | 先查本机四个候选目录，找不到则下载（超时 180s、体积下限 1 MB 校验防 LFS 指针与错误页）；都失败则构建硬失败 |
| pnpm registry                                   | CI 用 `--frozen-lockfile`，锁文件不一致即失败                                                              |
| GitHub Actions                                  | 构建产物上传为 artifact（保留 7 天），便于失败时离线排查                                                   |

**不引入运行时外部依赖**：站点无 API 调用、无第三方脚本、无外部字体 CDN。字体随产物一起发布。

## 4. 构建链路检查清单

每次改动构建相关脚本后：

- [ ] `pnpm build` 从干净状态成功（先 `rm -rf dist`）
- [ ] `dist/` 中每个被引用的资源都真实存在（`scripts/subset-fonts.mjs` 自检 + `scripts/verify-dist.mjs`）
- [ ] **故意破坏一个输入，确认构建真的失败**（不能只验证成功路径）
- [ ] `dist/` 体积无异常增长（当前基线 868 KB）
- [ ] 本机与 CI 的路径差异已考虑（CI 无 `/mnt/c`，`HOME` 不同）
- [ ] 跟踪文件总字节与 `.git` 体积对得上（差得离谱说明有悬空大对象）

## 5. 回滚

静态站点回滚 = 重新部署上一个 commit 的产物。Cloudflare Pages 保留历史部署，可在面板回滚。**因为产物由 CI 从 commit 重建，回滚必须回滚 commit 而不是只回滚产物**，否则下次 push 会重新引入问题。

## 变更历史

| 日期       | 变更                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| 2026-10-11 | 建立。记录两个已实测的静默失败模式与修法                                    |
| 2026-10-11 | 补第三个失败模式：被 `.gitignore` 拦下的文件仍留在 `.git`（38 MB → 9.7 MB） |
