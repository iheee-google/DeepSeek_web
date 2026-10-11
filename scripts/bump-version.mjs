#!/usr/bin/env node
/**
 * 版本一致性 bump（docs/HARNESS-RULES.md §7.1）。
 *
 * 规则：前端/后端/根端的版本声明点必须始终一致，禁止手工散改。
 * 本项目是纯 Web 静态站，唯一的版本源是根 package.json，
 * 但脚本按「声明点表」驱动，将来新增声明点只需在 DECLARATIONS 里加一行。
 *
 * 用法：
 *   node scripts/bump-version.mjs 0.2.0        # 指定版本
 *   node scripts/bump-version.mjs minor        # 0.1.0 → 0.2.0
 *   node scripts/bump-version.mjs patch        # 0.1.0 → 0.1.1
 *   node scripts/bump-version.mjs --check      # 只校验一致性，不写入
 *
 * CI 用法：tag 发布时校验 tag == package.json 版本（见 .github/workflows/ci.yml）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 所有版本声明点。每一项是 { file, read, write }：
 * 声明点必须能被机械读写，否则一致性无法保证。
 */
const DECLARATIONS = [
  {
    file: 'package.json',
    read: (text) => JSON.parse(text).version,
    write: (text, v) => text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${v}$2`),
  },
];

function readVersion(decl) {
  const abs = resolve(ROOT, decl.file);
  try {
    return decl.read(readFileSync(abs, 'utf8'));
  } catch (error) {
    throw new Error(`无法读取版本声明点 ${decl.file}：${error.message}`, { cause: error });
  }
}

/** 收集所有声明点的版本，校验是否一致 */
function collect() {
  const entries = DECLARATIONS.map((decl) => ({ decl, version: readVersion(decl) }));
  const unique = new Set(entries.map((e) => e.version));
  if (unique.size > 1) {
    const detail = entries.map((e) => `  ${e.decl.file}: ${e.version}`).join('\n');
    throw new Error(
      `版本不一致（Harness §7.1）。各声明点当前值：\n${detail}\n` +
        `修复：运行 node scripts/bump-version.mjs <版本号> 一次性同步所有声明点，不要手工逐个修改。`,
    );
  }
  return entries;
}

function nextVersion(current, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`当前版本 ${current} 不是 x.y.z 形式，无法自动递增，请显式指定版本号。`);
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${minor + 1}.0.0`;
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`未知的递增类型 ${kind}，可用值：major | minor | patch，或直接给出 x.y.z。`);
}

const arg = process.argv[2];

if (!arg) {
  console.error(
    '用法：node scripts/bump-version.mjs <x.y.z | major | minor | patch | --check>\n' +
      '  --check  只校验各声明点版本是否一致，不写入',
  );
  process.exit(1);
}

const entries = collect();

if (arg === '--check') {
  console.log(`版本一致：${entries[0].version}`);
  process.exit(0);
}

const current = entries[0].version;
const target = /^\d+\.\d+\.\d+$/.test(arg) ? arg : nextVersion(current, arg);

for (const { decl } of entries) {
  const abs = resolve(ROOT, decl.file);
  const text = readFileSync(abs, 'utf8');
  writeFileSync(abs, decl.write(text, target), 'utf8');
  console.log(`${decl.file}  ${current} → ${target}`);
}

console.log(`\n所有声明点已同步到 ${target}。下一步：git commit，然后 tag v${target}。`);
