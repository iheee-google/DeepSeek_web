# 实施计划（已实现，待用户最终视觉确认）

## 进入实施前

- [x] 用户同意创建新的视觉冲击力任务。
- [x] 完成上一版主题与实际首页截图基线审计。
- [x] 用户选择融合方案：A 定气氛、B 定首屏、C 定内容结构。
- [x] 完成电影摄影、海报身份边界、编辑式暗色和 panel reveal 参考研究。
- [x] PRD、技术设计、执行计划和规范/研究清单已准备。
- [x] 向用户展示最终规划摘要并获得本轮实现批准；已收到“继续”，现在进入执行。

## 执行顺序

1. 主会话读取 `trellis-before-dev`，复核最新任务、工作区和预存未跟踪文件；已执行 `task.py start`。全过程禁止子代理、禁止可见 Chromium。
2. 使用无界面 Chromium 在 `1920×1080`、`1440×900`、`1024×900` 记录首页/全文基线：真实 CSS viewport、DPR、字体状态、关键 section 几何、海报比例、横向溢出、现有错误指标和稳定截图；证据及临时文件只放 `.tmp/`。
3. 复用上一版 `assets/css/archive-theme.css` 的语义 token，并在页面既有桌面样式区实现三种场景（暖纸档案、暗色切场、红线焦点）的明确 surface/foreground 配对；不整段重写旧 CSS，不添加主题运行时。
4. 实现首页 hero 的 B 方案：将 `godfather1.jpg` 作为中央主海报，II/III 为两侧次级海报，保持三张自然比例、主次尺度、错位/层叠、编号和 CTA 安全区；确认三张真实 viewer 点击区域、标题语义行组、页面高度和 1024px 边界。
5. 实现 A 方案的节拍：明确把现有 `.timeline-section` 与主引文作为暗色舞台，保留暖纸规则/人物/史实/符号和结尾暗影；用红线作为章节结构和当前焦点，检查前景配对与段落过渡。搜索、人物详情和 viewer 仅做回归，不在本轮重设计。
6. 实现 C 方案的内容地图层：人物焦点/名册重量、时间轴节点与详情、史实元信息/正文和符号编号/影像空间使用非对称层级；不改数据、关系语义、稳定 ID 或 DOM 事件。
7. 同步全文页的克制结构标记、角色标注、目录、表格、person detail 和图片 viewer 视觉；不改变正文内容、返回位置、焦点/inert/滚动锁、全屏/缩放/即时关闭。
8. 增加 `tests/desktop-smoke.spec.js` 的主题断言：hero 主次海报几何和自然比例、暗/亮阶段 computed surface、红线/选中状态、真实合成对比度、关键模块无溢出；保留全部既有行为测试和窄屏历史回归。
9. 等待 reveal、引文切换、详情 opacity/transform 和图片状态稳定后采集三视口全套截图，逐张检查首屏、暗切、人物/时间线地图、史实/符号、结尾、全文和 viewer；将截图供用户做视觉确认。
10. 若用户视觉确认要求调整，只改主题/构图范围；若需要改内容、数据、交互算法、图片或依赖，立即停止并重新确认范围。

## 当前执行结果

- [x] 1–9 已完成；无界面三视口截图已采集并检查首屏、时间轴、人物焦点、符号、结尾、全文 hero 和正文。人物区域另按工具栏、四张焦点卡和名册首行分别采集与验证范围一致的局部截图，避免用整段容器截图替代证据。
- [x] 顾问收尾要求已完成：时间轴 kicker 使用暗面专用前景；实现路径统一为 `10-16`；主题测试覆盖三张海报的真实坐标命中、命中原图的 `currentSrc` 与 viewer 的 `src` 属性核对、主海报相对 II/III 的变换面积/位置和两个 CTA 遮挡。
- [x] 主题证据脚本同时采集 normal/reduced-motion 两种模式；normal 模式不禁用动画，先逐项滚过 reveal 目标并等待有限动画稳定，再采集首屏、时间轴、人物、符号和全文 hero。
- [ ] 等待用户对本轮稳定截图和视觉方向做最终确认；确认前不归档任务。

## 验证命令

```bash
node --check scripts/build-content.cjs
node --check assets/js/image-viewer.js
node --check tests/desktop-smoke.spec.js
npm test
npm run verify:deploy
npm run build
python3 ./.trellis/scripts/task.py validate .trellis/tasks/10-16-godfather-visual-impact

git diff --check
```

`npm run build` 必须作为末尾构建命令执行，并确认末尾包含 `verify:deploy`。不运行 Wrangler deploy、不推送、不启动可见浏览器。

## 本轮验证结果

- 主题专项回归 1/1，完整 `npm test` 11/11；专项新增三张海报的真实坐标点击和 viewer 源映射、主海报面积/位置、CTA 遮挡、暗时间轴 kicker/按钮对比度与全文 hero surface 断言。
- `node --check scripts/build-content.cjs`、`node --check assets/js/image-viewer.js`、`node --check tests/desktop-smoke.spec.js` 通过。
- `npm run verify:deploy`、任务校验、`git diff --check` 通过；本轮测试断言与证据记录修正后，已重新执行末尾 `npm run build`，并以其成功的生产 bundle 输出作为最终构建证据。
- normal/reduced-motion 两种模式均在 1920/1440/1024 记录正式视口、DPR 1、字体 loaded、无横向溢出和无页面/控制台/请求错误；normal 模式截图未禁用动画，稳定证据覆盖首屏三联海报、暗色时间轴、人物工具栏/焦点卡/名册首行局部区域、符号和全文 hero。

## 证据要求

- 三种正式桌面 viewport、DPR、`document.fonts.status`、声明字体栈和页面/控制台/请求错误为零。
- 暗面普通文字对比度 ≥4.5:1，大字 ≥3:1，必要控件和焦点 ≥3:1；透明背景按祖先实际合成，不使用 token 理论值替代。
- 首页主海报 I 与两张次级海报 II/III 均保持自然比例、真实点击区域全部可达；hero 标题、CTA、编号不被层叠层遮挡。
- 时间线保留单轨几何、拖拽滚动、节点/详情和长内容可达；红线只为结构，不改变节点语义。
- 人物、史实、符号完整内容和既有稳定 ID/源链接保留；正文不裁切、不出现新的孤立单字。
- 主题截图必须在 reveal、动画、引文切换和弹层 opacity/transform 稳定后采集；避免固定延时替代稳定条件。记录三张海报的独立点击/可达性证据；reduced-motion 保留静态错位构图，只取消运动。
- reduced-motion 下主题最终态即时可见，既有快速切换/关闭/嵌套 Escape 回归仍通过。

## 收尾与回滚

- 通过 `trellis-check` 进行主会话范围内检查；明确错误只修复对应错误，不借机重构。
- 通过 `trellis-update-spec` 将真正稳定的构图/表面配对规则写入 `.trellis/spec/frontend/`，不复制产品设计全文；本轮的暗面 kicker 前景配对已沿用现有规范变量，无需增加重复规则。
- 更新 `docs/design-v2.md`、任务 journal 和实现清单，记录用户视觉确认与实际命令结果。
- scoped commit 只包含本任务页面/共享样式/测试/文档/任务记录，不包含 `.tmp/`、预存 scaffold、部署配置或无关生成差异。
- 不推送、不部署，除非用户另行明确授权。
- 若视觉不符合用户预期，先回退本任务的主题/构图文件至上一稳定检查点；不删除文件、不重写历史、不动上一版角色链接和图片生命周期实现。
