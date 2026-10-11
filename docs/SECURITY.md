# 安全要求

> 静态站点没有服务端与数据库，攻击面集中在**发布内容**与**构建供应链**。

## 🔴 1. 已知的敏感信息（必须先读）

在用户的本地磁盘上发现三处**硬编码真实 API 密钥**。这些文件**绝对不得进入本仓库、不得发布到站点**。

| 文件                                                                                                        | 内容                                                                             |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `/mnt/d/code/简历/dana-declaration/dana-declaration-back-master/Port_Repoter/LLMLoadBalance.py:243,257,264` | DeepSeek `sk-…` + 阿里云 DashScope `sk-…` ×2，含服务地址 `seetacloud.com:8448`   |
| `/mnt/d/code/简历/intent_recognition/llm/intent_more_lianwang_v2/config/__init__.py:9`                      | DashScope `API_KEY`，注释含 `124.71.111.229:9808`                                |
| `/mnt/d/code/简历/galaxy-assistant-dev_assistant/data/.config.yaml:180,187`                                 | 同一 DashScope 密钥；`:123` 火山引擎 access_token；`:65` 内网地址 `192.168.80.8` |

另有中危项：`galaxy-assistant-dev_assistant/core/providers/datasource/mysql.py:140` MySQL 明文口令 `'password': 'zxcvbnm'`。

**用户当前决策**：暂不处理（m00152 Q13=C）。**智能体已建议用户自行轮换密钥。**

**对本项目的约束**：

- 上述目录**不在本仓库内**（位于 `/mnt/d/`），不会被 `git add` 触及。
- 若未来把项目代码作为作品集展示（如 `galaxy-assistant-dev_assistant`、`dana-declaration`），**展示前必须逐文件扫描密钥**，且优先展示自研改造部分而非 fork 原样。
- `galaxy-assistant-dev_assistant` 是 `xinnan-tech/xiaozhi-esp32-server` 的 fork / 衍生，**不是原创作品**，不得作为个人项目展示。

## 2. 发布内容的脱敏要求

| 项                                                              | 处理                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| linux.do 帖子中的真实论坛用户名                                 | 上线前匿名化（企业知识库 15+、LangGraph 20+ 处）                                   |
| `source_path` 的本机 D 盘绝对路径                               | 不渲染到界面                                                                       |
| `resume-analysis-system-master/Assets/result1.png`              | **含他人简历个人信息**（姓名、电话、邮箱、出生年月、院校），需脱敏或改造后才可展示 |
| 用户本人手机号 `13532456250`                                    | 简历 PDF 中有，**网页只放邮箱与 GitHub**，不放手机号                               |
| 公司内部地址（`192.168.80.8`、`region-9.autodl.pro`、钉钉内链） | 不渲染                                                                             |

**结构测试已锁**：`.gitignore` 覆盖 `prompt-history.txt`（对话记录不入库）。仓库内不得出现任何「读取 prompt-history.txt」的要求。

## 3. 构建供应链

| 措施       | 现状                                                                              |
| ---------- | --------------------------------------------------------------------------------- |
| 依赖锁定   | `pnpm-lock.yaml` 入库，CI 用 `--frozen-lockfile`                                  |
| 依赖数量   | 极少：Astro + React + TypeScript + ESLint/Prettier/Vitest。**无运行时第三方依赖** |
| 无外部脚本 | 站点不加载任何第三方 JS、字体 CDN、统计脚本                                       |
| 字体许可   | Noto Serif SC / Noto Sans SC 为 **SIL OFL 1.1**，允许再分发与子集化               |
| 图标许可   | Lucide 为 **ISC**                                                                 |
| 密钥扫描   | **尚未自动化**（见技术债）                                                        |

**待补**：依赖漏洞扫描（`pnpm audit` 或 Dependabot）与提交前密钥扫描（如 gitleaks）尚未接入 CI。

## 4. 客户端安全

| 项                | 规则                                                               |
| ----------------- | ------------------------------------------------------------------ |
| `innerHTML`       | **禁止**用于任何用户或 Markdown 内容。Markdown 渲染走 Astro 编译期 |
| 外链              | 站外链接加 `rel="noopener noreferrer"`                             |
| `target="_blank"` | 必须与 `rel="noopener"` 同时使用                                   |
| 内联脚本          | 只用 Astro 的 `<script>`（构建期处理），不手写 `onclick` 属性      |
| CSP               | 静态站点可加严格 CSP（无内联脚本时）。**尚未配置**                 |

## 5. 网络与凭据

- 站点本身**无登录、无表单提交、无 cookie**，因此无会话安全面。
- 邮件地址以明文展示（用户确认），接受被爬取的风险。
- GitHub 仓库为公开仓库；**`prompt-history.txt` 不入库**（含用户原始提示词）。

## 变更历史

| 日期       | 变更                                                 |
| ---------- | ---------------------------------------------------- |
| 2026-10-11 | 建立。记录三处密钥位置、脱敏清单、供应链现状与待补项 |
