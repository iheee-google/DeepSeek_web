#!/usr/bin/env node
/**
 * 构建产物浏览器验证。
 *
 * 与 verify-prototypes.mjs 的区别：那个跑在 prototypes/ 的独立 HTML 上，
 * 这个跑在 dist/ 的真实构建产物上，覆盖字体子集、Astro 生成的 HTML、
 * 以及首屏幕次切换。
 *
 * 用法：
 *   node scripts/verify-dist.mjs
 *   PLAYWRIGHT_DIR=/tmp/mosaic/node_modules node scripts/verify-dist.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const SHOTS = resolve(ROOT, 'docs', 'generated', 'dist-shots');

/** 解析 playwright：优先项目依赖，回退 PLAYWRIGHT_DIR */
async function loadPlaywright() {
  const tried = [];
  for (const spec of ['playwright', process.env.PLAYWRIGHT_DIR]) {
    if (!spec) continue;
    const target = spec === 'playwright' ? spec : resolve(spec, 'playwright', 'index.mjs');
    tried.push(target);
    try {
      return await import(target);
    } catch {
      /* 继续尝试下一个 */
    }
  }
  throw new Error(`无法加载 playwright。已尝试：\n  ${tried.join('\n  ')}`);
}

/** 找可用的 Chromium */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    join(process.env.HOME ?? '', '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'),
    join(process.env.HOME ?? '', '.cache/ms-playwright/chromium-1243/chrome-linux/chrome'),
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`找不到 Chromium，已尝试：\n  ${candidates.join('\n  ')}`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/** 起一个只读静态服务器指向 dist/ */
function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = join(DIST, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) path = join(path, 'index.html');
    if (!existsSync(path)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(path)] ?? 'application/octet-stream',
    });
    res.end(readFileSync(path));
  });
  return new Promise((ok) => {
    server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port }));
  });
}

if (!existsSync(DIST)) {
  console.error('dist/ 不存在，先运行 pnpm build。');
  process.exit(1);
}

mkdirSync(SHOTS, { recursive: true });

const { chromium } = await loadPlaywright();
const { server, port } = await serve();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ executablePath: findChrome() });
const results = [];
/** 截图相对路径，供末尾汇总打印。必须在 try 之外声明，否则 finally 之后访问不到。 */
const shots = [];

/** 读首屏状态：当前幕、进度条、字体是否真的加载 */
const PROBE = `(() => {
  const frame = document.querySelector('.frame.is-on');
  const caption = frame?.querySelector('.lines');
  const pct = document.querySelector('.foot .pct-num');
  const rule = document.querySelector('.foot .rule-fill');
  return {
    hero: !!document.getElementById('hero'),
    frames: document.querySelectorAll('.frame').length,
    on: frame ? [...document.querySelectorAll('.frame')].indexOf(frame) : -1,
    title: caption ? caption.textContent.replace(/\\s+/g, '') : '',
    pct: pct ? pct.textContent.trim() : '',
    ruleScale: rule ? getComputedStyle(rule).scale : '',
    past: document.querySelector('.bar')?.dataset.past ?? '',
  };
})()`;

/** 检查横向溢出与错误 */
const HEALTH = `(() => ({
  hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  docH: document.documentElement.scrollHeight,
}))()`;

try {
  // ── 桌面 ────────────────────────────────────────────────
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 字体是否真的应用（子集化后字形缺失会在这里暴露）
  const fonts = await page.evaluate(`(async () => {
    await document.fonts.ready;
    const loaded = [...document.fonts].map(f => f.family + ':' + f.status);
    const h = document.querySelector('.lines');
    return { loaded, hFont: h ? getComputedStyle(h).fontFamily : '' };
  })()`);

  for (const [i, label] of ['a', 'b', 'c', 'd', 'e'].entries()) {
    // 每一幕的中线位置
    const y = await page.evaluate(`(() => {
      const b = document.querySelector('[data-beat="${i}"]');
      if (!b) return 0;
      return b.getBoundingClientRect().top + scrollY + innerHeight / 2 - innerHeight / 2;
    })()`);
    await page.evaluate(`scrollTo(0, ${y})`);
    await page.waitForTimeout(1100);

    const probe = await page.evaluate(PROBE);
    const health = await page.evaluate(HEALTH);
    const file = resolve(SHOTS, `hero-${i}-${label}.png`);
    await page.screenshot({ path: file });
    shots.push(file.replace(`${ROOT}/`, ''));
    results.push({ view: `hero ${i}`, ...probe, ...health, errors: errors.length });
  }

  // 页面底部
  await page.evaluate('scrollTo(0, document.documentElement.scrollHeight)');
  await page.waitForTimeout(700);
  const bottom = await page.evaluate(PROBE);
  const bottomHealth = await page.evaluate(HEALTH);
  await page.screenshot({ path: resolve(SHOTS, 'bottom.png') });
  shots.push('docs/generated/dist-shots/bottom.png');
  results.push({ view: 'bottom', ...bottom, ...bottomHealth, errors: errors.length });

  console.log('\n字体：', JSON.stringify(fonts, null, 2));
  if (errors.length > 0) console.log('\n页面错误：\n  ' + errors.join('\n  '));

  // ── 移动端 ──────────────────────────────────────────────
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mErrors = [];
  mobile.on('pageerror', (e) => mErrors.push(String(e)));
  await mobile.goto(base, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(600);
  const mHealth = await mobile.evaluate(HEALTH);
  const mProbe = await mobile.evaluate(PROBE);
  await mobile.screenshot({ path: resolve(SHOTS, 'mobile-hero.png') });
  shots.push('docs/generated/dist-shots/mobile-hero.png');
  results.push({ view: 'mobile', ...mProbe, ...mHealth, errors: mErrors.length });

  // ── reduced motion ─────────────────────────────────────
  const rm = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const rmErrors = [];
  rm.on('pageerror', (e) => rmErrors.push(String(e)));
  await rm.goto(base, { waitUntil: 'networkidle' });
  await rm.waitForTimeout(600);
  const rmHealth = await rm.evaluate(HEALTH);
  const rmProbe = await rm.evaluate(PROBE);
  const rmAnims = await rm.evaluate('document.getAnimations().length');
  await rm.screenshot({ path: resolve(SHOTS, 'reduced-motion.png') });
  shots.push('docs/generated/dist-shots/reduced-motion.png');
  results.push({
    view: 'reduced-motion',
    ...rmProbe,
    ...rmHealth,
    errors: rmErrors.length,
    anims: rmAnims,
  });
} finally {
  await browser.close();
  server.close();
}

console.log('\n截图：');
for (const s of shots) console.log('  ' + s);

console.table(results);

const failed = results.filter((r) => r.errors > 0 || r.hOverflow);
if (failed.length > 0) {
  console.error(`\n失败 ${failed.length} 项`);
  process.exit(1);
}
console.log('\n全部通过');
