/**
 * fetch wrapper that transparently refreshes the JWT access token on a 401.
 *
 * Flow:
 *   1. Issue the request with cookie credentials.
 *   2. If status !== 401 OR the request was already an auth endpoint, return as-is.
 *   3. Otherwise POST /api/auth/refresh once. On success retry the original
 *      request and return its response.
 *   4. On refresh failure return the original 401 — the AuthContext observes it
 *      and transitions to "unauthenticated", which makes ProtectedRoute kick the
 *      user back to /login.
 *
 * Intentionally exempt: /api/auth/login (401 there is a credentials error, not
 * an expired session) and /api/auth/refresh (avoids recursion).
 */

const AUTH_EXEMPT = ['/api/auth/login', '/api/auth/refresh'];

function isAuthExempt(url: string): boolean {
  return AUTH_EXEMPT.some((p) => url.includes(p));
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const opts: RequestInit = { credentials: 'same-origin', ...init };
  const res = await fetch(input, opts);

  if (res.status !== 401 || isAuthExempt(input)) {
    return res;
  }

  const refresh = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!refresh.ok) {
    return res;
  }

  return fetch(input, opts);
}
