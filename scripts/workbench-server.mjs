import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4317);
const host = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function resolveRequestPath(url) {
  const parsed = new URL(url, `http://${host}:${port}`);
  const decoded = decodeURIComponent(parsed.pathname);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const target = path.resolve(root, normalized || 'index.html');
  if (!target.startsWith(root)) return null;
  if (existsSync(target) && statSync(target).isDirectory()) {
    return path.join(target, 'index.html');
  }
  return target;
}

const server = http.createServer((request, response) => {
  const target = resolveRequestPath(request.url || '/');
  if (!target || !existsSync(target)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const ext = path.extname(target).toLowerCase();
  response.writeHead(200, {
    'content-type': MIME_TYPES[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Workbench server: http://${host}:${port}/`);
});
