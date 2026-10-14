const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const redirects = '/ /index.html 200\n';
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
try {
  if (fs.lstatSync(dist).isSymbolicLink()) throw new Error('dist/ must not be a symbolic link');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyPublicEntry('index.html');
copyPublicEntry('notes.html');
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
fs.writeFileSync(path.join(dist, '_redirects'), redirects, 'utf8');
fs.writeFileSync(path.join(dist, '_headers'), headers, 'utf8');

const verification = spawnSync(process.execPath, [path.join(__dirname, 'verify-deploy.cjs')], { stdio: 'inherit' });
if (verification.error) throw verification.error;
if (verification.status !== 0) process.exit(verification.status ?? 1);

console.log('Production bundle created at dist/');
console.log('Published entries: index.html, notes.html, assets/, _redirects, _headers');
