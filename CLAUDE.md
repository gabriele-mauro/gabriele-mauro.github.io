# Gabriele Mauro's academic website

A one-page personal academic website, plus a CV PDF. Gabriele is an undergraduate in Computer Engineering at Politecnico di Torino who does research on dynamic graph algorithms. The main readers are professors who open the link from an email and look for about 30 seconds, admissions and scholarship panels, and internship reviewers.

Live URL: https://gabriele-mauro.github.io (GitHub organization `gabriele-mauro`, owned by the user `Gale4409`; repo `gabriele-mauro/gabriele-mauro.github.io`). The site's GitHub link points to the personal account, github.com/Gale4409.

## Hard rules

1. **This repo is public, history included.** GitHub Pages on the free plan only publishes public repos. Anything committed once is public forever, even if deleted later.
   - `private/` is gitignored and must stay that way. Check with `git check-ignore private/PRIVATE_RULES.md` before the first commit and whenever `.gitignore` changes.
   - Read `private/PRIVATE_RULES.md` before any content or deploy work. It lists what must never be published. Never copy its contents into tracked files, commit messages, code comments or issue text.
   - Never commit a CV or any file containing a phone number, date or place of birth, home address or student ID number.
2. **The words are Gabriele's.** Text lives in `src/content/` and he writes it. Do not rewrite, shorten, "improve" or add sentences. Fix a typo only after he says yes. Do not add taglines, welcome lines, filler or text he did not write. The only UI strings you may write are listed in "Fixed UI text" below.
3. **Degree name.** Always "Computer Engineering", never "Computer Science", for his degree, anywhere (page text, meta tags, JSON-LD, alt text, commit messages).
4. **Claims.** No rankings or percentiles, no "first-ever", no "first author" (authors are alphabetical). Do not describe paper results. Keep the hedged wording "as far as we know" exactly as written.
5. **`[CHECK: …]` markers** are notes from Gabriele's drafts. In dev, render them highlighted (`<mark class="check">`) so he can see them. A production build must fail while any marker remains (see Content check).
6. **Work in small steps and stop.** After each step, show what changed (screenshots, command output) and wait for Gabriele's OK. Never push, create a GitHub repo, change repo settings or set secrets without his explicit OK in that moment. Ask before any `sudo` command.

## Stack

- Astro, latest stable, static output, TypeScript strict. Ships zero client JavaScript (no framework islands). Before using any API, check the current Astro docs instead of relying on memory.
- Plain CSS in one global stylesheet with custom properties, inlined into each page (`build.inlineStylesheets: 'always'`). No Tailwind, no UI kit, no theme.
- Font: STIX Two Text, self-hosted with `@fontsource-variable/stix-two-text`, latin subset only, normal and italic. No requests to Google Fonts or any other third party at runtime.
- `@astrojs/sitemap`. Nothing else unless Gabriele agrees.
- Node version pinned in `.nvmrc` (the version current Astro requires); lockfile committed.
- Dev and test tools (dev dependencies only): Playwright, `@axe-core/playwright`, Lighthouse CI (`@lhci/cli`), `unpdf` (a small PDF text extractor that runs in Node without system packages, for checking the CV), `@astrojs/check` and `typescript` (type check in every build and in CI), `html-validate`.

## Folder structure

