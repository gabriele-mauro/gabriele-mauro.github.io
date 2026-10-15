// Accessibility and quality checks on the built site (see "Quality targets" in CLAUDE.md).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  ['home', '/'],
  ['404', '/this-page-does-not-exist/'],
] as const;

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map((a) => a.finished));
  });
}

test.describe('axe: zero violations', () => {
  for (const [name, path] of PAGES) {
    for (const width of [375, 1280]) {
      for (const colorScheme of ['light', 'dark'] as const) {
        test(`${name} at ${width}px, ${colorScheme}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 });
          await page.emulateMedia({ colorScheme });
          await page.goto(path);
          await settle(page);
          const { violations } = await new AxeBuilder({ page }).analyze();
          expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
        });
      }
    }
  }
});

test.describe('keyboard', () => {
  test('skip link first, then every link in document order, focus always visible', async ({ page }) => {
    await page.goto('/');
    const expected = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
        .filter((el) => el.tabIndex >= 0)
        .map((el) => el.textContent?.trim() ?? ''),
    );
    const seen: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          text: el.textContent?.trim() ?? '',
          focusVisible: el.matches(':focus-visible'),
          outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
          inView: box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0 &&
            box.right <= innerWidth && box.bottom <= innerHeight,
        };
      });
      expect(focus, `focus ${i + 1} (${focus.text})`).toMatchObject({ focusVisible: true, outline: true, inView: true });
      seen.push(focus.text);
    }
    expect(seen[0]).toBe('Skip to content');
    expect(seen).toEqual(expected);
  });

  test('the skip link moves focus past the header', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#content$/);
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => document.activeElement?.closest('main') !== null);
    expect(next).toBe(true);
  });
});

test.describe('motion', () => {
  test('the figure is the only animation, once, 1.4s after 0.5s', async ({ page }) => {
    await page.goto('/');
    const timings = await page.evaluate(() =>
      document.getAnimations().map((a) => {
        const t = a.effect!.getTiming();
        const target = (a.effect as KeyframeEffect).target as Element;
        return { inFigure: !!target.closest('.sparsifier'), duration: t.duration, delay: t.delay, iterations: t.iterations };
      }),
    );
    expect(timings.length).toBeGreaterThan(0);
    for (const t of timings) expect(t).toEqual({ inFigure: true, duration: 1400, delay: 500, iterations: 1 });
  });

  test('reduced motion shows the end state immediately', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4322/');
    await page.waitForTimeout(100);
    const edge = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('.sparsifier .keep.w3')!);
      return { stroke: s.stroke, width: s.strokeWidth };
    });
    expect(edge).toEqual({ stroke: 'rgb(43, 79, 184)', width: '3px' });
    await context.close();
  });
});

test.describe('layout', () => {
  for (const width of [320, 360, 375, 414, 640, 768, 1024, 1280, 1440, 1920]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await settle(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('200% zoom (1280px window): no horizontal scroll, text at full size, mobile layout', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4322/');
    await settle(page);
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      bodySize: getComputedStyle(document.body).fontSize,
      gutterCollapsed: getComputedStyle(document.querySelector('.row')!).gridTemplateColumns.split(' ').length === 1,
    }));
    expect(r).toEqual({ overflow: 0, bodySize: '17px', gutterCollapsed: true });
    await context.close();
  });
});

test.describe('page', () => {
  test('no console errors and no third-party requests', async ({ page }) => {
    const errors: string[] = [];
    const origins = new Set<string>();
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => origins.add(new URL(r.url()).origin));
    await page.goto('/');
    await settle(page);
    expect(errors).toEqual([]);
    expect([...origins]).toEqual(['http://127.0.0.1:4322']);
  });

  test('no straight quotes or apostrophes in the text, title or meta tags', async ({ page }) => {
    await page.goto('/');
    const text = await page.evaluate(() =>
      [
        document.body.innerText,
        document.title,
        ...[...document.querySelectorAll('meta[content]')].map((m) => m.getAttribute('content')),
        document.querySelector('script[type="application/ld+json"]')?.textContent?.replace(/"/g, ''),
      ].join('\n'),
    );
    expect(text.match(/.{0,20}['"].{0,20}/g)).toBeNull();
  });

  test('no client JavaScript', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script:not([type="application/ld+json"])').count();
    expect(scripts).toBe(0);
  });

  test('head: one h1, title, description, canonical, Open Graph, Twitter, JSON-LD', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle('Gabriele Mauro');
    const meta = (selector: string) => page.locator(selector).getAttribute('content');
    expect(await meta('meta[name="description"]')).toMatch(/^Computer Engineering student/);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://gale4409.github.io/');
    expect(await meta('meta[property="og:type"]')).toBe('profile');
    expect(await meta('meta[property="og:url"]')).toBe('https://gale4409.github.io/');
    expect(await meta('meta[property="og:title"]')).toBe('Gabriele Mauro');
    expect(await meta('meta[name="twitter:card"]')).toBe('summary');
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    expect(ld).toMatchObject({
      '@type': 'Person',
      name: 'Gabriele Mauro',
      url: 'https://gale4409.github.io/',
      affiliation: { name: 'Politecnico di Torino' },
      sameAs: ['https://github.com/Gale4409', 'https://www.linkedin.com/in/gabriele-mauro2004'],
    });
  });

  test('404: status, noindex, link home', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');
    expect(response?.status()).toBe(404);
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex');
    await expect(page.locator('a[href="/"]')).toHaveText('Go to the home page');
  });

  test('favicon, robots.txt and sitemap', async ({ request }) => {
    expect((await request.get('/favicon.svg')).status()).toBe(200);
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Sitemap: https://gale4409.github.io/sitemap-index.xml');
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap.match(/<loc>[^<]*<\/loc>/g)).toEqual(['<loc>https://gale4409.github.io/</loc>']);
  });
});
