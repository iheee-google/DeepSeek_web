const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicFiles = new Set(['index.html', 'notes.html']);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

function resolvePublicPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  } catch {
    return null;
  }
  if (pathname === '/') pathname = '/index.html';
  if (pathname.includes('\\') || pathname.includes('\0')) return null;
  const relativePath = path.posix.normalize(pathname).replace(/^\/+/, '');
  if (!relativePath || relativePath.startsWith('..') || relativePath.split('/').some((part) => part.startsWith('.'))) return null;
  if (!publicFiles.has(relativePath) && !relativePath.startsWith('assets/')) return null;
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) return null;
  return filePath;
}

function securityHeaders(contentType) {
  return {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    'Content-Type': contentType,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };
}

function createPreviewServer() {
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Method Not Allowed');
      return;
    }

    const filePath = resolvePublicPath(request.url);
    if (!filePath) {
      response.writeHead(404, securityHeaders('text/plain; charset=utf-8'));
      response.end('Not Found');
      return;
    }

    fs.stat(filePath, (error, stat) => {
      if (error || !stat.isFile()) {
        response.writeHead(404, securityHeaders('text/plain; charset=utf-8'));
        response.end('Not Found');
        return;
      }
      const headers = securityHeaders(mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream');
      headers['Content-Length'] = stat.size;
      response.writeHead(200, headers);
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '127.0.0.1';
  createPreviewServer().listen(port, host, () => {
    console.log(`Preview server: http://${host}:${port}`);
  });
}

module.exports = { createPreviewServer, resolvePublicPath };
