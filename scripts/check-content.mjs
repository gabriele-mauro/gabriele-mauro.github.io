#!/usr/bin/env node
// Content check. The rules are described in CLAUDE.md, "Content check".
//
//   node scripts/check-content.mjs             src/ text files and public/cv/*.pdf
//   node scripts/check-content.mjs --dist      the built dist/**/*.html
//   node scripts/check-content.mjs --tracked   every git-tracked text file except lockfiles
//   node scripts/check-content.mjs <paths…>    these files or folders as site text (a PDF as a CV)
//
// --strict (implied by CI=true) turns [CHECK markers into failures.
// Exits 1 on any failure.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const options = new Set(argv.filter((a) => a.startsWith('--')));
const paths = argv.filter((a) => !a.startsWith('--'));
for (const o of options) {
  if (!['--strict', '--dist', '--tracked'].includes(o)) {
    console.error(`check-content: unknown option ${o}`);
    process.exit(2);
  }
}
const inCI = process.env.CI === 'true';
const strict = options.has('--strict') || inCI;

// ---------------------------------------------------------------- rules

const PHONE = [
  /\+39[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/g,
  /\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
];

const WORDING = [
  ['wording: first-ever', /\bfirst[- ]ever\b/gi],
  ['wording: first author', /\bfirst[- ]author\b/gi],
  ['wording: top N%', /\btop \d+ ?%/gi],
  ['wording: ranked', /\branked\b/gi],
  ['wording: non-profit', /\bnon[- ]?profit\b/gi],
  ['wording: degree is Computer Engineering', /\b(B\.?\s?Sc|Bachelor|degree|student|undergraduate)\b[^.\n]{0,40}\bComputer\s+Science\b/gi],
  ['wording: degree is Computer Engineering', /\bComputer\s+Science\s+(student|undergraduate|degree)\b/gi],
];
// The authors note may say this, in lower case.
const WORDING_ALLOWED = /theoretical computer science/g;

const CHECK_MARKER = /\[CHECK\b[^\]\n]*\]?/g;

function loadPrivatePatterns() {
  const file = join(root, 'private', 'denylist.txt');
  let source;
  if (existsSync(file)) source = readFileSync(file, 'utf8');
  else if (process.env.PRIVATE_DENYLIST) source = process.env.PRIVATE_DENYLIST;
  else return null;

  const patterns = [];
  const broken = [];
  source.split(/\r?\n/).forEach((raw, i) => {
    let line = raw.trim();
    if (!line || line.startsWith('#')) return;
    // "@site " lines apply to site text and tracked files, never to the CV.
    const siteOnly = line.startsWith('@site ');
    if (siteOnly) line = line.slice('@site '.length).trim();
    try {
      patterns.push({ line: i + 1, re: new RegExp(line, 'gi'), siteOnly });
    } catch {
      broken.push(i + 1);
    }
  });
  return { patterns, broken };
}

// ---------------------------------------------------------------- reporting

const results = [];
const seen = new Set();

function display(file) {
  const rel = relative(root, file);
  return rel.startsWith('..') ? file : rel;
}

function report(level, file, where, rule, match, { sensitive = false } = {}) {
  const key = `${file}|${rule}|${match.toLowerCase().replace(/\s+/g, ' ')}`;
  if (seen.has(key)) return;
  seen.add(key);
  // Action logs of a public repo are public: never print private matches there.
  const shown = sensitive && inCI ? '(match hidden in CI)' : JSON.stringify(match.trim());
  results.push({ level, text: `${display(file)}${where}  ${rule}  ${shown}` });
}

function position(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const col = index - before.lastIndexOf('\n');
  return `:${line}:${col}`;
}

// ---------------------------------------------------------------- scanning

// rules: { phone, wording, checkMarker: bool; privateScope: 'all' | 'cv' | null; where?: (index) => string }
function scan(file, text, rules) {
  const where = rules.where ?? ((i) => position(text, i));

  if (rules.checkMarker) {
    for (const m of text.matchAll(CHECK_MARKER)) {
      report(strict ? 'fail' : 'warn', file, where(m.index), '[CHECK] marker', m[0]);
    }
  }
  if (rules.phone) {
    for (const re of PHONE) {
      for (const m of text.matchAll(re)) {
        report('fail', file, where(m.index), 'phone number', m[0], { sensitive: true });
      }
    }
  }
  if (rules.wording) {
    const masked = text.replace(WORDING_ALLOWED, (s) => ' '.repeat(s.length));
    for (const [name, re] of WORDING) {
      for (const m of masked.matchAll(re)) report('fail', file, where(m.index), name, m[0]);
    }
  }
  if (rules.privateScope && privatePatterns) {
    for (const p of privatePatterns.patterns) {
      if (p.siteOnly && rules.privateScope === 'cv') continue;
      for (const m of text.matchAll(p.re)) {
        const rule = `private pattern (denylist line ${p.line})`;
        report('fail', file, where(m.index), rule, m[0], { sensitive: true });
      }
    }
  }
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function htmlToText(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (s, e) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return String.fromCodePoint(n);
      }
      return ENTITIES[e.toLowerCase()] ?? s;
    })
    .replace(/[ \t ]+/g, ' ');
}

