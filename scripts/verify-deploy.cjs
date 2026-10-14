const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const allowedTopLevel = new Set(['index.html', 'notes.html', 'assets', '_redirects', '_headers']);
const requiredHeaders = [
  'Content-Security-Policy:',
  'Referrer-Policy:',
  'X-Content-Type-Options:',
  'X-Frame-Options:',
  'Permissions-Policy:'
];

function fail(message) {
  console.error(`Deploy verification failed: ${message}`);
  process.exit(1);
}

function assertFile(relativePath) {
  const filePath = path.join(dist, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) fail(`missing file ${relativePath}`);
}

if (!fs.existsSync(dist) || !fs.lstatSync(dist).isDirectory()) fail('dist/ is missing or not a real directory');
if (fs.lstatSync(dist).isSymbolicLink()) fail('dist/ must not be a symbolic link');

for (const entry of fs.readdirSync(dist)) {
  if (!allowedTopLevel.has(entry)) fail(`unexpected top-level entry ${entry}`);
  if (fs.lstatSync(path.join(dist, entry)).isSymbolicLink()) fail(`symbolic link is not publishable: ${entry}`);
}

assertFile('index.html');
assertFile('notes.html');
assertFile('_redirects');
assertFile('_headers');
assertFile('assets/data/archive.js');

if (fs.readFileSync(path.join(dist, '_redirects'), 'utf8') !== '/ /index.html 200\n') fail('root proxy rule is missing or changed');

const headers = fs.readFileSync(path.join(dist, '_headers'), 'utf8');
for (const header of requiredHeaders) {
  if (!headers.includes(header)) fail(`missing header declaration ${header}`);
}

const archive = fs.readFileSync(path.join(dist, 'assets/data/archive.js'), 'utf8');
if (!archive.includes('window.CORLEONE_ARCHIVE')) fail('generated archive data is missing');

function rejectSymlinks(relativeDir) {
  const directory = path.join(dist, relativeDir);
  for (const entry of fs.readdirSync(directory)) {
    const relativePath = path.join(relativeDir, entry);
    const filePath = path.join(dist, relativePath);
    if (entry.startsWith('.')) fail(`hidden path is not publishable: ${relativePath}`);
    if (fs.lstatSync(filePath).isSymbolicLink()) fail(`symbolic link is not publishable: ${relativePath}`);
    if (fs.statSync(filePath).isDirectory()) rejectSymlinks(relativePath);
  }
}

rejectSymlinks('assets');
console.log('Deploy bundle verified: allowlist, generated data, headers, and symlink boundary passed.');
