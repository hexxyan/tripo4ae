/**
 * Parse a version string (e.g. "v1.2.3" or "1.2.3") into an array of numbers.
 */
export function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(Number);
}

/**
 * Compare two semver version strings.
 * Returns true if latest version is strictly greater than current version.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const c = parseVersion(current);
  const l = parseVersion(latest);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}
