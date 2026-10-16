# 电影视觉与 UI 研究（规划稿）

## 现状证据
- `index.html:622–654` 后置主题覆盖：`--ink:#e7e4dc`、`--paper:#1d3029`、`--rust:#38584b`、`--gold:#a35e3d`。不能把文件开头仍存在的黑金变量当成当前生效主题。
- `index.html:682–741` 多个模块使用灰绿背景，例 `.rules-section:#d5ded6`、`.timeline-section:#e1e6df`、`.quote-section:#d8e0d7`。绿色并非仅一处 token，按钮、边界、阴影与图像底也有硬编码。
- `notes.html:10–30`：浅绿渐变、深绿文字和铜橙强调；`notes.html:96–115` 人物层沿用相同色系。
- `docs/design-v2.md` 当前规定浅色档案主题；若选用局部暗色叙事区，需要明确更新这一产品设计规定，而不是在实现中暗改。全文阅读保持亮面，符合此前避免全黑的目标。
- 设计判断而非客观缺陷：目前大面积灰绿、统一亮度和铜橙标题形成一致的展览感，却弱化电影的棕褐、蓝黑以及家庭空间/权力空间的对比。颜色是否符合用户偏好，最终由方案选择与实际视觉确认决定。

## 电影来源（2026-10-16 检索）

### F1 Gordon Willis 本人采访 / American Cinematographer
https://theasc.com/article/the-godfather-on-location-gordon-willis-cinematography/
- 原文："this film should have a brown look to it, with occasionally a bit of that 1945 blue-black in it"；另以带少量颜色的报纸黑白照片比喻纽约段。
- 地域差异：纽约旧而棕褐，Hollywood 明亮清晰；西西里描述为 olive、warm、sunny，以及 rich/brown/creamy。
- 注意：采访包含拍摄时的计划，不据此声称每个最终镜头均采用了某个滤镜。ASC 回顾文章本身也记录了对 chocolate filters 的不同回忆。
- 转译建议：暖象牙纸、烟草褐、近黑影调为结构，绿只在剧照或极少辅助处出现；不是全站叠一层 sepia。

### F2 ASC 摄影回顾
https://theasc.com/post/the-film-book/gordon-willis-tribute-the-godfather/
- 暗书房、顶光遮蔽眼神、窗/灯高光与明亮婚礼外景构成对比。
- 原文："The cut to a bright overexposed wedding scene offers a strong contrast between dark interiors and bright exteriors."
- 转译建议：暗色用于少数叙事空间，亮面承担阅读；不要以文字低对比模拟电影黑暗，也不要给所有内容加暗幕。

### F3 科波拉访谈 / Directors Guild of America
https://www.dga.org/craft/dgaq/issues/0701-spring-2007/dga-interview-francis-coppola
- 原文："extreme levels of darkness and light"；书房 black ambiance 与 outside wedding bright；固定构图中演员活动。
- 转译建议：稳定版式与明暗对照比全站漂浮更有电影依据。保留现有必要进入/激活/退出、Morph 和即时关闭契约，不据此删除已有动画。

### F4 官方电影页
https://www.paramount.com/movies/the-godfather
- 电影身份/官方视觉入口；本轮不把搜索中出现的任意金色周年海报当成 1972 原始视觉。
- 没有得到可靠原始海报设计档案全文，故不将 logo 作者或海报具体色号作为已验证依据。

## 指定 UI 参考与可用边界

