#!/usr/bin/env node
// Serves dist/ the way GitHub Pages does: /x/ serves /x/index.html, a miss gets 404.html with
// status 404. Used by the tests and the screenshots.  node scripts/serve-dist.mjs [port]

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function serveDist(port = 0) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = normalize(join(dist, path));
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    if (path.endsWith('/')) file = join(file, 'index.html');
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      const notFound = join(dist, '404.html');
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(existsSync(notFound) ? await readFile(notFound) : 'Not found');
    }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('serve-dist: dist/ not found, run npm run build first');
    process.exit(1);
  }
  const server = await serveDist(Number(process.argv[2] ?? 4322));
  console.log(`serve-dist: http://127.0.0.1:${server.address().port}/`);
}
