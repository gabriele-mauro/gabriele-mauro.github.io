// @ts-check
import { defineConfig } from 'astro/config';
import { lastUpdatedMonth } from './scripts/last-updated.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://gale4409.github.io',
  vite: {
    define: { __LAST_UPDATED__: JSON.stringify(lastUpdatedMonth()) },
  },
});
