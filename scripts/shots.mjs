#!/usr/bin/env node
// Screenshots of the built site (dist/) and of design/mockup.html at 375 and 1280px, light and
// dark, into .shots/. Run through `npm run shots`, which builds first.

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, '.shots');

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

// A minimal static server for dist/, like GitHub Pages: /x/ serves /x/index.html, misses get 404.html.
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

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('shots: dist/ not found, run npm run build first');
    process.exit(1);
  }
  await mkdir(out, { recursive: true });
  const server = await serveDist();
  const targets = [
    ['site', `http://127.0.0.1:${server.address().port}/`],
    ['mockup', pathToFileURL(join(root, 'design', 'mockup.html')).href],
  ];
  const browser = await chromium.launch();
  try {
    for (const [name, url] of targets) {
      for (const width of [375, 1280]) {
        for (const colorScheme of ['light', 'dark']) {
          const context = await browser.newContext({
            viewport: { width, height: 800 },
            deviceScaleFactor: 2,
            colorScheme,
          });
          const page = await context.newPage();
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(document.getAnimations().map((a) => a.finished));
          });
          const file = join(out, `${name}-${width}-${colorScheme}.png`);
          await page.screenshot({ path: file, fullPage: true });
          console.log(`shots: ${file}`);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
