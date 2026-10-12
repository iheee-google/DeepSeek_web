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

  /**
   * 界面文案里可能出现破折号的文件：src/ 的产物 + prototypes/ 的原型。
   *
   * 为什么必须带上 prototypes/：原型才是用户真正打开评审的东西。只在 src/ 里查，
   * 等于规则在评审现场不生效 —— 实测三个首页原型里就藏着英文 en-dash 和本机路径。
   */
  function copyTargets(): string[] {
    return [
      ...walk(resolve(ROOT, 'src')),
      ...walk(resolve(ROOT, 'prototypes')).filter((f) => /\.(html|css)$/.test(f)),
    ].filter((f) => /\.(astro|html|css|tsx?)$/.test(f));
  }

  it('界面文案不得含英文破折号（em-dash 禁令）', () => {
    // 依据 design-taste-frontend Pre-Flight Check §9.G：ZERO em-dashes anywhere on the page。
    //
    // 判定不能写成 /[—–]/ 一刀切：中文破折号「——」就是两个 U+2014 连写，
    // 那会把《InkWell》的真标题「不只是"文本生成"——Ai 搓出来的…」也判违规。
    // 所以 en-dash 一律禁；em-dash 只在**单独出现**（左右都不是 em-dash）时禁。
    const LONE_DASH = /(?<!—)—(?!—)|–/;
    const hits: string[] = [];
    for (const file of copyTargets()) {
      // 先剥掉注释再逐行查：注释里可以讨论这条规则本身。
      // 必须整块剥，不能只跳过以 * 或 // 开头的行——
      // Astro 的 {/* ... */} 与 CSS 的 /* ... */ 续行不以 * 开头，会漏检。
      stripComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, i) => {
          if (LONE_DASH.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it('页面文案不得出现本机绝对路径', () => {
    // 依据 docs/product-specs/notes.md：source_path 只是溯源用的元数据，不渲染给读者。
    // 原型的「来源」行曾直接写出 /mnt/d/code/简历/1.md 与 /mnt/d/Obsidian/iheee/，
    // 把作者的本机目录结构摆到了评审页上。
    const hits: string[] = [];
    for (const file of copyTargets()) {
      stripComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, i) => {
          const m = /(?:^|["'\s(=])(\/(?:mnt|home|Users|Users\/[^/]+)\/[^\s"'<>)]*)/.exec(line);
          if (m) hits.push(`${relative(ROOT, file)}:${i + 1}: ${m[1]}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it('时间尺上的位置必须与它标注的日期一致', () => {
    // 这条断言来自一次真实的静默错误：横尺的年份轴标签整体写错了一年，
    // 「2024 机器人大赛」和标着「2023」的年份刻度挤在同一个位置。
    // --t 与标签文本是两个各自独立写下的值，没有任何东西约束它们一致，
    // 所以必须由测试来算一遍：t == 该日期距轴起点的月数 / 轴总月数。
    const months = (y: number, m: number) => y * 12 + m;
    const hits: string[] = [];
    for (const file of walk(resolve(ROOT, 'prototypes')).filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(file, 'utf8');
      const axis = /data-axis="(\d{4})-(\d{2})"/.exec(html);
      const axisEnd = /data-axis-end="(\d{4})-(\d{2})"/.exec(html);
      if (!axis || !axisEnd) continue;
      const start = months(Number(axis[1]), Number(axis[2]));
      const span = months(Number(axisEnd[1]), Number(axisEnd[2])) - start;
      // 取每个带 --t 且文本里含年份的元素。'.yl' 只有年份，'.ev b' 形如 2022.09。
      const re = /<span[^>]*style="[^"]*--t:([\d.]+)[^"]*"[^>]*>([^<]*)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const t = Number(m[1]);
        const text = m[2] ?? '';
        const date = /(\d{4})(?:\.(\d{2}))?/.exec(text);
        if (!date) continue;
        // 只知道年份的事件按该年 1 月落点，与 HTML 里的刻度约定一致。
        const year = Number(date[1]);
        const month = date[2] ? Number(date[2]) : 1;
        const expected = (months(year, month) - start) / span;
        if (Math.abs(t - expected) > 0.002) {
          hits.push(
            `${relative(ROOT, file)}: 「${text.trim()}」标在 --t:${t}，` +
              `按轴 2022-09 → 2026-10 应为 ${expected.toFixed(4)}`,
          );
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('横尺的年份刻度线与年份数字必须落在同一位置', () => {
    // 轴上的短线（.tick.yr）与它上方的数字（.yl）在 HTML 里是各写一遍的 --t。
    // 两者不一致时，线和字都还在，只是错开；页面不报错，在一条 49 个月长的轴上
    // 肉眼也未必看得出来。这条断言是补第一次「故意写错」时发现的洞。
    const hits: string[] = [];
    for (const file of walk(resolve(ROOT, 'prototypes')).filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(file, 'utf8');
      const ticks = new Set<string>();
      for (const m of html.matchAll(
        /<span[^>]*class="[^"]*\btick\b[^"]*\byr\b[^"]*"[^>]*style="--t:([\d.]+)"/g,
      )) {
        ticks.add(m[1] ?? '');
      }
      if (ticks.size === 0) continue;
      for (const m of html.matchAll(
        /<span[^>]*class="[^"]*\byl\b[^"]*"[^>]*style="--t:([\d.]+)"[^>]*>(\d{4})</g,
      )) {
        if (!ticks.has(m[1] ?? '')) {
          hits.push(
            `${relative(ROOT, file)}: 年份数字 ${m[2]} 落在 --t:${m[1]}，` +
              `但轴上没有同位置的年份刻度线`,
          );
        }
      }
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
