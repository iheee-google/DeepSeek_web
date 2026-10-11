/**
 * 内容模型的类型定义（依赖方向最底层，不依赖任何其它层）。
 *
 * 这些类型是「边界解析后的形状」：Markdown front matter 未经 schema 校验前
 * 一律视为 unknown，禁止直接假设字段存在（Harness §6 T4）。
 */

/** 内容分区。取值为 Obsidian 库的一级目录名，替代粒度混乱的 legacy category。 */
export type Section =
  | 'linuxdo'
  | '目标检测'
  | '安卓逆向'
  | '工作'
  | '毕设'
  | '程序设计'
  | '面试'
  | 'AIGC'
  | '项目'
  | '教父';

/** 笔记体裁。决定渲染版式：不同体裁不套统一模板（用户 m00250 决策）。 */
export type NoteKind =
  | 'thread' // 论坛讨论整理：楼层对置
  | 'glossary' // 科普速查：判定表
  | 'longform' // 技术长文：目录脊 + 正文
  | 'product' // 产品记录：版本时间线 + 截图轨道
  | 'essay' // 理论随笔：定义与对照
  | 'index' // 目录索引页
  | 'unknown';

/** 日期来源。Obsidian 库不存在可信的统一创建时间，必须标注可信度。 */
export type DateSource =
  | 'frontmatter' // created 字段，最可信但仅 2 篇有
  | 'asset-filename' // Typora 粘贴图文件名 image-YYYYMMDDHHMMSSmmm，覆盖 26/67 篇
  | 'source-meta' // 原帖的保存时间/整理时间
  | 'none'; // 41/67 篇无任何日期信号

export interface NoteMeta {
  /** 稳定标识，由文件路径派生 */
  slug: string;
  title: string;
  /** ISO 日期，可选。无日期时归入「未标注」分组，不得用文件 mtime 兜底 */
  date?: string;
  dateSource: DateSource;
  section: Section;
  /** 无损保留原始的 category 值，便于追溯 */
  legacyCategory?: string;
  tags: string[];
  aliases: string[];
  /** 仅 published 生成页面并进入搜索索引 */
  draft: boolean;
  /** 是否为目录索引页，索引进列表但不进搜索结果 */
  isIndex: boolean;
  /** Typora→Obsidian 迁移批次日期，不是创作时间 */
  migratedAt?: string;
  sourcePath?: string;
  sourceUrl?: string;
  /** 原帖地址（linuxdo 帖子） */
  originalUrl?: string;
  author?: string;
  savedAt?: string;
  /** 图片资源目录与计数，用于响应式与占位 */
  assetDir?: string;
  imageCount: number;
  remoteImageCount: number;
  /** 正文结构统计，供版式选择 */
  headings: { depth: number; text: string; id: string }[];
  wordCount: number;
  /** 体裁判定结果 */
  kind: NoteKind;
}

export interface ProjectMeta {
  slug: string;
  title: string;
  /** 需求文档 §4.2 的九个字段 */
  summary: string;
  problem: string;
  role: string;
  tech: string[];
  outcome: string;
  screenshots: string[];
  demoUrl?: string;
  repoUrl?: string;
  /** 时间范围，如 2025.10–2026.3 */
  period?: string;
  featured: boolean;
  order: number;
  draft: boolean;
}
