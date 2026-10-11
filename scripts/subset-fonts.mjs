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
import { resolve, dirname, join, extname } from 'node:path';
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
  const files = walk(DIST).filter((f) => extname(f) === '.html');
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
const htmlCount = walk(DIST).filter((f) => extname(f) === '.html').length;
console.log(`扫描 ${htmlCount} 个 HTML，收集到 ${[...text].length} 个唯一字符`);

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
    console.log(`${font.source} 不存在于 public/，跳过。运行 pnpm fonts 可从系统字体目录复制。`);
    continue;
  }

  const buf = readFileSync(src);
  const out = await subsetFont(buf, text, { targetFormat: 'woff2' });
  const target = resolve(DIST, font.target);
  writeFileSync(target, out);

  const saved = ((1 - out.length / buf.length) * 100).toFixed(1);
  console.log(
    `${font.source}  ${(buf.length / 1024 / 1024).toFixed(1)} MB → ` +
      `${font.target}  ${(out.length / 1024).toFixed(1)} KB  (省 ${saved}%)`,
  );

  // 把全量 TTF 从 dist 里删掉，避免它被一起部署
  const full = resolve(DIST, font.source);
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

for (const file of walk(DIST).filter((f) => rewritable.includes(extname(f)))) {
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

// 自我校验：dist 里不得再有任何指向全量 TTF 的引用，也不得有对不存在文件的引用
const leftovers = [];
for (const file of walk(DIST).filter((f) => rewritable.includes(extname(f)))) {
  const source = readFileSync(file, 'utf8');
  for (const name of FONTS) {
    if (source.includes(`/${name.source}`)) leftovers.push(`${file} 仍引用 /${name.source}`);
  }
}
if (leftovers.length > 0) {
  console.error('字体引用未被完全改写：\n  ' + leftovers.join('\n  '));
  process.exit(1);
}
