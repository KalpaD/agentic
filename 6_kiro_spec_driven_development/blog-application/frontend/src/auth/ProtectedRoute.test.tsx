import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as Response;
}

function renderProtected(initialRoute = '/dashboard'): void {
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>secret-content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders children when /api/auth/me returns an authenticated user', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(200, { user: { id: 'u-1', username: 'alice' } }),
    ) as typeof fetch;

    renderProtected();
    await waitFor(() => {
      expect(screen.getByText('secret-content')).toBeInTheDocument();
    });
  });

  it('redirects to /login when /api/auth/me returns 401', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(401, {})) as typeof fetch;

    renderProtected();
    await waitFor(() => {
      expect(screen.getByText('login-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('secret-content')).not.toBeInTheDocument();
  });

  it('shows a loading state before /api/auth/me resolves', () => {
    // Never-resolving fetch keeps us in the loading state.
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    renderProtected();
    expect(screen.getByRole('status')).toHaveTextContent(/Loading/i);
  });
});
