import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const headers = JSON.parse(await readFile(new URL('./security-headers.json', import.meta.url), 'utf8'));
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.ico':'image/x-icon', '.webp':'image/webp', '.svg':'image/svg+xml', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.woff2':'font/woff2' };
const port = Number(process.env.PORT || 4173);
const inside = file => file === root || file.startsWith(root + sep);

createServer(async (request, response) => {
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  const end = (code, message) => { response.writeHead(code, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}); response.end(request.method === 'HEAD' ? undefined : message); };
  if (!['GET','HEAD'].includes(request.method)) { response.setHeader('Allow','GET, HEAD'); end(405,'Method not allowed'); return; }
  if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(request.headers.host)) { end(403,'Forbidden'); return; }
  try {
    const raw = decodeURIComponent(request.url.split('?')[0]);
    if (raw.includes('\\') || raw.includes('\0') || raw.split('/').some(part => part.startsWith('.'))) { end(403,'Forbidden'); return; }
    const pathname = new URL(raw,'http://localhost').pathname;
    // Serve site pages and assets; configuration and tooling stay private.
    if (!(pathname==='/' || pathname==='/index.html' || pathname==='/favicon.ico' || pathname==='/robots.txt' || pathname==='/sitemap.xml' || /^\/(assets|about|contact|services)(\/|$)/.test(pathname))) { end(404,'Not found'); return; }
    let file = resolve(root, `.${pathname}`);
    if (!inside(file)) { end(403,'Forbidden'); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file,'index.html');
    file = await realpath(file);
    if (!inside(file)) { end(403,'Forbidden'); return; }
    if (!Object.hasOwn(types,extname(file).toLowerCase())) { end(404,'Not found'); return; }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type':types[extname(file).toLowerCase()], 'Content-Length':content.length, 'Cache-Control':file.includes(`${sep}assets${sep}`)&&!['.js','.css'].includes(extname(file).toLowerCase())?'public, max-age=3600, must-revalidate':'no-cache' });
    response.end(request.method==='HEAD'?undefined:content);
  } catch (error) { end(error instanceof URIError?400:404,error instanceof URIError?'Bad request':'Not found'); }
}).listen(port,'127.0.0.1',()=>console.log(`JYGEN preview: http://127.0.0.1:${port}`));
