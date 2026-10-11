/**
 * 准备站点所需的中文字体。
 *
 * 为什么必须自带：本机 `fc-list :lang=zh` 返回 0 条，系统没有任何中文字体，
 * 而站点必须能渲染中文。字体体积较大（合计 42 MB）且可随时重建，因此不纳入版本控制。
 *
 * 两步：
 *   1. 先从本机常见字体目录复制（快，离线可用）
 *   2. 找不到就从 notofonts/noto-cjk 官方仓库下载（CI 环境走这条）
 *
 * 用法：
 *   node scripts/fetch-fonts.mjs                自动：先本机，再下载
 *   node scripts/fetch-fonts.mjs --from DIR     优先从 DIR 复制
 *   node scripts/fetch-fonts.mjs --no-download  禁止联网（离线环境）
 *
 * 复制到两处：
 *   prototypes/assets/fonts/  原型直接用（file:// 打开）
 *   public/                   Astro 构建输入；构建时由 scripts/subset-fonts.mjs 子集化为 woff2
 *
 * 说明：思源黑体/宋体（Noto Sans SC / Noto Serif SC）采用 SIL Open Font License 1.1，
 * 允许复制、下载与再分发。生产构建使用按字符集子集化的 woff2，不直接引用这两个全量 TTF。
 */
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DESTS = [resolve(ROOT, 'prototypes', 'assets', 'fonts'), resolve(ROOT, 'public')];

/** 字体清单。remote 是 notofonts/noto-cjk 官方仓库的 raw 地址。 */
const FILES = [
  {
    name: 'NotoSerifSC-VF.ttf',
    remote:
      'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/Variable/TTF/Subset/NotoSerifSC-VF.ttf',
  },
  {
    name: 'NotoSansSC-VF.ttf',
    remote:
      'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf',
  },
];

const argv = process.argv;
const fromDir = argv.includes('--from') ? argv[argv.indexOf('--from') + 1] : null;
const allowDownload = !argv.includes('--no-download');

/** 本机候选来源目录，按顺序取第一个存在的 */
const SOURCES = [
  fromDir,
  '/mnt/c/Windows/Fonts',
  `${process.env.HOME}/.fonts`,
  '/usr/share/fonts/truetype/noto',
].filter(Boolean);

for (const d of DESTS) mkdirSync(d, { recursive: true });

/** 下载到内存。跟随重定向，带超时与体积下限校验。 */
async function download(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // 真字体有十几 MB；小于 1 MB 说明拿到的是错误页或 Git LFS 指针
  if (buf.length < 1024 * 1024) throw new Error(`内容过小（${buf.length} 字节），可能不是字体文件`);
  return buf;
}

let failed = 0;
for (const { name, remote } of FILES) {
  // 本机来源存在时用它比对体积，避免半截文件被当成"已就绪"
  const localSrc = SOURCES.map((d) => resolve(d, name)).find((p) => existsSync(p));
  const needed = DESTS.filter((dest) => {
    const target = resolve(dest, name);
    if (!existsSync(target)) return true;
    return localSrc ? statSync(target).size !== statSync(localSrc).size : false;
  });

  if (needed.length === 0) {
    console.log(`已有  ${name}`);
    continue;
  }

  /** null 表示走本机复制（避免把 25 MB 读进内存） */
  let payload = null;
  /** 仅用于打印来源，后续只读 */
  let origin;

  if (localSrc) {
    origin = localSrc;
  } else if (allowDownload) {
    try {
      payload = await download(remote);
      origin = remote;
    } catch (err) {
      console.error(`失败  ${name}  — 下载出错：${err.message}`);
      failed++;
      continue;
    }
  } else {
    console.error(`缺失  ${name}  — 本机未找到（已查找：${SOURCES.join(', ')}），且已禁用下载`);
    failed++;
    continue;
  }

  for (const dest of needed) {
    const target = resolve(dest, name);
    if (payload) writeFileSync(target, payload);
    else copyFileSync(origin, target);
    const mb = (statSync(target).size / 1024 / 1024).toFixed(1);
    console.log(`取得  ${name}  → ${dest}  (${mb} MB)`);
  }
  console.log(`      来源：${origin}`);
}

if (failed > 0) {
  console.error(
    `\n${failed} 个字体未就绪。可手动从 https://fonts.google.com/noto 下载 Noto Sans SC / Noto Serif SC，` +
      `解压后用 --from 指定目录。`,
  );
  process.exit(1);
}
console.log(`\n字体就绪：${DESTS.join(' 与 ')}`);
