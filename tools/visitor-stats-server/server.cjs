const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'change-this-salt';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'visitor-stats.json');

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGIN || origin || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function sendJson(response, statusCode, payload, origin) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders(origin),
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 16 * 1024) {
        reject(new Error('request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { visitors: {} };
  } catch {
    return { visitors: {} };
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function clientIp(request) {
  return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || '')
    .split(',')[0]
    .trim();
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(`${IP_HASH_SALT}:${ip}`).digest('hex');
}

function isValidVisitorId(value) {
  return /^[a-zA-Z0-9._:-]{8,120}$/.test(value);
}

async function handleVisit(request, response, origin) {
  let payload;
  try {
    payload = JSON.parse(await readBody(request) || '{}');
  } catch {
    sendJson(response, 400, { error: 'invalid json' }, origin);
    return;
  }

  const visitorId = String(payload.visitorId || '').trim();
  if (!isValidVisitorId(visitorId)) {
    sendJson(response, 400, { error: 'invalid visitorId' }, origin);
    return;
  }

  const now = new Date().toISOString();
  const store = loadStore();
  store.visitors = store.visitors && typeof store.visitors === 'object' ? store.visitors : {};
  const existing = store.visitors[visitorId] || {};

  store.visitors[visitorId] = {
    firstSeen: existing.firstSeen || now,
    lastSeen: now,
    ipHash: hashIp(clientIp(request)),
    app: String(payload.app || '').slice(0, 80),
    path: String(payload.path || '').slice(0, 200),
  };

  saveStore(store);

  sendJson(response, 200, {
    uniqueVisitors: Object.keys(store.visitors).length,
  }, origin);
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || '';

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(origin));
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true }, origin);
    return;
  }

  if (request.method === 'POST' && request.url === '/hamster-stats/visit') {
    await handleVisit(request, response, origin);
    return;
  }

  sendJson(response, 404, { error: 'not found' }, origin);
});

server.listen(PORT, () => {
  console.log(`visitor stats server listening on http://127.0.0.1:${PORT}`);
  console.log(`data file: ${DATA_FILE}`);
});