| 站点 | 本轮实际获取 | 可采用 | 不采用 |
| --- | --- | --- | --- |
| https://beautifului.dev/ | 首页正文，当前为 AI-native primitives：Approval Card、Task Rows、Records Table 等 | 清楚的内容/动作层级 | 不把 AI 工作台外观当作电影视觉依据 |
| https://beui.dev/docs/motion-patterns | Motion Guides 全文 | 高频动作快响应、目的驱动、共享动效语言、布局连续性 | 不引入 Motion/React；不覆盖项目 reduced-motion 即时切换和图片即时关闭规则 |
| https://www.rareui.com/components/railtoc | 直接抓取 429，仅搜索索引确认组件描述 | 既有目录位置与章节连续导航保留 | 不声称完成现场视觉审阅，不安装组件 |
| https://transitions.dev/ | 首页列出 panel-reveal、modal-open-close、text-states-swap、tabs-sliding 等 | 保持面板与切换的连续反馈 | 不复制代码，不引入无目的大幅动画 |
| https://ui.shadcn.com/docs/theming | Theming 全文 | 表面/前景、强调/前景的语义配对；状态色与品牌色分开 | 不照搬 neutral 样式，不安装 shadcn/Tailwind |
| https://getdesign.md/ | 直接抓取解析至 0.0.0.0，拒绝；搜索索引返回 https://getdesign.md/blog/web-design-md/ | 仅参考显式记录设计系统的思路 | 不将未获取全文当作验证通过的规范 |
| https://variant.com/ | JS 渲染，未得到正文；搜索索引确认视觉候选浏览定位 | 以可比较方向收敛偏好 | 不声称检查了具体字体/动效或复制其样式 |
| https://www.tasteskill.dev/ | 首页全文 | audit-first、preservation、字体/间距/色彩/布局/动效共同设计 | 不采用默认双主题或扩大移动端范围，不安装技能/依赖 |

## 候选方向（原创设计建议，不是电影官方色板）

### A 暖纸与暗书房（推荐）
- 候选色：暖象牙 `#F1E7D4`、正文墨褐 `#241C17`、书房近黑 `#191512`、胡桃木 `#53382B`、酒红 `#762F35`、灯光琥珀 `#BD9157`。
- 首页浅色内容为主；开场和主引文采用局部暗色叙事空间，人物图像保留真实高光。概念目标浅 65–75%、暗 25–35%，不是强制面积断言；不逐模块机械黑白交替。
- 规则、时间轴、史实用亮面与墨褐层级；全文暖纸，详情亮面配深影遮罩，图片查看器采用深色独立环境。后续代码核对：当前查看器实际是暗遮罩/浅色窗口，不是深色窗口；新方向会改变其窗口视觉但不改变生命周期。
- 字体保留已验证的标题/引文语义行组与共享字号角色；靠边界、留白、字重、明暗区分层级，不缩字或模仿 logo 损害中文。
- 细纹理只在表面，不对正文/图像叠全屏灰绿雾；取消装饰性强发光和泛金色按钮，红用于可识别动作并保留焦点/下划线。
- 代价：改变旧“唯一浅主题”规定，但不是新增主题切换；必须验证暗面组件前景、固定导航及弹层全部状态。

### B 黑白海报与红色重点
- 候选色：骨白 `#F3EEE4`、炭黑 `#171717`、灰褐 `#74685F`、暗红 `#8A3035`。
- 亮面约 80%，黑色大字和直线分区，红仅用于选中/交互与少量叙事标记。三张现有海报是视觉焦点，不重画或替换海报。
- 首页偏电影专刊，全文同色但阅读密度收敛，人物卡保留原彩照片。
- 优点：更克制、更偏海报识别；代价：温暖家庭空间的表达弱于 A，若只套黑白红容易成为通用影展页面。

### C 西西里暖光与家族手稿
- 候选色：奶油 `#F0E2C7`、浅石 `#D7C1A0`、深褐 `#35261E`、陶土 `#925039`、辅助橄榄 `#6A6546`。
- 浅色约 85–90%，主要用纸、石、木的色阶和摄影原图暗部表达权力，几乎不新增深色大区。
- 首页更有家庭相册与家族笔记气息，正文阅读最接近现有亮面布局但移除灰绿主导。
- 代价：对电影阴影与压迫感表达较弱，必须避免做成旅行/复古咖啡馆主题。

## 选择与下一步
用户已选择 A「暖纸与暗书房」，批准其局部暗面/浅色阅读分工；B/C 仅保留为研究比较，不作为实施候选。PRD、design.md、implement.md 与规范清单已整理，待最新规划批准后启动。现在没有产品改动、截图实现或色彩对比度验收；上述色号为实现起点，需要在实际字号和表面上测量。
