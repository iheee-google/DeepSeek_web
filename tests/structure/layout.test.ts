import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * 忽略的目录名。
 *
 * 必须按「路径段」比较，不能用 `abs.includes(name)`：后者会让 `.astro`
 * 同时命中 `src/components/Hero.astro` 这个文件，使所有 .astro 文件被静默跳过，
 * 检查全部失效。
 */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro']);

/** 递归列出目录下所有文件（跳过忽略目录） */
function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = resolve(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

/**
 * 剥掉注释，只留可能出现在界面上的文本。
 *
 * 把注释替换成等量换行，保持行号不变，这样报错位置仍指向原文件。
 */
function stripComments(text: string): string {
  const blanked = (match: string) => '\n'.repeat((match.match(/\n/g) ?? []).length);
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blanked) // /* */、{/* */}、Astro frontmatter 注释
    .replace(/<!--[\s\S]*?-->/g, blanked) // HTML 注释
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1: string) => p1 + blanked(m.slice(p1.length))); // 行注释
}

describe('仓库结构与依赖方向', () => {
  /**
   * Harness §5：分层依赖单向 Types → Config → Repo → Service → Runtime → UI。
   * 这条测试把规则变成可执行断言，文档里就不用重复写。
   */
  const LAYERS = ['types', 'config', 'repo', 'service', 'runtime'] as const;
  const rank = new Map(LAYERS.map((name, i) => [name, i]));

  it('每一层都不得 import 比自己更靠上的层', () => {
    const violations: string[] = [];
    for (const layer of LAYERS) {
      const dir = resolve(ROOT, 'src', layer);
      for (const file of walk(dir).filter((f) => /\.(ts|tsx|astro)$/.test(f))) {
        const text = readFileSync(file, 'utf8');
        const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
        for (const spec of imports) {
          // 只检查指向 src 内部其它层的相对/别名引用
          const target = LAYERS.find(
            (l) => spec.startsWith(`@${l}/`) || spec.includes(`/src/${l}/`),
          );
          if (!target) continue;
          const from = rank.get(layer);
          const to = rank.get(target);
          if (from === undefined || to === undefined) continue;
          if (to > from) {
            violations.push(
              `${relative(ROOT, file)} (${layer}) → ${spec} (${target})：` +
                `依赖方向必须单向 Types → Config → Repo → Service → Runtime → UI，` +
                `下层不得引用上层。`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('内容 Markdown 一律带 front matter 分隔符', () => {
    const dir = resolve(ROOT, 'content');
    if (!existsSync(dir)) return;
    const bad = walk(dir)
      .filter((f) => f.endsWith('.md'))
      .filter((f) => !readFileSync(f, 'utf8').startsWith('---\n'));
    expect(bad.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('界面文案不得含英文破折号（em-dash 禁令）', () => {
    // 依据 design-taste-frontend Pre-Flight Check §9.G：ZERO em-dashes anywhere on the page。
    // 中文破折号「——」属正常中文标点，不在禁令内；此处只查英文 em-dash / en-dash。
    const targets = walk(resolve(ROOT, 'src'));
    const hits: string[] = [];
    for (const file of targets) {
      const text = readFileSync(file, 'utf8');
      // 先剥掉注释再逐行查：注释里可以讨论这条规则本身。
      // 必须整块剥，不能只跳过以 * 或 // 开头的行——
      // Astro 的 {/* ... */} 与 CSS 的 /* ... */ 续行不以 * 开头，会漏检。
      const stripped = stripComments(text);
      stripped.split('\n').forEach((line, i) => {
        if (/[—–]/.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('禁止用 overflow:hidden 做裁剪（会冻结滚动驱动动画）', () => {
    // 依据 docs/design-docs/animation-capabilities.md：任何成为滚动容器的元素
    // 都会冻结其内部 animation-timeline: view()，裁剪一律用 overflow: clip。
    const targets = walk(resolve(ROOT, 'src')).filter((f) => /\.(astro|css|tsx?)$/.test(f));
    const hits: string[] = [];
    for (const file of targets) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/overflow(-[xy])?\s*:\s*(hidden|auto|scroll)/.test(line)) {
            hits.push(
              `${relative(ROOT, file)}:${i + 1}: ${line.trim()} — ` +
                `改用 overflow: clip；hidden/auto/scroll 会让容器成为滚动容器并冻结内部 view() 时间轴`,
            );
          }
        });
    }
    expect(hits).toEqual([]);
  });

  it('prompt-history.txt 已加入 gitignore（Harness §7.3）', () => {
    const ignore = readFileSync(resolve(ROOT, '.gitignore'), 'utf8');
    expect(ignore).toContain('prompt-history.txt');
  });

  it('施工期 docs/HARNESS-RULES.md 必须存在且未被删减', () => {
    // Harness §16：阶段 A–F 全勾完前不得删、不得精简、不就地改写。
    const rules = resolve(ROOT, 'docs', 'HARNESS-RULES.md');
    expect(existsSync(rules)).toBe(true);
    const lines = readFileSync(rules, 'utf8').split('\n').length;
    expect(lines).toBeGreaterThanOrEqual(871);
  });
});
