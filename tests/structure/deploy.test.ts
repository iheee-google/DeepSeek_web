import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * 这套检查守护的是一次真实事故（2026-10-11）。
 *
 * Cloudflare 的部署命令是 `npx wrangler deploy`。当仓库里没有 wrangler 配置时，
 * wrangler 在非交互环境下会自动执行 `astro add cloudflare`：注入适配器、改写
 * package.json 与 astro.config.mjs，然后**用适配器再构建一次**。
 *
 * 适配器把静态根从 `dist/` 变成 `dist/client/`，于是：
 *   - 字体子集写到了不被服务的位置 → 线上 woff2 全 404
 *   - 全量 TTF 留在了对外目录 → 25 MB 被公开投递
 *
 * 更隐蔽的问题是：CI 构建并验证的是**扁平布局**的 dist/，而线上跑的是带适配器的
 * **第二次构建**。「测试过的」和「上线的」不是同一个东西 —— 所以本地怎么测都发现不了。
 *
 * 修法是让 wrangler.jsonc 存在且声明为 assets-only，wrangler 便会直接按它部署，
 * 不再尝试"配置项目"。这些断言把该状态钉死。
 */

function readJsonc(rel: string): Record<string, unknown> {
  const raw = readFileSync(resolve(ROOT, rel), 'utf8');
  const stripped = raw
    // 行首 `//` 注释（只剥行首，避免误伤 URL 里的 `//`）
    .replace(/^\s*\/\/.*$/gm, '')
    // 尾随逗号：JSONC 允许、JSON.parse 不允许。Prettier 会主动补上，所以必须处理
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(stripped);
}

describe('Cloudflare 部署配置', () => {
  it('wrangler.jsonc 存在（这是阻止 wrangler 擅自改构建的唯一开关）', () => {
    expect(existsSync(resolve(ROOT, 'wrangler.jsonc'))).toBe(true);
  });

  it('wrangler.jsonc 是 assets-only：有 assets.directory，且没有 main 与 assets.binding', () => {
    const cfg = readJsonc('wrangler.jsonc');
    const assets = cfg.assets as Record<string, unknown> | undefined;

    expect(assets).toBeDefined();
    expect(assets?.directory).toBe('./dist');
    // assets-only Worker 不允许有 binding，加了会直接报错
    expect(assets?.binding).toBeUndefined();
    expect(cfg.main).toBeUndefined();
  });

  it('没有引入 @astrojs/cloudflare 适配器', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(all)).not.toContain('@astrojs/cloudflare');
  });

  it('astro.config.mjs 没有启用适配器', () => {
    const cfg = readFileSync(resolve(ROOT, 'astro.config.mjs'), 'utf8');
    expect(cfg).not.toMatch(/@astrojs\/cloudflare/);
    expect(cfg).not.toMatch(/\badapter\s*:/);
    // 本站是纯静态输出，不该出现 output: 'server'
    expect(cfg).toMatch(/output:\s*'static'/);
  });
});

describe('字体子集化脚本的布局兼容性', () => {
  const src = readFileSync(resolve(ROOT, 'scripts/subset-fonts.mjs'), 'utf8');

  it('会探测适配器布局（dist/client/）并以其为静态根', () => {
    expect(src).toMatch(/findAssetsRoot/);
    expect(src).toMatch(/const ASSETS\s*=\s*findAssetsRoot\(\)/);
  });

  it('裸 DIST 只出现在允许的位置', () => {
    // 事故的形态是「路径写死 DIST，漏掉 dist/client/」。
    // 与其逐个断言写法，不如钉住允许清单：任何新增的裸 DIST 用法都会让这条失败。
    const allowed = [
      /^const DIST = resolve\(ROOT, 'dist'\);$/, // 声明
      /^if \(!existsSync\(DIST\)\) \{$/, // 存在性守卫
      /^const nested = resolve\(DIST, 'client'\);$/, // findAssetsRoot 内部
      /^return DIST;$/, // findAssetsRoot 回退
      /^if \(ASSETS !== DIST\) \{$/, // 布局提示
      /^for \(const file of walk\(DIST\)\) \{$/, // 最后一道闸：故意扫全 dist/ 找残留全量字体
    ];

    const offenders = src
      .split('\n')
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(
        ({ line }) => /\bDIST\b/.test(line) && !line.startsWith('//') && !line.startsWith('*'),
      )
      .filter(({ line }) => !allowed.some((re) => re.test(line)));

    expect(offenders).toEqual([]);
  });

  it('删除全量字体与写入子集都指向 ASSETS', () => {
    // 这两处是事故的直接原因：删 dist/ 根目录的 TTF 等于没删（真实文件在 dist/client/）
    expect(src).toMatch(/const full = resolve\(ASSETS, font\.source\)/);
    expect(src).toMatch(/const target = resolve\(ASSETS, font\.target\)/);
  });
});

describe('package.json 构建链', () => {
  it('build 脚本包含字体获取与子集化两步', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.build).toMatch(/fetch-fonts\.mjs/);
    expect(pkg.scripts.build).toMatch(/astro build/);
    expect(pkg.scripts.build).toMatch(/subset-fonts\.mjs/);
  });
});
