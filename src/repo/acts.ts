/**
 * 首屏五幕数据（Repo 层：内容数据来源，依赖 Types）。
 *
 * 标题文案已由用户 m00510 复核定稿（「现在的可以」），不得改写。
 * 出处标注（source 字段）是可核对设计的一部分：每句事实都能回到原文行号。
 */

export interface Act {
  /** 年份或时段，显示在标题上方的小字 */
  year: string;
  /** 标题按行拆分。中文排版下按语义断行，不靠自动换行 */
  lines: string[];
  img: string;
  /** 右侧出处：笔记中的章节与行号 */
  source: string;
}

export const ACTS: Act[] = [
  {
    year: '1945',
    lines: ['本纳瑟拉的', '女儿被打了。'],
    img: '/img/acts/1945-office.jpg',
    source: '《教父》三部曲全景笔记 · 第 41 行',
  },
  {
    year: '1945 冬',
    lines: ['橙子滚了', '一地。'],
    img: '/img/acts/1945-oranges.jpg',
    source: '视听语言 · 第 1 个符号 · 第 764 行',
  },
  {
    year: '1951',
    lines: ['五大家族', '坐在一起。'],
    img: '/img/acts/1951-meeting.jpg',
    source: '编年史 · 第 699 行',
  },
  {
    year: '1955',
    lines: ['他在教堂里', '否认撒旦。'],
    img: '/img/acts/1955-baptism.jpg',
    source: '视听语言 · 第 2 个符号 · 第 773 行',
  },
  {
    year: '1997',
    lines: ['院子里', '没有人。'],
    img: '/img/acts/1997-yard.jpg',
    source: '编年史 · 第 708 行',
  },
];
