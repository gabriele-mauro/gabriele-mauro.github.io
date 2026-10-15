import { execFileSync } from 'node:child_process';

// "Last updated" (YYYY-MM): the latest commit that touched the content or the CV, in the
// committer's own time zone. Falls back to the build date when git history is unavailable.
export function lastUpdatedMonth() {
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', 'src/content', 'public/cv'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  } catch {
    // no git: use the build date
  }
  return new Date().toISOString().slice(0, 7);
}