```
CLAUDE.md
README.md                  short, generic "how to update" notes (public)
.nvmrc
astro.config.mjs           site: https://gabriele-mauro.github.io
design/mockup.html         visual reference; the built page must match it
private/                   GITIGNORED: PRIVATE_RULES.md, denylist.txt, KICKOFF_PROMPT.md
public/
  favicon.svg
  cv/Gabriele_Mauro_CV.pdf the web CV (no phone number), supplied by Gabriele
  robots.txt
scripts/
  check-content.mjs        the content check (below)
  shots.mjs                screenshots into .shots/
  last-updated.mjs         "Last updated" month from git, read by astro.config.mjs
  serve-dist.mjs           serves dist/ like GitHub Pages (tests, screenshots)
  lighthouse.mjs           Lighthouse CI, mobile and desktop (config: lighthouserc.cjs)
playwright.config.ts       the tests run against the built site
.htmlvalidate.json         html-validate, recommended preset
src/
  content.config.ts        collection schemas
  content/
    profile.md
    now/*.md
    papers/*.md
    teaching/*.md
    earlier/*.md
  components/              Header, Sparsifier, Section, Entry, Footer, Text (a frontmatter string:
                           quotes, and [CHECK] marks in dev)
  format.ts                quotes, gutter dates, name lists, dev [CHECK] marks
  layouts/Base.astro
  pages/index.astro
  pages/404.astro
  site.ts                  fixed UI text and constants
  styles/global.css
tests/a11y.spec.ts
.githooks/pre-push         runs the content check before every push
.github/workflows/deploy.yml
```

## Content model

Validate every collection with a schema so that a missing or misspelt field fails the build.

