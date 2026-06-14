import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './client';

const originalFetch = globalThis.fetch;

function mockFetchSequence(responses: Array<Partial<Response> | Error>): void {
  let i = 0;
  globalThis.fetch = vi.fn(async () => {
    const next = responses[i];
    i += 1;
    if (next instanceof Error) throw next;
    return {
      ok: (next.status ?? 200) < 400,
      status: next.status ?? 200,
      json: async () => ({}),
      ...next,
    } as Response;
  }) as typeof fetch;
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the response unchanged when status is not 401', async () => {
    mockFetchSequence([{ status: 200 }]);
    const res = await apiFetch('/api/auth/me');
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('does NOT attempt refresh when the failed request is /api/auth/login', async () => {
    // Login 401 means bad credentials, not an expired session.
    mockFetchSequence([{ status: 401 }]);
    const res = await apiFetch('/api/auth/login', { method: 'POST' });
    expect(res.status).toBe(401);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('refreshes and retries on a 401 for a non-auth endpoint', async () => {
    mockFetchSequence([
      { status: 401 },           // initial /api/articles
      { status: 200 },           // /api/auth/refresh ok
      { status: 200 },           // retried /api/articles ok
    ]);
    const res = await apiFetch('/api/articles');
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(
      '/api/auth/refresh',
    );
  });

  it('returns the original 401 when refresh itself fails', async () => {
    mockFetchSequence([
      { status: 401 },           // initial
      { status: 401 },           // refresh failed
    ]);
    const res = await apiFetch('/api/articles');
    expect(res.status).toBe(401);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('sends credentials: same-origin by default', async () => {
    mockFetchSequence([{ status: 200 }]);
    await apiFetch('/api/something');
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.credentials).toBe('same-origin');
  });
});
