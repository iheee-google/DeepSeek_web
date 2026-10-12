#!/usr/bin/env node
/**
 * 三个首页原型的浏览器断言。
 *
 * 只跑桌面视口：用户在 2026-10-12 明确「可以先暂时不管手机端 web 的开发」，
 * 所以这里不新增移动端断言（已有的 verify-dist.mjs 仍跑 390×844）。
 *
 * 关键检查：滚动驱动动画写错时不会报错、只会静默失效（见
 * docs/design-docs/animation-capabilities.md 第 6 条），所以必须读
 * getComputedStyle(el).animationName 确认它不是 none。
 *
 * 用法：
 *   node scripts/verify-home-prototypes.mjs
 *   PLAYWRIGHT_DIR=/tmp/mosaic/node_modules node scripts/verify-home-prototypes.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = resolve(ROOT, 'docs', 'generated', 'home-shots');
const FILES = [
  'prototypes/home-a-record.html',
  'prototypes/home-b-cases.html',
  'prototypes/home-c-corpus.html',
];

/**
 * 每个原型「应该有」的滚动驱动动画数量下限。
 *
 * 为什么需要这个数字：只检查 animationName 是不够的。2026-10-12 故意把
 * `animation-timeline` 折进 `animation` 简写（构建压缩器真实的失效方式）后，
 * 那条规则的元素 computed animationTimeline 变成 auto，于是它**从探针结果里
 * 整个消失了** —— 数量 27 掉到 26，而 animationName=none 仍然是 0，检查全绿。
 * 静默失效的第二种形态是「元素不见了」，所以必须同时守住数量。
 * 数量变化时同步更新这里的数字，并在提交信息里说明原因。
 */
const MIN_TIMELINES = {
  'home-a-record': 10,
  'home-b-cases': 4,
  'home-c-corpus': 27,
};

async function loadPlaywright() {
  const tried = [];
  for (const spec of ['playwright', process.env.PLAYWRIGHT_DIR]) {
    if (!spec) continue;
    const target = spec === 'playwright' ? spec : resolve(spec, 'playwright', 'index.mjs');
    tried.push(target);
    try {
      return await import(target);
    } catch {
      /* 试下一个 */
    }
  }
  throw new Error(`无法加载 playwright。已尝试：\n  ${tried.join('\n  ')}`);
}

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

function serve() {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const abs = resolve(ROOT, '.' + url);
    if (!abs.startsWith(ROOT) || !existsSync(abs) || !statSync(abs).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(abs)] ?? 'application/octet-stream' });
    res.end(readFileSync(abs));
  });
  return new Promise((ok) =>
    server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })),
  );
}