- **profile.md**: `name`, `role`, `affiliation`, `description` (meta description), `interests` (string list), `emails` (list of `{label, address}`), `links` (list of `{label, url}`), `cv` (`{file, updated}` with `updated` as `YYYY-MM`). Body: the About text.
- **now/**: `title`, `with`, `institution`, `start` (`YYYY-MM`), optional `end`, `order`. Body: one or two sentences, or none.
- **papers/**: `title`, `authors` (list, in the order given), `alphabetical` (bool), `year`, `status` (`under-review` | `preprint` | `to-appear` | `published`), `venue` (string, may be empty), `links` (optional `arxiv`, `pdf`, `code`, `slides`). Body: optional one-line note.
- **teaching/**: `role`, `course`, `institution`, `start`, optional `end`, `order`.
- **earlier/**: `title`, `years` (string, shown as written, e.g. `Feb–Mar 2026` or `2020–22`), `order`, optional `items` (list of `{name, text, url}`). Body: short text.

## Page structure (one page, this order)

1. **Header.** Name as the only `h1`. Under it, two lines: `role`, then `affiliation`. A row of links: Email (mailto, first address), CV (PDF), then `links` in order. The sparsifier figure sits to the right on wide screens and above the name on narrow ones.
2. **About.** The profile body, then an "Interests:" line built from `interests`, with the list in italics.
3. **Publications** (`papers/`, newest first). Entry: year in the gutter, bold title, a "With …" line listing the co-authors in the given order without Gabriele's own name, joined with commas and a final "and". Then the status in italics ("Under review." / "Preprint." / "To appear in {venue}." / "{venue}."), then the note, then the links as plain words (arXiv, PDF, code, slides). If any paper has `alphabetical: true`, add one note under the section in small grey type: "Authors are listed in alphabetical order, as is usual in theoretical computer science."
4. **Current work** (`now/`, by `order`). Entry: date in the gutter (`Oct 2026 –`), bold title, a "With {with}, {institution}" line in grey, then the body (if any).
5. **Teaching** (`teaching/`, by `order`). Date in the gutter, bold "{role}, {course}", institution in grey.
6. **Before research** (`earlier/`, by `order`). Years in the gutter, bold title, body, then `items` as a plain list: linked name, comma, text.
7. **Footer.** Both email addresses with their labels in brackets, and "Last updated {Month YYYY}", taken from the date of the latest git commit that touched `src/content/` or `public/cv/` (fall back to the build date if git history is unavailable).

Gutter dates come from `start` and `end`, in the CV's style: three-letter English months, en dashes, old-style tabular figures. An open role is `Oct 2026 –`, a finished one within one year is `Mar–Jul 2026`, one across years is `Sep 2024 – Jul 2027`. Papers show the year only. Every date must fit the gutter on one line (a test checks this at 375 and 1280px); the current dates fit the 6.75rem gutter, but a range across years would need about 8.75rem, so widen `--gutter` (the page max-width follows it) if one is added.

Section headings are plain sentence-case `h2`s. Entry titles are `h3`. No numbering, no eyebrow labels, no icons, no cards, no arrows after links, no middle-dot separators.

## Fixed UI text

These are the only strings allowed outside `src/content/`. They live in `src/site.ts`: "Email", "CV", "Interests:", "Current work", "Publications", "Teaching", "Before research", "With", "Under review.", "Preprint.", "To appear in", "Authors are listed in alphabetical order, as is usual in theoretical computer science.", "Last updated", "Skip to content", the figure's accessible title, and the 404 page text: "This page doesn't exist." with a link "Go to the home page". Also the words the page structure above already names: "and" (before the last name in a "With …" line), the paper link labels "arXiv", "PDF", "code", "slides", and the month abbreviations "Jan" to "Dec" in gutter dates.

## Design

Match `design/mockup.html`. These are its tokens.

**Colour**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#fcfcfb` | `#131519` | background |
| `--ink` | `#1a1c20` | `#e7e8eb` | text, graph nodes |
| `--graphite` | `#5b5f67` | `#9da2ab` | secondary text, gutter dates |
| `--hairline` | `#e2e3e6` | `#2b2f36` | the footer rule only |
| `--edge` | `#2b4fb8` | `#93adf2` | links, kept edges in the figure |
| `--edge-faint` | `#c9ccd2` | `#3a3f48` | dropped edges in the figure |
| `--mark` | `#fff1a8` | `#5a4d12` | `[CHECK]` highlight, dev only |

Dark mode follows `prefers-color-scheme` only. No toggle, no JavaScript. Set `color-scheme: light dark`.

**Type.** STIX Two Text everywhere. Body 17px (`1.0625rem`), line-height 1.6, old-style proportional figures. Gutter dates use old-style tabular figures. Scale: name `2.15rem`/600, `h2` `1.25rem`/600, `h3` body size/600, small text `0.9rem`. Links in `--edge`, 1px underline offset `0.18em`, 2px on hover, visible focus ring (2px `--edge`, offset 3px).

**Quotes.** Astro's smart punctuation stays on for Markdown bodies. Frontmatter strings and fixed UI text shown on the page (including meta tags and JSON-LD) go through the same quote transform when rendered, so no straight quote or apostrophe appears anywhere on the page. Never edit the content files for this.

**Layout.** One centred column: `max-width: calc(6.75rem + 38rem)`, side padding `1.25rem`, top padding `4.5rem`. A two-column grid on every row: a `6.75rem` gutter that holds right-aligned dates, then the text column. All text shares one left edge. Sections `3rem` apart, entries `1.35rem`. Below `40rem` the gutter collapses: dates go above their entry, left-aligned, and the figure moves above the name at `10rem` wide.

**The sparsifier figure** is the single decorative element. It is an inline SVG (copy it from the mockup) of a small graph. On load, the dropped edges fade to `--edge-faint` and the kept edges turn `--edge` and thicken to their weights, once, in 1.4s after a 0.5s delay, in pure CSS. Under `prefers-reduced-motion` it shows the end state immediately. It has `role="img"` and a `<title>`. No other animation anywhere.

**Favicon:** a simplified 4–5 node version of the figure as `favicon.svg`, using the light colours.

## Head and metadata

`lang="en"`. Title "Gabriele Mauro". Meta description from `profile.description`. Canonical URL. Open Graph and Twitter tags (`og:type` profile, title, description, url). JSON-LD `Person` with name, url, `affiliation` (Politecnico di Torino) and `sameAs` (GitHub, LinkedIn). Preload the latin normal font file. `sitemap-index.xml` (what `@astrojs/sitemap` generates), and a `robots.txt` that allows everything and points to `/sitemap-index.xml`. A `404.astro` page in the same style.

## Quality targets

- No horizontal scroll from 320px to 1920px. Readable at 200% zoom.
- axe: zero violations, light and dark, at 375px and 1280px.
- Keyboard: skip link first, logical tab order, focus always visible.
- Lighthouse (mobile and desktop): Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100.
- Valid HTML. No console errors. No third-party requests.

## Content check (`scripts/check-content.mjs`)

It runs before every build and in CI. It reports file, line and rule, and exits 1 on any failure.

- **Scope:** `src/` text files; the built `dist/**/*.html` (after the build, with `--dist`); the text, link targets and metadata of `public/cv/*.pdf` (a PDF with no extractable text fails); and, with `--tracked`, every git-tracked text file except lockfiles (phone numbers and private patterns only). Paths given on the command line are checked instead, as site text (a PDF as a CV); this is for testing the check itself.
- **`[CHECK`:** looked for only in `src/content/` and `dist/` (the highlighting code itself may mention it). A warning by default; a failure with `--strict`. The build script uses strict mode when `CI=true`.
- **Phone numbers** (in all scopes, including the CV): `\+39[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}` and `\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b`.
- **Wording**, in site text only (not the CV, not CLAUDE.md or README.md): "first-ever", "first author" / "first-author", `top \d+ ?%`, "ranked", "non-profit", and the degree called Computer Science, e.g. `\b(B\.?\s?Sc|Bachelor|degree|student|undergraduate)\b[^.\n]{0,40}\bComputer Science\b` and `\bComputer Science (student|undergraduate|degree)\b`. The lower-case phrase "theoretical computer science" in the authors note is allowed.
- **Private patterns:** regexes, one per line (case-insensitive, `#` lines are comments), read from `private/denylist.txt` locally or from the `PRIVATE_DENYLIST` environment variable in CI. If neither is present, print a warning but do not fail. A line starting with `@site ` applies only to site text: `src/`, `dist/` and, with `--tracked`, every tracked text file. It never applies to the CV PDF. Hits are reported by denylist line number, never by pattern.
- **CI logs are public.** When `CI=true`, phone and private-pattern hits show file and line but not the matched text.

A git `pre-push` hook (`.githooks/pre-push`, enabled by the `prepare` script through `core.hooksPath`) runs `check-content --strict` and then `check-content --tracked`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server; `[CHECK]` markers are highlighted |
| `npm run check:content` | the content check on `src/` and the CV |
| `npm run check:types` | `astro check` (TypeScript strict) |
| `npm run build` | content check (strict in CI), type check, `astro build`, then the content check on `dist/` |
| `npm run preview` | serve `dist/` locally |
| `npm run shots` | build, then screenshots of the site and of the mockup at 375 and 1280px, light and dark, into `.shots/` (gitignored) |
| `npm run test:a11y` | Playwright on the built site: axe (375/1280px, light/dark, home and 404), keyboard, motion, widths 320–1920px, 200% zoom, console errors, third-party requests, quotes, head tags, the CV link. `BASE_URL=https://gabriele-mauro.github.io npm run test:a11y` runs the same tests on the live site |
| `npm run test:html` | html-validate on `dist/**/*.html` |
| `npm run lighthouse` | Lighthouse CI on the built site (or `-- <url>` for a live URL), mobile and desktop, asserting the quality targets; reports in `.lighthouseci/` |

On WSL, `explorer.exe .shots` opens the screenshots folder in Windows.

## Deploy

- `.github/workflows/deploy.yml`, following the current Astro "Deploy to GitHub Pages" guide: `actions/checkout` (with `fetch-depth: 0` so "Last updated" works), the official `withastro/action`, then `actions/deploy-pages`. Trigger on push to `main` and manually.
- Pass `PRIVATE_DENYLIST` to the build step from the repository secret of the same name.
- Repo Settings → Pages → Source: GitHub Actions.
- After a deploy, open https://gabriele-mauro.github.io, run Lighthouse against it and report.

## How Gabriele updates the site

- **Add a paper:** a new file in `src/content/papers/`.
- **Change the About:** edit `src/content/profile.md`.
- **New CV:** replace `public/cv/Gabriele_Mauro_CV.pdf` (web version, no phone number) and update `cv.updated`.
- **Publish:** commit and push to `main`. The Action builds and deploys in about a minute.
