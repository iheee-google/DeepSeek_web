# Implementation Plan: 史实对照全宽证据带

## Ordered Work

1. 读取 frontend Trellis spec，确认当前工作区基线；只触碰本任务明确文件，不带入未跟踪 Trellis scaffold。
2. 更新 `index.html` 的历史标题区 CSS/HTML：压缩导览头，保留第九章全文链接和稳定容器。
3. 更新 `#historyGrid` / `renderHistory()` 为上下两条全宽证据带：左侧编号/类别/标题，右侧完整 `item.html`，不改 `archive.history` 数据契约。
4. 删除历史模块旧的双列/固定高度视觉约束，保留自然高度、受控正文行宽、进入/悬停/焦点和 reduced-motion 状态。
5. 同步 `docs/design-v2.md` 的历史勘误描述，明确新的全宽证据带结构。
6. 扩展 `tests/desktop-smoke.spec.js`：
   - 两条记录按垂直顺序排列；
   - 每条正文与生成数据的完整规范化文本一致；
   - 两条记录不渲染图片，稳定 ID 唯一；
   - 第九章全文链接保持有效；
   - reduced-motion 下正文可见且无过渡依赖；
   - 无控制台/资源错误。
7. 在 1440×900 复核史实标题、两条证据带、内容边界和无大面积并列空白；不把窄屏检查扩展成移动端设计。
8. 执行完整检查：
   - `npm run build:content`
   - `node --check scripts/build-content.cjs`
   - `node --check assets/js/image-viewer.js`
   - `node --check tests/desktop-smoke.spec.js`
   - `npm test`
   - `git diff --check`
   - 生成数据一致性和重复 ID 检查
9. 审阅 diff，确认原 Markdown、图片、生成数据契约、`notes.html` 与其他首页模块未被无关修改；按用户已授权的项目规则直接提交本任务改动。
10. advisor 最终审阅后，获得归档确认并归档任务。

## Validation Matrix

| Area | Observable check |
|---|---|
| Layout | `#historyGrid` 有两个直接记录，第二条位于第一条之后；记录高度随内容自然结束，桌面没有双栏短卡空白 |
| Content | 两条 `history.html` 的完整规范化文本分别等于生成数据对应正文；四条/三条证据均存在 |
| Structure | `history-01`/`history-02` 唯一；历史模块零图片；chapter 09 链接仍指向 `notes.html#chapter-09-heading` |
| Motion | 普通模式有 reveal/hover/focus 状态；reduced-motion 下内容可见且 transition 被移除或即时化 |
| Regression | Playwright 无页面/控制台/资源错误；规则、时间轴、搜索、弹窗和全文入口不回归 |
| Visual | 1440×900 截图确认标题导览紧凑、证据层级清楚、无错误图片和无意义大空白 |

## Review Gates

- 不修改源 Markdown 或手工编辑 `assets/data/archive.js`。
- 不将两条正文压缩成摘要，不删除任何证据条目。
- 不使用统一固定高度、空段落或内部滚动伪造对齐。
- 不新增图片、框架、依赖或移动端功能。
- 完成前必须有完整正文断言和桌面截图证据。

## Rollback Points

- 标题区修改后：回退 `index.html` 对应样式/标记。
- 证据带修改后：回退 `index.html` 的历史渲染和 CSS；不动内容源与生成数据。
- 文档/测试修改后：只回退本任务的 `docs/design-v2.md`、测试和 Trellis 任务文件。
