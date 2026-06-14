import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Header } from './Header';

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function renderApp(initialRoute = '/dashboard'): void {
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Header />
                <div>dashboard-body</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Header logout button', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls POST /api/auth/logout and navigates back to /login', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === '/api/auth/me') {
        return jsonResponse(200, { user: { id: 'u', username: 'alice' } });
      }
      if (input === '/api/auth/logout') {
        expect(init?.method).toBe('POST');
        return jsonResponse(200, { ok: true });
      }
      throw new Error(`unexpected: ${input}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp();

    // Wait for /me restore so the header renders.
    await waitFor(() => {
      expect(screen.getByText('dashboard-body')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(screen.getByText('login-page')).toBeInTheDocument();
    });

    expect(
      fetchMock.mock.calls.some(([url]) => url === '/api/auth/logout'),
    ).toBe(true);
  });
});
