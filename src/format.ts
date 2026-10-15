declare const __LAST_UPDATED__: string; // YYYY-MM, set in astro.config.mjs

// Typographic quotes for strings that do not go through the Markdown renderer (frontmatter,
// fixed UI text), so they match the smart punctuation Astro applies to Markdown bodies.
export function smartQuotes(s: string): string {
  return s
    .replace(/(^|\s)'(?=\d\ds?\b)/g, '$1’') // '90s
    .replace(/(^|[\s([{–—-])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/(^|[\s([{–—-])"/g, '$1“')
    .replace(/"/g, '”');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// In dev, [CHECK: …] notes are highlighted. In a build they stay plain text, and the
// content check fails a CI build while any remain.
export function markChecks(html: string): string {
  if (!import.meta.env.DEV) return html;
  return html.replace(/\[CHECK:[^\]]*\]/g, '<mark class="check">$&</mark>');
}

// A Markdown body as rendered by Astro.
export function bodyHtml(rendered: { html: string } | undefined): string {
  return markChecks(rendered?.html.trim() ?? '');
}

// A one-paragraph body without its <p>, to continue a line that is already open.
export function inlineHtml(rendered: { html: string } | undefined): string {
  return bodyHtml(rendered).replace(/^<p>([\s\S]*)<\/p>$/, '$1');
}

// Gutter dates from YYYY-MM: "2026–", "2026", "2024–26".
export function gutterDate(start: string, end?: string): string {
  const from = start.slice(0, 4);
  if (!end) return `${from}–`;
  const to = end.slice(0, 4);
  if (to === from) return from;
  return `${from}–${to.slice(0, 2) === from.slice(0, 2) ? to.slice(2) : to}`;
}

// "A", "A and B", "A, B and C".
export function joinNames(names: readonly string[], and: string): string {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

// "October 2026", from the month astro.config.mjs reads from git.
export function lastUpdated(): string {
  const month = new Date(`${__LAST_UPDATED__}-01T12:00:00Z`);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month);
}
