# 技术债清单

> 记录已知的、**故意推迟**的问题（Harness §2.2）。不是 bug 列表——bug 该直接修。
> 每条必须写清：是什么、为什么推迟、什么条件下该还。

## 高优先级

### D1：内容管线未接通

- **是什么**：`src/` 里只有硬编码的五幕数据（`src/repo/acts.ts`），仓库内**没有任何 Markdown 内容**。67 篇笔记与《教父》笔记都还在 `/mnt/d/Obsidian/iheee/` 与 `godfather-trilogy-notes-v4/`。
- **为什么推迟**：原型闸门优先（Harness §5.4 要求先验收视觉再看内容管线），且内容导入涉及 front matter 归一化决策。
- **还债条件**：Cloudflare 部署通路打通后立即开始。这是当前最大单点缺口。
- **已知的坑**（调研已记录，实施时直接用）：linux.do 8 篇用**中文 front matter 键名**（`来源/标题/作者/分类/tags/保存时间/整理时间/评论数`），必须先做中→英归一化；`migrated` 是日期字符串不是布尔；**不存在可信的笔记创建日期**（`created` 仅 2 篇有，41/67 篇无任何日期信号，不得用文件 mtime 兜底）。

### D2：Service / Runtime 两层为空

- **是什么**：依赖方向已被结构测试锁死，但 `src/service/` 与 `src/runtime/` 里没有代码。
- **为什么推迟**：没有内容可服务。
- **还债条件**：随 D1 一起解决。

### D3：CI 从未在 GitHub 上真跑过 —— **GitHub 侧已还清，Cloudflare 侧待验证**

- **是什么**：`.github/workflows/ci.yml` 已写好（install → 校验版本 → format → lint → check → test → build → artifact）。
- **GitHub 侧：已还清**。2026-10-11 用户推送 `main` 后工作流自动触发并**成功**（`CI | completed | success`，run 创建于 `2026-10-11T14:47:23Z`，距推送 6 秒）。这验证了此前只在本机模拟过的环节：Actions runner 上的 `pnpm/action-setup`、corepack、`--frozen-lockfile`、**从 `notofonts/noto-cjk` 下载字体的真实网络路径**，以及 artifact 上传。
- **仍未验证**：**Cloudflare Pages 构建环境是否真的按 `packageManager` 字段选用 pnpm 10.30.3**（v3 既不从 lockfile 也不从 `engines` 检测 pnpm 版本，见 `docs/CI.md` 版本对齐表）。另 CI 缓存命中率尚未观察（首次必然冷缓存，单次数据不足）。
- **还债条件**：首次 Cloudflare 构建成功，且检查过构建日志中的 pnpm 版本与字体下载步骤。

### D4：文档未经机械校验

- **是什么**：Harness §6 T9 要求「文档必填节与交叉链接」由文档 lint 检查。目前 `docs/` 下 10+ 份文档全靠人工维护。
- **为什么推迟**：文档刚补齐，先让它稳定一版再上 lint，否则规则会频繁改。
- **还债条件**：文档结构稳定后（预计内容管线完成后）。

## 中优先级

### D5：无性能断言

- **是什么**：Harness §8.2 要求可验证的性能断言。目前只有「首屏不加载非关键 JS」这类约定，无实测门禁。
- **还债条件**：首页内容量稳定后，用 Lighthouse CI 或自定义脚本断言首屏字节数与 LCP。

### D6：可访问性未实测

- **是什么**：skip link、`:focus-visible`、reduced-motion 降级已实现，但**从未用屏幕阅读器实测**，也**未做过全站对比度扫描**。
- **还债条件**：主要页面（首页、笔记列表、笔记正文）完成后统一做一轮。

### D7：无密钥扫描与依赖漏洞扫描

- **是什么**：见 `SECURITY.md` §3。`pnpm audit` 与 gitleaks 类工具未接入 CI。
- **为什么推迟**：当前项目**无运行时第三方依赖**，风险面小。
- **还债条件**：引入第一个运行时依赖前必须补上。

### D8：Pagefind 索引未接入

- **是什么**：`docs/CI.md` 与 `core-beliefs.md` 都把 Pagefind 写进构建链路，但**`package.json` 里没有 Pagefind 依赖，构建脚本也没跑它**。
- **为什么推迟**：需要真实内容才有索引价值。
- **还债条件**：随 D1 一起接入，并加上「draft 不进索引」的验证。

### D9：`scripts/verify-dist.mjs` 有两个空列

- **是什么**：`pct` 与 `ruleScale` 两列在原进度条被删除后恒为空串，列定义保留未删。`scripts/verify-dist.mjs` 里 `const shots = []` 曾误放在 `try` 块内（已在另一处修掉），但这两个读数列仍是死代码。
- **为什么推迟**：无害，且删除需要重跑验证。
- **还债条件**：下次改动该脚本时顺手清理。

## 低优先级

### D10：`prototypes/` 仍占用仓库 22 MB

- **是什么**：`prototypes/assets/`（godfather 2.2M + inkwell 1.1M + t2i 744K）与 `prototypes/shots/`（16M，已 gitignore）留在仓库内。字体 41 MB 已改为不入库。
- **为什么推迟**：原型是验收依据，归档前需保留；`shots/` 是可重建产物。
- **还债条件**：阶段 G 收官时，原型移入归档或直接删除，只保留结论。

### D11：未处理的重复素材与孤儿文件

- **是什么**：`godfather-trilogy-notes-v4/portraits/rocco.jpg` 与 `rocco-new.jpg` **md5 完全相同**（`20d01745a85961fcb60103a69cb007ec`）。Obsidian 库 `InkWell-Ai.assets` 与 `【InkWell-Ai】…assets` **文件列表完全一致（diff 为空）= 29 文件 / 3.0 MB 纯冗余**。
- **还债条件**：内容导入脚本里顺手去重。

---

## 已还清

| 编号 | 内容                                             | 还清日期   |
| ---- | ------------------------------------------------ | ---------- |
| —    | 字体缺失时构建静默产出坏引用                     | 2026-10-11 |
| —    | CSS 压缩器折叠 `animation-timeline` 导致动画消失 | 2026-10-11 |
| —    | 结构测试因 `.astro` 同时是扩展名而全部静默跳过   | 2026-10-11 |

## 变更历史

| 日期       | 变更         |
| ---------- | ------------ |
| 2026-10-11 | 建立。D1–D11 |
