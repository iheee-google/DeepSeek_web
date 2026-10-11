#!/usr/bin/env node
/**
 * 字体子集化（构建后处理）。
 *
 * 为什么必须做：本机 `fc-list :lang=zh` 返回 0 条，系统没有任何中文字体，
 * 所以站点必须自带。但思源宋体/黑体全量各 25MB / 17MB，直接上线会让首屏
 * 白白等 42MB 字体。
 *
 * 做法：扫描 dist/ 下所有 HTML，收集真正用到的字符，用 subset-font 生成
 * 只含这些字形的 woff2，替换掉全量 TTF。
 *
 * 注意：因为站点是纯静态的，dist 里出现的字符就是全部可能出现的字符，
 * 页内搜索、分页等运行时不会引入新字。若将来加入运行时生成的内容
 * （用户输入、外部 API），那些字符不在子集内会回退到系统字体，需要另行处理。
 *
 * 用法：node scripts/subset-fonts.mjs   （由 pnpm build 自动调用）
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import { resolve, dirname, join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const PUBLIC = resolve(ROOT, 'public');

/** 需要子集化的字体。source 是 public/ 下的全量文件，target 是 dist/ 下的产物名。 */
const FONTS = [
  { source: 'NotoSerifSC-VF.ttf', target: 'NotoSerifSC-subset.woff2' },
  { source: 'NotoSansSC-VF.ttf', target: 'NotoSansSC-subset.woff2' },
];

if (!existsSync(DIST)) {
  console.error(
    'dist/ 不存在。先运行 pnpm build 生成站点，或直接跑 pnpm build 让它自动调用本脚本。',
  );
  process.exit(1);
}

/**
 * 静态资源的真正根目录。
 *
 * 无适配器时是 dist/ 本身；一旦 Astro 挂上 @astrojs/cloudflare 适配器，产物会变成
 * dist/client/（静态资源）+ dist/server/（Worker 入口）两层，只有 dist/client/ 会被
 * 当作静态根来服务。
 *
 * 这个区分是必须的：2026-10-11 线上就是踩在这里 —— Cloudflare 的 `npx wrangler deploy`
 * 自动跑了 `astro add cloudflare` 并**二次构建**，字体写进了 dist/ 根（不被服务，woff2 全 404），
 * 而全量 TTF 留在 dist/client/（被原样公开投递，单个 25 MB）。子集化的产物必须落在
 * 真正对外的那一层，否则"构建成功"和"字体可用"是两回事。
 */
function findAssetsRoot() {
  const nested = resolve(DIST, 'client');
  if (existsSync(join(nested, 'index.html'))) return nested;
  return DIST;
}

const ASSETS = findAssetsRoot();

if (ASSETS !== DIST) {
  console.log('检测到适配器布局（dist/client/ + dist/server/），静态资源根为 dist/client/');
}

/** 递归列出目录下所有文件 */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

/**
 * 收集 dist 里所有 HTML 用到的字符。
 *
 * 除了可见文本，还要保留 ASCII 全量：数字、英文、标点会在计数器、
 * 日期、代码片段里出现，漏掉任何一个都会造成字形回退。
 */
function collectChars() {
  const files = walk(ASSETS).filter((f) => extname(f) === '.html');
  const chars = new Set();

  // ASCII 可打印字符全量保留，代价极小
  for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));

  // 站内会用到的中文标点与符号
  for (const ch of '　、。〈〉《》「」『』【】〔〕·—…‘’“”°×÷→←↑↓') chars.add(ch);

  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    for (const ch of html) {
      const cp = ch.codePointAt(0) ?? 0;
      // 跳过控制字符与代理区
      if (cp < 0x20 || (cp >= 0xd800 && cp <= 0xdfff)) continue;
      chars.add(ch);
    }
  }

  return [...chars].join('');
}

const text = collectChars();
const htmlCount = walk(ASSETS).filter((f) => extname(f) === '.html').length;
console.log(
  `扫描 ${htmlCount} 个 HTML（静态根 ${relative(ROOT, ASSETS)}/），收集到 ${[...text].length} 个唯一字符`,
);

let { default: subsetFont } = {};
try {
  ({ default: subsetFont } = await import('subset-font'));
} catch {
  console.error(
    '未找到 subset-font。它声明在 devDependencies 里，请先运行 pnpm install。\n' +
      '如果只想跳过子集化，可从 package.json 的 build 脚本里去掉本步骤。',
  );
  process.exit(1);
}

