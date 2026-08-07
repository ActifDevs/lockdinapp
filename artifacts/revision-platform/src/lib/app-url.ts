/**
 * Build an absolute application URL that respects Vite BASE_URL and the
 * current browser origin. Used for Auth email/OAuth redirects.
 */
export function getAppUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${base}${normalizedPath}`, window.location.origin).toString();
}
