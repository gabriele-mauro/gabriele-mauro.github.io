// Lighthouse CI: the built site (dist/), or a live URL given as LHCI_URL. Run via `npm run lighthouse`,
// which starts lhci from a temporary folder, so paths here are absolute.
const path = require('node:path');

const url = process.env.LHCI_URL;

module.exports = {
  ci: {
    collect: {
      // The 404 page is noindex on purpose, so it is not a Lighthouse target.
      ...(url
        ? { url: [url] }
        : { staticDistDir: path.join(__dirname, 'dist'), autodiscoverUrlBlocklist: ['/404.html'] }),
      numberOfRuns: 3,
      settings: { chromeFlags: '--headless=new --no-sandbox' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 1, aggregationMethod: 'median-run' }],
        'categories:best-practices': ['error', { minScore: 1, aggregationMethod: 'median-run' }],
        'categories:seo': ['error', { minScore: 1, aggregationMethod: 'median-run' }],
      },
    },
  },
};
