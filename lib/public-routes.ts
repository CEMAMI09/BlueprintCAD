/** Routes accessible without login or the create-account gate. */
export function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;

  const exactPublic = new Set([
    '/privacy',
    '/contact',
    '/login',
    '/register',
    '/verify-email',
    '/coming-soon',
    '/sitemap.xml',
  ]);

  if (exactPublic.has(pathname)) return true;

  const prefixPublic = ['/project/', '/share/', '/auth/'];
  return prefixPublic.some((prefix) => pathname.startsWith(prefix));
}
