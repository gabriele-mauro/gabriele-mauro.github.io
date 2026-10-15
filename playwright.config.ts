import { defineConfig, devices } from '@playwright/test';

// Tests run against the built site (run `npm run build` first), served like GitHub Pages serves it.
export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4322',
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs 4322',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: false,
  },
});
