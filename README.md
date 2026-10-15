# gabriele-mauro.github.io

Source of https://gabriele-mauro.github.io, a one-page academic website built with [Astro](https://astro.build) and published on GitHub Pages by a GitHub Action.

## Setup

Needs Node 24 (see `.nvmrc`).

```
nvm use
npm install      # also turns on the pre-push hook
npm run dev      # http://localhost:4321
```

## Update the content

All text lives in `src/content/` as Markdown files with a short header (frontmatter). The build fails if a required field is missing or misspelt.

- **About, role, interests, emails, links:** `src/content/profile.md`.
- **A paper:** add a file to `src/content/papers/` (copy an existing one). Add `links` (arXiv, PDF, code, slides) only once they are public.
- **Current work, teaching, earlier projects:** one file per entry in `src/content/now/`, `src/content/teaching/` and `src/content/earlier/`. `order` sets the order; dates are `YYYY-MM`.
- **New CV:** replace `public/cv/Gabriele_Mauro_CV.pdf` with the web version (no phone number) and update `cv.updated` in `profile.md`.

Notes written as `[CHECK: …]` are highlighted in `npm run dev`. Publishing fails until they are removed.

## Check

```
npm run check:content   # personal data and wording checks on src/ and the CV
npm run build           # content check, type check, build, check of the built pages
npm run test:a11y       # accessibility and layout tests on the build
npm run test:html       # HTML validation
npm run lighthouse      # Lighthouse, mobile and desktop
npm run shots           # screenshots into .shots/
```

`BASE_URL=https://gabriele-mauro.github.io npm run test:a11y` and `npm run lighthouse -- https://gabriele-mauro.github.io/` run the same checks on the live site.

## Publish

Commit and push to `main`. The pre-push hook runs the content check first and stops the push if it fails. The GitHub Action then checks, builds and deploys the site in about a minute. "Last updated" in the footer is the month of the latest commit that changed the content or the CV.