for (const font of FONTS) {
  const src = resolve(PUBLIC, font.source);
  if (!existsSync(src)) {
    // 必须硬失败。早期版本只打印"跳过"，结果是下面的引用改写照常执行，
    // HTML/CSS 指向 /Xxx-subset.woff2 而 dist 里根本没有该文件 ——
    // 构建"成功"、字体全 404，在没有中文字体的机器上中文整片消失。
    // 静默降级比直接报错危险得多。
    console.error(
      `${font.source} 不在 public/，继续构建会产出指向不存在字体的引用。\n` +
        `  运行 pnpm fonts 准备字体（先查本机常见目录，找不到则从 notofonts/noto-cjk 下载）。`,
    );
    process.exit(1);
  }

  const buf = readFileSync(src);
  const out = await subsetFont(buf, text, { targetFormat: 'woff2' });
  const target = resolve(ASSETS, font.target);
  writeFileSync(target, out);

  const saved = ((1 - out.length / buf.length) * 100).toFixed(1);
  console.log(
    `${font.source}  ${(buf.length / 1024 / 1024).toFixed(1)} MB → ` +
      `${font.target}  ${(out.length / 1024).toFixed(1)} KB  (省 ${saved}%)`,
  );

  // 把全量 TTF 从对外目录里删掉，避免它被一起部署。
  // 注意这里是 ASSETS 而不是 DIST：适配器布局下 TTF 在 dist/client/，
  // 只删 dist/ 根等于没删，实测线上就这样泄露过 25 MB。
  const full = resolve(ASSETS, font.source);
  if (existsSync(full)) unlinkSync(full);
}

/**
 * 改写 HTML 与 CSS 里的字体引用。
 *
 * 关键：`@font-face` 被 Astro 抽进了外部 CSS bundle（dist/_astro/*.css），
 * 不在 HTML 里。只改 HTML 会让 CSS 继续指向已经被删掉的全量 TTF，
 * 结果是字体 404、浏览器回退到系统字体（本机没有任何中文字体，中文就全没了）。
 *
 * 顺带把 preload 的 MIME 从 font/ttf 改成 font/woff2。
 */
const version = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;
const rewritable = ['.html', '.css'];
let rewritten = 0;

for (const file of walk(ASSETS).filter((f) => rewritable.includes(extname(f)))) {
  const source = readFileSync(file, 'utf8');
  const next = source
    .replaceAll('/NotoSerifSC-VF.ttf', `/NotoSerifSC-subset.woff2?v=${version}`)
    .replaceAll('/NotoSansSC-VF.ttf', `/NotoSansSC-subset.woff2?v=${version}`)
    .replaceAll('format("truetype-variations")', 'format("woff2-variations")')
    .replaceAll("format('truetype-variations')", "format('woff2-variations')")
    .replaceAll('type="font/ttf"', 'type="font/woff2"');
  if (next !== source) {
    writeFileSync(file, next);
    rewritten++;
  }
}
console.log(`改写 ${rewritten} 个文件的字体引用（版本 ${version}）`);

// 自我校验：确认没有残留的全量 TTF 引用，并确认每个被引用的字体文件真实存在于对外目录
const problems = [];
for (const file of walk(ASSETS).filter((f) => rewritable.includes(extname(f)))) {
  const source = readFileSync(file, 'utf8');
  for (const name of FONTS) {
    if (source.includes(`/${name.source}`)) problems.push(`${file} 仍引用 /${name.source}`);
    // 引用指向的产物必须真的在对外目录里。这条才是能抓住"构建成功但字体 404"的检查。
    if (source.includes(`/${name.target}`) && !existsSync(resolve(ASSETS, name.target))) {
      problems.push(`${file} 引用了 /${name.target}，但该文件不在 ${relative(ROOT, ASSETS)}/`);
    }
  }
}

/**
 * 最后一道闸：dist 里不得残留任何全量字体文件。
 *
 * 上面两条只看「引用」，抓不住「文件在但没人引用」的情况 —— 而全量 TTF 一旦
 * 留在 dist/，就会被原样上传成公开可下载的静态资源（线上实测发生过：单个文件
 * 25 MB，且因为字体许可方并不介意分发，这类泄漏不会被任何扫描报警）。
 * 引用检查是"怕字体加载不到"，这一条是"怕多送出去 42 MB"。
 */
for (const file of walk(DIST)) {
  if (['.ttf', '.otf', '.ttc'].includes(extname(file))) {
    problems.push(`${file} 是未子集化的全量字体，dist/ 里不应存在`);
  }
}

if (problems.length > 0) {
  console.error('字体自检失败：\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('字体自检通过：所有引用均指向 dist/ 中真实存在的文件，且无全量字体残留');
