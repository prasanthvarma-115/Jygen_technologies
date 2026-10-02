const http = require('node:http');
const { readFile, stat, realpath } = require('node:fs/promises');
const path = require('node:path');
const contactApi = require('./api/contact.js');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function apiResponse(response) {
  return {
    setHeader: (name, value) => response.setHeader(name, value),
    status(statusCode) {
      return { json: payload => sendJson(response, statusCode, payload) };
    },
  };
}

async function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > 12 * 1024) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      raw += chunk;
    });
    request.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 })); }
    });
    request.on('error', reject);
  });
}

function isPublicPath(pathname) {
  return pathname === '/' || pathname === '/index.html' || pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/sitemap.xml' || /^\/(assets|about|contact|services)(\/|$)/.test(pathname);
}

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `localhost:${port}`}`);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return contactApi({ method: request.method, body: {} }, apiResponse(response));
      const body = await readJsonBody(request);
      return contactApi({ method: 'POST', body }, apiResponse(response));
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Method not allowed');
    }

    const pathname = decodeURIComponent(url.pathname);
    if (!isPublicPath(pathname) || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Not found');
    }

    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Forbidden');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    file = await realpath(file);
    if (!file.startsWith(root + path.sep)) throw new Error('Forbidden');

    const extension = path.extname(file).toLowerCase();
    if (!types[extension]) throw new Error('Not found');
    const content = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extension],
      'Content-Length': content.length,
      'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) && !['.js', '.css'].includes(extension) ? 'public, max-age=3600, must-revalidate' : 'no-cache',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const statusCode = error.statusCode || 404;
    if (!response.headersSent) response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    if (!response.writableEnded) response.end(statusCode === 400 ? 'Bad request' : statusCode === 413 ? 'Payload too large' : 'Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`JYGEN: http://127.0.0.1:${port}`);
});
