import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProject,
  exportProjectShare,
  getAvailableTemplates,
  importProjectShare,
  importProjectPackage,
  loadDefaultProject,
  loadPresetProject,
  loadProjectTemplateMeta,
  loadTemplateProject,
  listTemplatePresets,
  packageProject,
  validateProjectInput,
} from './template-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const webRoot = path.join(projectRoot, 'apps', 'web');
const packagesRoot = path.join(projectRoot, 'packages');
const host = '127.0.0.1';
const port = 4317;

function getRequestUrl(req) {
  return new URL(req.url, `http://${host}:${port}`);
}

function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.md')) return 'text/markdown; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function resolveStaticPath(requestPath) {
  if (requestPath === '/') {
    return path.join(webRoot, 'index.html');
  }

  if (requestPath.startsWith('/packages/')) {
    const relativePath = requestPath.slice('/packages/'.length);
    const finalPath = path.resolve(packagesRoot, relativePath);
    if (finalPath.startsWith(packagesRoot)) {
      return finalPath;
    }
    return null;
  }

  const relativePath = requestPath.replace(/^\/+/, '');
  const finalPath = path.resolve(webRoot, relativePath);
  if (finalPath.startsWith(webRoot)) {
    return finalPath;
  }
  return null;
}

async function serveStatic(req, res) {
  const requestPath = getRequestUrl(req).pathname;
  const filePath = resolveStaticPath(requestPath);
  const finalPath = filePath && existsSync(filePath) ? filePath : path.join(webRoot, 'index.html');
  const file = await readFile(finalPath);
  res.writeHead(200, { 'Content-Type': contentType(finalPath) });
  res.end(file);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.url === '/api/health') {
      json(res, 200, { ok: true, service: 'hamster-skin-designer' });
      return;
    }

    if (req.url === '/api/templates' && req.method === 'GET') {
      json(res, 200, {
        ok: true,
        templates: getAvailableTemplates(),
      });
      return;
    }

    if (req.url.startsWith('/api/template/meta') && req.method === 'GET') {
      const requestUrl = getRequestUrl(req);
      const templateId = requestUrl.searchParams.get('templateId') || undefined;
      const payload = await loadProjectTemplateMeta(templateId);
      json(res, 200, payload);
      return;
    }

    if (req.url.startsWith('/api/project/default') && req.method === 'GET') {
      const requestUrl = getRequestUrl(req);
      const templateId = requestUrl.searchParams.get('templateId');
      const payload = templateId ? await loadTemplateProject(templateId) : await loadDefaultProject();
      const validation = validateProjectInput(payload, payload.templateId);
      json(res, 200, {
        ok: true,
        project: payload,
        templates: getAvailableTemplates(),
        validation: validation.validation,
      });
      return;
    }

    if (req.url === '/api/project/validate' && req.method === 'POST') {
      const body = await readBody(req);
      const payload = validateProjectInput(body.project, body.templateId);
      json(res, 200, {
        ok: true,
        project: payload.normalizedProject,
        validation: payload.validation,
      });
      return;
    }

    if (req.url.startsWith('/api/presets') && req.method === 'GET') {
      const requestUrl = getRequestUrl(req);
      const templateId = requestUrl.searchParams.get('templateId') || undefined;
      const payload = await listTemplatePresets(templateId);
      json(res, 200, payload);
      return;
    }

    if (req.url.startsWith('/api/preset') && req.method === 'GET') {
      const requestUrl = getRequestUrl(req);
      const templateId = requestUrl.searchParams.get('templateId') || undefined;
      const presetId = requestUrl.searchParams.get('presetId');
      const payload = await loadPresetProject(templateId, presetId);
      json(res, 200, payload);
      return;
    }

    if (req.url === '/api/share/export' && req.method === 'POST') {
      const body = await readBody(req);
      const payload = exportProjectShare(body.project, body.templateId);
      json(res, 200, payload);
      return;
    }

    if (req.url === '/api/share/import' && req.method === 'POST') {
      const body = await readBody(req);
      const payload = importProjectShare(body.shareCode, body.templateId);
      json(res, 200, payload);
      return;
    }

    if (req.url === '/api/project/import-package' && req.method === 'POST') {
      const body = await readBody(req);
      const fileBuffer = Buffer.from(body.fileData || '', 'base64');
      const payload = await importProjectPackage(fileBuffer, body.fileName || 'import.cskin', body.templateId);
      json(res, 200, payload);
      return;
    }

    if (req.url === '/api/build' && req.method === 'POST') {
      const body = await readBody(req);
      const result = await buildProject(body.project, { templateId: body.templateId });
      json(res, 200, {
        ok: true,
        outputDir: result.outputDir,
        files: result.files,
        template: result.template ? {
          id: result.template.id,
          displayName: result.template.displayName,
          version: result.template.version,
        } : null,
        validation: result.validation,
      });
      return;
    }

    if (req.url === '/api/package' && req.method === 'POST') {
      const body = await readBody(req);
      const result = await packageProject(body.project, { templateId: body.templateId });
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.zipName)}"`,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(result.fileBuffer);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      stage: error?.stage || null,
      command: error?.command || null,
      stdout: error?.stdout || '',
      stderr: error?.stderr || '',
    });
  }
});

server.listen(port, host, () => {
  console.log(`Hamster Skin Designer running at http://${host}:${port}`);
});
