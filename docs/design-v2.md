# 柯里昂档案 V2 设计说明

## Design Read

面向内容型个人网站的重设计，服务于希望探索电影笔记而不是线性阅读的观众，采用档案展览与电影编辑设计语言，强调家庭的暖色秩序和权力的冷色结构在同一浅色主题中的交叉。

- `DESIGN_VARIANCE`: 8。用不对称分栏、横向轨道、人物档案网和可展开面板组织内容。
- `MOTION_INTENSITY`: 7。使用有原因的入场、共享元素形变、面板展开、标签滑动和交互反馈。
- `VISUAL_DENSITY`: 5。内容丰富，但通过模块、筛选和局部展开分层，不把十章全部压成一张长文页面。

## 视觉语言

页面采用浅色档案纸作为唯一主题，不把整段页面切成黑白两套主题。黑色只属于电影剧照、弹层影像和少数权力节点。

- 家庭层：旧纸白、橄榄灰、木质棕，表达婚礼、餐桌、庇护和血缘。
- 权力层：石板蓝、炭墨、低饱和砖红，表达制度、交易、清洗和代价。
- 全局动作色：低饱和砖红 `#9d4939`。黄铜色只作为细线和图标材质，不作为第二个按钮色。
- 文字：石板墨色优先，正文保持高对比。衬线字体只用于档案标题和引文，系统无衬线用于控件和索引。
- 统一形状：档案地图、人物网和时间轨道使用克制的直角边界，按钮保留胶囊形，弹层采用轻微圆角。让剧照像档案页一样承担结构，而不是让所有模块变成软卡片。

## 内容架构

原 Markdown 仍是唯一内容源。`scripts/build-content.cjs` 编译出稳定的 `archive.js`，前端不再手写人物和引文摘要。

1. **开场档案**：三部电影的核心冲突和完整数据统计，降低首屏黑度。
2. **档案地图**：十个一级章节都成为入口。前三个电影章节用大画面，其余章节用证据卡和关键词承接。
3. **权力与家庭**：把引言、观影指南、法则和三大母题变成可展开的规则卡。
4. **三部电影故事板**：每部电影以时间、人物和关键场景组成可横向探索的轨道，第二部保留维托与麦克的镜像关系。
5. **人物图鉴**：44 个人物全部由数据生成。四个焦点人物与完整名册分层展示，按群组筛选，点击后打开完整小传和原文定位。
6. **编年轨道**：14 条事件变成可点击时间节点，选择节点会展开事件说明，并提供对应电影档案入口。
7. **台词和博弈**：从原文第八章提取 9 条台词，使用滑动引文板和分类索引，不再硬编码四句。
8. **历史勘误**：保留电影事件与现实原型的对照内容，用双栏证据卡呈现。
9. **视听符号**：12 个符号全部成为可交互入口，带完整说明和正文定位。
10. **完整档案**：全文保留，作为一个明确的“全文”入口和查证层，而不是被删减的摘要。

## 交互原则

- 卡片打开采用 shared-element 形变，像 `transitions.dev` 的 card resize 和 panel reveal，但使用当前项目的原生 Web Animations。
- 档案地图、人物名册和台词分类使用滑动指示器，借鉴 tabs sliding 的状态表达。
- 全文目录保留 Rail TOC 的滚动追踪思想，但通过 IntersectionObserver 和稳定标题 ID 实现。
- 模态档案可通过 Escape 关闭，打开后焦点进入面板，关闭后回到触发元素。规则卡、引文索引和人物筛选使用即时状态反馈。
- 动画只表达层级、叙事、反馈或状态转换。`prefers-reduced-motion` 下改为即时切换。
- 不使用 emoji，不复制参考站代码，不引入新的 UI 框架或不必要依赖。

## 参考

- Transitions.dev：卡片 resize、panel reveal、page side-by-side、tabs sliding、accordion、modal open/close。
  https://transitions.dev/
- Rare UI：Grid Reveal、Rail TOC、Step Player 的内容导航和进入动效思路。
  https://www.rareui.com/
- shadcn/ui：Dialog、Tabs、Accordion 的可访问状态边界。
  https://ui.shadcn.com/docs/components/base/dialog
  https://ui.shadcn.com/docs/components/base/tabs
  https://ui.shadcn.com/docs/components/aria/accordion
- getdesign.md：把 hover、focus、disabled 和 motion 写进设计说明的做法。
  https://getdesign.md/blog/web-design-md/

这些站点用于提炼交互模式，不直接复制实现。当前项目继续使用原生 HTML、CSS、JavaScript 和已本地化的 Lucide 图标。
