/**
 * 复制站点所需的中文字体。
 *
 * 本机系统字体中没有中文字体（`fc-list :lang=zh` 返回 0 条），而站点必须能渲染中文，
 * 因此从 Windows 字体目录复制思源黑体/宋体的可变字体。
 * 字体体积较大（合计 41 MB）且可随时重建，因此不纳入版本控制。
 *
 * 用法：
 *   node scripts/fetch-fonts.mjs
 *   node scripts/fetch-fonts.mjs --from /path/to/fonts
 *
 * 复制到两处：
 *   prototypes/assets/fonts/  原型直接用（file:// 打开）
 *   public/                   Astro 构建输入；构建时由 scripts/subset-fonts.mjs 子集化为 woff2
 *
 * 说明：思源黑体/宋体（Noto Sans SC / Noto Serif SC）采用 SIL Open Font License 1.1，
 * 允许复制与再分发。生产构建应改用按字符集子集化的 woff2，不要直接引用这两个全量 TTF。
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DESTS = [resolve(ROOT, 'prototypes', 'assets', 'fonts'), resolve(ROOT, 'public')];

const FILES = ['NotoSerifSC-VF.ttf', 'NotoSansSC-VF.ttf'];

/** 候选来源目录，按顺序取第一个存在的 */
const SOURCES = [
  process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : null,
  '/mnt/c/Windows/Fonts',
  `${process.env.HOME}/.fonts`,
  '/usr/share/fonts/truetype/noto',
].filter(Boolean);

for (const d of DESTS) mkdirSync(d, { recursive: true });

let missing = 0;
for (const name of FILES) {
  const src = SOURCES.map((d) => resolve(d, name)).find((p) => existsSync(p));
  if (!src) {
    console.error(`缺失  ${name}  — 已查找：${SOURCES.join(', ')}`);
    missing++;
    continue;
  }
  for (const dest of DESTS) {
    const target = resolve(dest, name);
    if (existsSync(target) && statSync(target).size === statSync(src).size) {
      console.log(`已有  ${name}  → ${dest}`);
      continue;
    }
    copyFileSync(src, target);
    const kb = (statSync(target).size / 1024).toFixed(0);
    console.log(`复制  ${name}  → ${dest}  (${kb} KB)`);
  }
}

if (missing > 0) {
  console.error(
    `\n${missing} 个字体未找到。请从 https://fonts.google.com/noto 下载 Noto Sans SC / Noto Serif SC，` +
      `或用 --from 指定包含这些文件的目录。`,
  );
  process.exit(1);
}
console.log(`\n字体就绪：${DESTS.join(' 与 ')}`);