// Site text gets every rule. HTML is checked again as plain text and Markdown again without
// emphasis marks, so a tag or an asterisk inside a phrase does not hide it.
function scanSiteText(file, text, { checkMarker }) {
  const rules = { phone: true, wording: true, checkMarker, privateScope: 'all' };
  scan(file, text, rules);
  if (/\.html?$/i.test(file)) {
    scan(file, htmlToText(text), { ...rules, where: () => ' (as text)' });
  } else if (/\.mdx?$/i.test(file)) {
    scan(file, text.replace(/[*_`]/g, ''), rules); // no newlines removed: line numbers stay right
  }
}

// A CV gets phone numbers and private patterns, except "@site" ones. Its text, link targets and
// metadata are all checked, because all three are published with the file.
async function scanPdf(file) {
  const { getDocumentProxy, extractText, extractLinks, getMeta } = await import('unpdf');
  const rules = { phone: true, wording: false, checkMarker: false, privateScope: 'cv' };
  try {
    const data = new Uint8Array(readFileSync(file));
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: false });
    const { links } = await extractLinks(pdf);
    const { info } = await getMeta(pdf);
    if (text.join('').trim() === '') {
      results.push({ level: 'fail', text: `${display(file)}  no extractable text, so it cannot be checked` });
    }
    text.forEach((page, i) => scan(file, page, { ...rules, where: () => ` p.${i + 1}` }));
    scan(file, links.join('\n'), { ...rules, where: () => ' (link targets)' });
    const meta = Object.values(info ?? {}).filter((v) => typeof v === 'string').join('\n');
    scan(file, meta, { ...rules, where: () => ' (metadata)' });
  } catch (err) {
    results.push({ level: 'fail', text: `${display(file)}  could not read the PDF: ${err.message}` });
  }
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function readText(file) {
  const buf = readFileSync(file);
  return isBinary(buf) ? null : buf.toString('utf8');
}

// ---------------------------------------------------------------- main

const privatePatterns = loadPrivatePatterns();
const scopes = [];
let fileCount = 0;

if (!privatePatterns) {
  results.push({
    level: 'warn',
    text: 'no private patterns (private/denylist.txt or PRIVATE_DENYLIST): private check skipped',
  });
} else if (privatePatterns.broken.length) {
  for (const line of privatePatterns.broken) {
    results.push({ level: 'fail', text: `denylist line ${line} is not a valid regular expression` });
  }
}

if (paths.length) {
  scopes.push('given paths');
  for (const p of paths.map((x) => resolve(x))) {
    if (!existsSync(p)) {
      results.push({ level: 'fail', text: `${p}  not found` });
      continue;
    }
    for (const file of statSync(p).isDirectory() ? walk(p) : [p]) {
      fileCount++;
      if (/\.pdf$/i.test(file)) await scanPdf(file);
      else {
        const text = readText(file);
        if (text !== null) scanSiteText(file, text, { checkMarker: true });
      }
    }
  }
}

if (options.has('--dist')) {
  scopes.push('dist/');
  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    results.push({ level: 'fail', text: 'dist/ not found: run astro build first' });
  } else {
    for (const file of walk(dist).filter((f) => /\.html$/i.test(f))) {
      fileCount++;
      scanSiteText(file, readFileSync(file, 'utf8'), { checkMarker: true });
    }
  }
}

if (options.has('--tracked')) {
  scopes.push('tracked files');
  const LOCKFILES = new Set(['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']);
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  for (const rel of tracked) {
    const file = join(root, rel);
    if (LOCKFILES.has(rel.split('/').pop()) || !existsSync(file)) continue;
    const text = readText(file);
    if (text === null) continue;
    fileCount++;
    scan(file, text, { phone: true, wording: false, checkMarker: false, privateScope: 'all' });
  }
}

if (!paths.length && !options.has('--dist') && !options.has('--tracked')) {
  scopes.push('src/', 'public/cv/');
  const content = join(root, 'src', 'content');
  for (const file of walk(join(root, 'src'))) {
    const text = readText(file);
    if (text === null) continue;
    fileCount++;
    scanSiteText(file, text, { checkMarker: file.startsWith(content + '/') });
  }
  const cvDir = join(root, 'public', 'cv');
  const pdfs = existsSync(cvDir) ? walk(cvDir).filter((f) => /\.pdf$/i.test(f)) : [];
  for (const file of pdfs) {
    fileCount++;
    await scanPdf(file);
  }
  if (!pdfs.length) results.push({ level: 'info', text: 'no CV PDF in public/cv/ yet' });
}

const fails = results.filter((r) => r.level === 'fail');
const warns = results.filter((r) => r.level === 'warn');
console.log(`check-content${strict ? ' --strict' : ''}: ${scopes.join(', ')} (${fileCount} files)`);
for (const r of results) console.log(`  ${r.level.padEnd(4)}  ${r.text}`);
console.log(`check-content: ${fails.length} failures, ${warns.length} warnings`);
process.exit(fails.length ? 1 : 0);
