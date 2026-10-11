/**
 * 原型统一验证脚本
 *
 * 对 prototypes/ 下的每个原型做四项检查并输出截图：
 *   1. 控制台无 pageerror
 *   2. 无横向溢出（scrollWidth 不超过 clientWidth）
 *   3. 关键元素数量符合预期
 *   4. prefers-reduced-motion: reduce 下降级正常
 *
 * 用法：
 *   node scripts/verify-prototypes.mjs
 *
 * 依赖 Playwright。若本机 Playwright 不在 NODE_PATH 中，设置 PLAYWRIGHT_DIR 指向
 * 含有 playwright 包的目录；浏览器可执行文件路径可用 CHROME_PATH 覆盖。
 */
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PROTOS = resolve(ROOT, 'prototypes');
const SHOTS = resolve(ROOT, 'docs', 'generated', 'prototype-shots');

/**
 * 解析 playwright：优先用项目依赖，回退到 PLAYWRIGHT_DIR 指定的目录。
 * 这样在工程尚未 pnpm install 时也能跑验证。
 */
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
  throw new Error(
    `无法加载 playwright。已尝试：\n  ${tried.join('\n  ')}\n` +
      `请先 pnpm install，或设置 PLAYWRIGHT_DIR 指向含有 playwright 包的目录。`,
  );
}

const { chromium } = await loadPlaywright();

/** 本机 Playwright 浏览器可执行文件，优先取环境变量 */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const home = process.env.HOME ?? '';
  const candidates = [
    `${home}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`,
    `${home}/.cache/ms-playwright/chromium-1243/chrome-linux/chrome`,
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined; // 交给 Playwright 自行解析
}

/**
 * 每个原型：文件、视口、滚动采样点、以及必须成立的断言。
 * assert 返回 { ok, detail }，ok 为 false 时脚本以非零码退出。
 */
const TARGETS = [
  {
    name: 'alpha-scenes',
    file: 'alpha-scenes.html',
    viewport: { width: 1440, height: 900 },
    scrolls: [0, 900, 2700],
    assert: () => {
      const acts = document.querySelectorAll('.act').length;
      const strip = document.querySelectorAll('.strip img').length;
      return { ok: acts === 4 && strip === 12, detail: `act=${acts} strip=${strip}` };
    },
  },
  {
    name: 'beta-organize',
    file: 'beta-organize.html',
    viewport: { width: 1440, height: 900 },
    scrolls: [0, 540, 1200, 2100],
    assert: () => {
      const tiles = [...document.querySelectorAll('.tile')];
      const shown = tiles.filter((t) => t.classList.contains('shown')).length;
      return {
        ok: tiles.length === 14 && shown === 14,
        detail: `tile=${tiles.length} shown=${shown}`,
      };
    },
  },
  {
    name: 'gamma-blinds',
    file: 'gamma-blinds.html',
    viewport: { width: 1440, height: 900 },
    scrolls: [0, 1685, 3370, 5055],
    assert: () => {
      const slats = document.querySelectorAll('.slat').length;
      const rail = document.querySelectorAll('.rail button').length;
      return { ok: slats === 14 && rail === 5, detail: `slat=${slats} rail=${rail}` };
    },
  },
];

/** 横向溢出检查：文档宽度不得超过视口宽度 1px 以上 */
const OVERFLOW_PROBE = () => {
  const de = document.documentElement;
  return { overflow: de.scrollWidth > de.clientWidth + 1, sw: de.scrollWidth, cw: de.clientWidth };
};

async function run() {
  const executablePath = findChrome();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  mkdirSync(SHOTS, { recursive: true });

  let failures = 0;
  const report = [];

  for (const t of TARGETS) {
    const url = `file://${resolve(PROTOS, t.file)}`;
    const page = await browser.newPage({ viewport: t.viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(2200);

    for (const y of t.scrolls) {
      if (y) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(700);
      }
      await page.screenshot({ path: resolve(SHOTS, `${t.name}-${y}.png`) });
    }

    const ov = await page.evaluate(OVERFLOW_PROBE);
    const a = await page.evaluate(t.assert);
    await page.close();

    // reduced-motion 降级
    const rmPage = await browser.newPage({ viewport: t.viewport, reducedMotion: 'reduce' });
    const rmErrors = [];
    rmPage.on('pageerror', (e) => rmErrors.push(String(e).slice(0, 200)));
    await rmPage.goto(url, { waitUntil: 'load' });
    await rmPage.waitForTimeout(1600);
    await rmPage.screenshot({ path: resolve(SHOTS, `${t.name}-reduced-motion.png`) });
    const rm = await rmPage.evaluate(() => ({
      anims: document.getAnimations().length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    await rmPage.close();

    const ok = errors.length === 0 && !ov.overflow && a.ok && rmErrors.length === 0;
    if (!ok) failures++;
    report.push({
      原型: t.name,
      结果: ok ? 'PASS' : 'FAIL',
      断言: a.detail,
      横向溢出: ov.overflow ? `是 (${ov.sw}>${ov.cw})` : '否',
      pageerror: errors.length ? errors.join(' | ') : '无',
      '降级 pageerror': rmErrors.length ? rmErrors.join(' | ') : '无',
      降级动画数: rm.anims,
    });
  }

  await browser.close();
  console.table(report);

  if (failures > 0) {
    console.error(`\n${failures} 个原型未通过验证。`);
    process.exit(1);
  }
  console.log(`\n全部通过。截图已写入 ${SHOTS}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
