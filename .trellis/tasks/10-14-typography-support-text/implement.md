# Implementation Plan: 统一档案辅助文字层级

## Ordered Work

1. 保留当前工作区基线，复核新任务文档、`notes.html`/`index.html` 现有内嵌样式和三种桌面基线；不改源 Markdown、生成数据、图片或部署配置。
2. 在 `notes.html` 的桌面排版块中增加角色变量，放大顶栏品牌/导航/返回入口、目录标题与一级/三级条目、工具栏和统计标签；同步调整必要的点击区域、行高、侧栏最小宽度或留白，确保目录长文自然换行并可滚动访问。
3. 在 `index.html` 的桌面排版块中复用同名角色变量，放大顶部导航、按钮、时间轴辅助文字、引文来源/索引、人物/符号辅助文字、全文入口统计和页脚等同层级文字；保留已经达到可读尺寸的正文说明、主标题和引文行组。
4. 在 `tests/desktop-smoke.spec.js` 增加桌面辅助文字回归：等待字体加载，覆盖 `1920×1080`、`1440×900`、`1024×900`，检查角色字号下限、顶栏无重叠、目录条目可见/可滚动、页面无横向溢出，并保留全部既有标题、引文、交互和历史 `390×844` 回归。
5. 运行验证：
   - `npm run build`
   - `npm test`
   - `node --check scripts/build-content.cjs`
   - `node --check assets/js/image-viewer.js`
   - `node --check tests/desktop-smoke.spec.js`
   - `git diff --check`
6. 复核 `1920×1080`、`1440×900` 的首页与全文页截图，以及 `1024×900` 的桌面边界；确认顶栏、目录、工具栏和正文之间没有重叠、裁切或不必要的孤立单字。
7. 检查 diff 只包含本任务授权范围，更新 workspace journal；不纳入现有未跟踪 Trellis scaffold、凭据、部署资产或其他任务记录。
8. 运行 Trellis quality check 和 advisor 最终审阅，修复本任务范围内发现的语法、几何或回归问题后再提交；不推送远程、不部署 Cloudflare。

## Validation Matrix

| Area | Observable check |
|---|---|
| Notes top bar | 品牌、导航、返回入口达到角色字号；无文字/图标/按钮重叠 |
| Notes sidebar | 目录一级/三级文字放大；长条目可自然换行，目录仍可滚动到全部条目 |
| Homepage peers | 导航、按钮、时间轴/引文/人物/符号/页脚等同层级辅助文字完成盘点和统一放大 |
| Layout | 三个桌面 viewport 无横向溢出；正文宽度、标题和引文既有行组不变 |
| Accessibility | URL、稳定 ID、目录定位、焦点路径、reveal 和 reduced-motion 不变 |
| Runtime | 现有 Playwright 全套（含历史 390px 图片查看器回归）通过，页面无 console/page/HTTP 错误 |
| Scope | 不修改 `content/`、生成器、`assets/data/archive.js`、图片或部署配置 |

## Review Gates

- 不通过整体缩放根字号、全局 `nowrap`、固定高度、隐藏、裁切、省略号或删除文案解决放大后的空间问题。
- 不把正文、标题、主引文或表格机械套入辅助文字变量。
- 不修改移动端视觉设计；`390×844` 只保留为历史行为防回归。
- 不改变页面 URL、稳定 ID、搜索/目录契约、业务交互和 reduced-motion 行为。

## Rollback Points

- 角色变量阶段：移除新增桌面变量和选择器覆盖，保留页面原有排版。
- 布局配合阶段：按页面分别回退顶栏/目录的间距和列宽调整。
- 测试阶段：只回退新增辅助文字断言，不弱化既有行为回归。
- 提交前：用 scoped diff 和 `git diff --check` 阻止无关 scaffold 或部署文件进入提交。

## Execution Record

- 用户批准最终规划后由主会话完成首轮实施；随后补登记任务激活，使用 `task.py start --allow-empty-context`，全程未调用子代理。
- 实施修改仅落在 `index.html`、`notes.html` 和 `tests/desktop-smoke.spec.js`；`content/`、生成器、生成数据、图片、部署配置和移动端规则未改动。
- 首轮回归发现人物卡存在更高特异性的旧字号规则，补充同一角色变量覆盖后定向测试通过；没有通过降低断言规避问题。
- 首轮验证：`npm run build`、`npm test` 7/7、`node --check scripts/build-content.cjs`、`node --check assets/js/image-viewer.js`、`node --check tests/desktop-smoke.spec.js`、`git diff --check` 均通过；三种桌面视口截图已复核。
- 顾问收尾后，字号断言改为读取实际文本节点，全文入口链接归入操作角色；目录测试先将侧栏滚入 viewport，再验证末项可达和链接边界。桌面激活目录反馈改为垂直位移，避免整宽链接产生横向滚动区。
- 最终 `task.py validate` 已通过：`implement.jsonl` 与 `check.jsonl` 各包含一条本地 frontend 规范引用；完整 `npm run build`、`npm test` 7/7、语法检查和 `git diff --check` 再次通过。
