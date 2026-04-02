/**
 * Base URL for server-side fetch to the Express API (Route Handlers, Server Components).
 *
 * Do not fall back to NEXT_PUBLIC_API_URL in development: that var points at production
 * (e.g. Railway) while local dev runs against localhost:8080. Using it here caused
 * storefront saves to hit production and return Express's generic 404 ("Route not found").
 *
 * In production, prefer BACKEND_URL / API_URL on the host, or NEXT_PUBLIC_API_URL.
 */
export function serverBackendBase(): string {
  const explicit =
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    process.env.INTERNAL_API_URL;
  if (explicit) {
    return String(explicit).replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_API_URL) {
    return String(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8080';
}
