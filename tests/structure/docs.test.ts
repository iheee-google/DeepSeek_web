import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Harness §2.1 规定的文档布局。
 *
 * 这条检查的价值在于：文档缺失是**静默**的——没人读的时候不会报错。
 * 把它写成断言，缺文件时 CI 直接红。
 */
const REQUIRED_DOCS = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'docs/CI.md',
  'docs/requirements.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/PLANS.md',
  'docs/PRODUCT_SENSE.md',
  'docs/QUALITY_SCORE.md',
  'docs/RELIABILITY.md',
  'docs/SECURITY.md',
  'docs/design-docs/index.md',
  'docs/design-docs/core-beliefs.md',
  'docs/exec-plans/tech-debt-tracker.md',
  'docs/product-specs/index.md',
] as const;

/** 每份文档必须含的章节标题（Harness §6 T9：必填节） */
const REQUIRED_SECTIONS: Record<string, string[]> = {
  'docs/DESIGN.md': ['## 变更历史'],
  'docs/FRONTEND.md': ['## 变更历史'],
  'docs/PLANS.md': ['## 变更历史'],
  'docs/PRODUCT_SENSE.md': ['## 变更历史'],
  'docs/QUALITY_SCORE.md': ['## 变更历史'],
  'docs/RELIABILITY.md': ['## 变更历史'],
  'docs/SECURITY.md': ['## 变更历史'],
};

describe('文档布局与必填节（Harness §2.1 / §6 T9）', () => {
  it('§2.1 要求的文档全部存在', () => {
    const missing = REQUIRED_DOCS.filter((p) => !existsSync(resolve(ROOT, p)));
    expect(
      missing,
      `缺失文档，补齐或同步更新 Harness §2.1 与本测试：\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });

  it('文档含有必填节', () => {
    const problems: string[] = [];
    for (const [file, sections] of Object.entries(REQUIRED_SECTIONS)) {
      const abs = resolve(ROOT, file);
      if (!existsSync(abs)) continue; // 上一条测试负责报缺失
      const text = readFileSync(abs, 'utf8');
      for (const section of sections) {
        if (!text.includes(section)) problems.push(`${file} 缺必填节 ${section}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('AGENTS.md 不超过 100 行（Harness §2.3 禁止巨型 AGENTS.md）', () => {
    const lines = readFileSync(resolve(ROOT, 'AGENTS.md'), 'utf8').split('\n').length;
    expect(
      lines,
      `AGENTS.md 已 ${lines} 行，超过 100 行上限。` +
        `修法：把细节移到 docs/ 下对应文档，AGENTS.md 只留地图与「先读什么」。`,
    ).toBeLessThanOrEqual(100);
  });

  it('docs/ 下的相对链接都指向真实存在的文件', () => {
    const problems: string[] = [];
    for (const file of walk(resolve(ROOT, 'docs')).filter((f) => f.endsWith('.md'))) {
      const text = readFileSync(file, 'utf8');
      // 只查相对链接；外部 http(s) 链接不在此检查范围（站点无网络依赖，链接失效不影响构建）
      for (const m of text.matchAll(/\]\((\.\.?\/[^)#\s]+)/g)) {
        const target = resolve(dirname(file), m[1] ?? '');
        if (!existsSync(target)) {
          problems.push(`${relative(ROOT, file)} → ${m[1]}（不存在）`);
        }
      }
    }
    expect(problems, `以下交叉链接失效：\n  ${problems.join('\n  ')}`).toEqual([]);
  });

  it('技术债清单每条都有「还债条件」', () => {
    const text = readFileSync(resolve(ROOT, 'docs/exec-plans/tech-debt-tracker.md'), 'utf8');
    const entries = text.split(/^### /m).slice(1);
    expect(entries.length, '技术债清单没有条目').toBeGreaterThan(0);
    const missing = entries
      .filter((e) => !e.includes('还债条件'))
      .map((e) => e.split('\n')[0]?.trim() ?? '(无标题)');
    expect(
      missing,
      `以下技术债条目缺「还债条件」，无法判断何时该还：\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });
});

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', 'generated']);

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = resolve(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}
