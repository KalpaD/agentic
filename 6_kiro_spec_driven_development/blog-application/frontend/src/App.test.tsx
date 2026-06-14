import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe('App (router + AuthProvider integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/dashboard');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('routes unauthenticated /dashboard to /login', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(401, {})) as typeof fetch;
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('renders dashboard when /api/auth/me succeeds', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(200, { user: { id: 'u-1', username: 'alice' } }),
    ) as typeof fetch;
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
    expect(screen.getByTestId('header-username')).toHaveTextContent('alice');
  });
});
