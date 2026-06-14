import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';
import { AuthProvider } from './AuthContext';

const originalFetch = globalThis.fetch;

function renderApp(initialRoute = '/login'): void {
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={<div>dashboard-page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders username, password, and submit', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(401, {})) as typeof fetch;
    renderApp();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submits credentials to POST /api/auth/login and navigates to /dashboard', async () => {
    const fetchMock = vi.fn(async (input: string, _init?: RequestInit) => {
      if (input === '/api/auth/me') return jsonResponse(401, {});
      if (input === '/api/auth/login') {
        return jsonResponse(200, { user: { id: 'u-1', username: 'alice' } });
      }
      throw new Error(`unexpected: ${input}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp();
    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('dashboard-page')).toBeInTheDocument();
    });

    // Confirm the login call payload
    const loginCall = fetchMock.mock.calls.find(
      ([url]) => url === '/api/auth/login',
    );
    expect(loginCall).toBeTruthy();
    const init = loginCall![1]!;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      username: 'alice',
      password: 'password123',
    });
  });

  it('displays a generic error on 401 and does NOT mention which field', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === '/api/auth/me') return jsonResponse(401, {});
      if (input === '/api/auth/login') {
        return jsonResponse(401, { error: 'Invalid username or password' });
      }
      throw new Error(`unexpected: ${input}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp();
    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Invalid username or password');
    // No field-specific hint
    expect(alert.textContent?.toLowerCase()).not.toContain('field');
    expect(alert.textContent).not.toMatch(/^(username|password)\b/i);
    // Still on the login page (dashboard not rendered)
    expect(screen.queryByText('dashboard-page')).not.toBeInTheDocument();
  });
});