/** 页面里所有滚动/视图驱动动画的 computed animationName 集合 */
const TIMELINE_PROBE = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const tl = cs.animationTimeline;
    if (tl && tl !== 'auto' && !tl.startsWith('auto')) {
      out.push({
        tl,
        name: cs.animationName,
        sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\\s+/).join('.') : ''),
      });
    }
  }
  return out;
})()`;

const OVERFLOW_PROBE = `({
  docW: document.documentElement.scrollWidth,
  viewW: document.documentElement.clientWidth,
  wide: [...document.querySelectorAll('*')]
    .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
    .slice(0, 6)
    .map(el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\\s+/)[0] : '')
      + ' → ' + Math.round(el.getBoundingClientRect().right)),
})`;

const FONT_PROBE = `(async () => {
  await document.fonts.ready;
  const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
  return {
    loaded: [...new Set(loaded)],
    serif: document.fonts.check('16px "Noto Serif SC"'),
    sans: document.fonts.check('16px "Noto Sans SC"'),
  };
})()`;

const { server, port } = await serve();
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChrome() });
mkdirSync(SHOTS, { recursive: true });

const results = [];
let failed = 0;

for (const file of FILES) {
  const name = file.replace(/^prototypes\//, '').replace(/\.html$/, '');
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  // console 消息里不带 URL，404 必须单独抓，否则只知道「有个资源失败了」
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`);
  });

  // 无视差地把整个页面量一遍，再回到顶部逐屏截图
  await page.goto(`http://127.0.0.1:${port}/${file}`, { waitUntil: 'load' });
  await page.evaluate('document.fonts.ready');
  await page.waitForTimeout(1400); // 让入场动画跑完

  const fonts = await page.evaluate(FONT_PROBE);
  const timelines = await page.evaluate(TIMELINE_PROBE);
  const silent = timelines.filter((t) => t.name === 'none');

  const height = await page.evaluate('document.documentElement.scrollHeight');
  const stops = [0, 0.22, 0.46, 0.72, 0.95];
  const shots = [];
  for (let i = 0; i < stops.length; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((height - 900) * stops[i]));
    await page.waitForTimeout(700);
    const of = await page.evaluate(OVERFLOW_PROBE);
    const out = join(SHOTS, `${name}-${i}.png`);
    await page.screenshot({ path: out });
    shots.push(out);
    if (of.docW > of.viewW + 1) {
      failed++;
      errors.push(
        `横向溢出 @${stops[i]}: scrollWidth ${of.docW} > ${of.viewW} — ${JSON.stringify(of.wide)}`,
      );
    }
  }

  // reduced-motion：滚动驱动动画必须停住
  const rm = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rm.newPage();
  const rmErrors = [];
  rmPage.on('pageerror', (e) => rmErrors.push('pageerror: ' + e.message));
  await rmPage.goto(`http://127.0.0.1:${port}/${file}`, { waitUntil: 'load' });
  await rmPage.evaluate('document.fonts.ready');
  await rmPage.waitForTimeout(900);
  const rmRunning = await rmPage.evaluate(
    `document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming?.().duration > 20).length`,
  );
  const rmOpacity = await rmPage.evaluate(
    `Math.min(...[...document.querySelectorAll('section, footer')].map(el => +getComputedStyle(el).opacity))`,
  );
  await rmPage.screenshot({ path: join(SHOTS, `${name}-reduced-motion.png`) });
  await rm.close();

  if (errors.length) failed++;
  if (silent.length) failed++;
  if (timelines.length < (MIN_TIMELINES[name] ?? 0)) {
    failed++;
    errors.push(
      `滚动驱动动画只剩 ${timelines.length} 个，少于期望的 ${MIN_TIMELINES[name]} 个 —— ` +
        `说明某条 animation-timeline 规则没有落到元素上（静默失效）`,
    );
  }
  if (!fonts.serif || !fonts.sans) failed++;
  if (rmRunning > 0) failed++;
  if (rmOpacity < 0.95) failed++;

  results.push({
    file: name,
    fonts,
    animations: {
      total: timelines.length,
      expected: MIN_TIMELINES[name] ?? 0,
      silent: silent.length,
      silentList: silent.slice(0, 5),
    },
    errors,
    reducedMotion: { running: rmRunning, minOpacity: rmOpacity, errors: rmErrors },
    shots,
  });
  await ctx.close();
}

await browser.close();
server.close();

for (const r of results) {
  console.log(`\n── ${r.file}`);
  console.log(
    `   字体      serif=${r.fonts.serif} sans=${r.fonts.sans} loaded=${JSON.stringify(r.fonts.loaded)}`,
  );
  console.log(
    `   滚动动画  ${r.animations.total} 个（下限 ${r.animations.expected}），animationName=none 的 ${r.animations.silent}`,
  );
  if (r.animations.silentList.length)
    console.log(`             静默失效: ${JSON.stringify(r.animations.silentList)}`);
  console.log(
    `   降级      reduced-motion 下仍在跑 ${r.reducedMotion.running} 个，最低不透明度 ${r.reducedMotion.minOpacity}`,
  );
  console.log(`   报错      ${r.errors.length ? JSON.stringify(r.errors, null, 2) : '无'}`);
}
console.log(`\n截图 → docs/generated/home-shots/`);
console.log(failed ? `\n✗ ${failed} 项未通过` : `\n✓ 三个原型全部通过`);
process.exit(failed ? 1 : 0);
