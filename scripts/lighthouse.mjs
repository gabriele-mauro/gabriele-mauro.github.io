#!/usr/bin/env node
// Lighthouse CI, mobile then desktop, with Playwright's Chromium.
//   npm run lighthouse                                         the built site in dist/
//   npm run lighthouse -- https://gabriele-mauro.github.io/    a live URL
// Reports go to .lighthouseci/<mobile|desktop>/ (gitignored). Exits 1 if a target is missed.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2];
const env = { ...process.env, CHROME_PATH: chromium.executablePath(), ...(url ? { LHCI_URL: url } : {}) };
if (!url && !existsSync(join(root, 'dist', 'index.html'))) {
  console.error('lighthouse: dist/ not found, run npm run build first');
  process.exit(1);
}

// On WSL, Lighthouse's Chrome launcher builds a Windows temp path for the Chrome profile, which
// Linux creates as a folder named "C:\Users\…" in the current directory. Run from a throwaway
// folder so those profiles never land in the repo, and delete it afterwards.
const work = mkdtempSync(join(tmpdir(), 'lhci-'));

let failed = false;
const rows = [];
for (const [form, extra] of [['mobile', []], ['desktop', ['--collect.settings.preset=desktop']]]) {
  const outputDir = join(root, '.lighthouseci', form);
  rmSync(outputDir, { recursive: true, force: true });
  const run = spawnSync(
    join(root, 'node_modules', '.bin', 'lhci'),
    ['autorun', `--config=${join(root, 'lighthouserc.cjs')}`, '--upload.target=filesystem', `--upload.outputDir=${outputDir}`, ...extra],
    { cwd: work, stdio: ['ignore', 'pipe', 'pipe'], env, encoding: 'utf8' },
  );
  if (run.status !== 0) {
    failed = true;
    console.log(run.stdout.split('\n').filter((l) => /✘|failure|expected|found|Error/i.test(l)).join('\n'));
    if (run.stderr.trim()) console.log(run.stderr.trim());
  }
  const manifest = join(outputDir, 'manifest.json');
  if (existsSync(manifest)) {
    for (const rep of JSON.parse(readFileSync(manifest, 'utf8')).filter((r) => r.isRepresentativeRun)) {
      const s = rep.summary;
      rows.push([form, rep.url, s.performance, s.accessibility, s['best-practices'], s.seo, rep.htmlPath]);
    }
  }
}

console.log('\n| Form | URL | Performance | Accessibility | Best Practices | SEO |');
console.log('|---|---|---|---|---|---|');
for (const [form, u, ...scores] of rows) {
  console.log(`| ${form} | ${u} | ${scores.slice(0, 4).map((x) => Math.round(x * 100)).join(' | ')} |`);
}
for (const r of rows) console.log(`${r[0]} report: ${r[6]}`);
rmSync(work, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
