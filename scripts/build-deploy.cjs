const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const headers = `/*
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`;

function runContentBuild() {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'build-content.cjs')], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function copyPublicEntry(name) {
  fs.copyFileSync(path.join(root, name), path.join(dist, name));
}

runContentBuild();
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyPublicEntry('index.html');
copyPublicEntry('notes.html');
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
fs.writeFileSync(path.join(dist, '_headers'), headers, 'utf8');

console.log('Production bundle created at dist/');
console.log('Published entries: index.html, notes.html, assets/, _headers');
