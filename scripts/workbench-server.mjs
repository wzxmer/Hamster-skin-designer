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

const WORKBENCH_ROOT = 'apps/workbench';
const DEFAULT_ENTRY = `${WORKBENCH_ROOT}/index.html`;
const ROOT_ALIAS_PREFIXES = new Set(['src', 'public']);
const ROOT_ALIAS_FILES = new Set(['styles.css', 'index.html']);

function resolveRequestPath(url) {
  const parsed = new URL(url, `http://${host}:${port}`);
  const decoded = decodeURIComponent(parsed.pathname);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  let mapped = DEFAULT_ENTRY;
  if (normalized) {
    const firstSegment = normalized.split(/[\\/]/)[0];
    mapped = (
      ROOT_ALIAS_PREFIXES.has(firstSegment)
      || ROOT_ALIAS_FILES.has(normalized)
    )
      ? path.posix.join(WORKBENCH_ROOT, normalized)
      : normalized;
  }
  const target = path.resolve(root, mapped);
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
