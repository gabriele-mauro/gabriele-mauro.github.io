import { defineConfig, devices } from '@playwright/test';

// Tests run against the built site (run `npm run build` first), served like GitHub Pages serves it,
// or against a live URL:  BASE_URL=https://gale4409.github.io npm run test:a11y
const live = process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: live ?? 'http://127.0.0.1:4322',
  },
  ...(live
    ? {}
    : {
        webServer: {
          command: 'node scripts/serve-dist.mjs 4322',
          url: 'http://127.0.0.1:4322',
          reuseExistingServer: false,
        },
      }),
});
