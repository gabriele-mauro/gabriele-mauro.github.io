// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { lastUpdatedMonth } from './scripts/last-updated.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://gale4409.github.io',
  integrations: [sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/404') })],
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    define: { __LAST_UPDATED__: JSON.stringify(lastUpdatedMonth()) },
  },
});
