#!/usr/bin/env node
// Screenshots of the built site (dist/) and of design/mockup.html at 375 and 1280px, light and
// dark, into .shots/. Run through `npm run shots`, which builds first.

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { serveDist } from './serve-dist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, '.shots');

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
