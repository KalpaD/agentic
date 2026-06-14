import { Server } from 'http';
import { Application } from 'express';
import { Knex } from 'knex';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { createApp } from '../app';
import { setupTestDb, teardownTestDb } from '../test/integration-db';
import { hashRefreshToken } from './jwt';

interface RawResponse {
  status: number;
  text: string;
  setCookies: string[];
}

async function rawRequest(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<RawResponse> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    text,
    setCookies: response.headers.getSetCookie?.() ?? [],
  };
}

function cookieValue(setCookies: string[], name: string): string | null {
  for (const header of setCookies) {
    const [pair] = header.split(';');
    const [n, ...rest] = pair.split('=');
    if (n.trim() === name) return rest.join('=');
  }
  return null;
}

function cookieFlags(setCookies: string[], name: string): string {
  for (const header of setCookies) {
    if (header.startsWith(`${name}=`)) return header;
  }
  return '';
}

describe('Auth API (integration)', () => {
  let db: Knex;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-access-secret';
    process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';
    delete process.env.NODE_ENV; // ensure non-prod cookie flags (no Secure)

    db = await setupTestDb();
    await db.migrate.latest();
    await db.seed.run();

    const app: Application = createApp(db);
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = (server.address() as { port: number }).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await teardownTestDb(db);
  });

  beforeEach(async () => {
    // Per-test reset of refresh_tokens; keep seeded users intact.
    await db('refresh_tokens').delete();
  });

  describe('POST /api/auth/login', () => {
    it('returns 200, sets httpOnly cookies, and persists a hashed refresh token', async () => {
      const res = await rawRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });

      expect(res.status).toBe(200);

      const body = JSON.parse(res.text);
      expect(body.user.username).toBe('alice');
      expect(typeof body.user.id).toBe('string');

      const accessToken = cookieValue(res.setCookies, 'access_token');
      const refreshToken = cookieValue(res.setCookies, 'refresh_token');
      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();

      const accessFlags = cookieFlags(res.setCookies, 'access_token');
      expect(accessFlags).toMatch(/HttpOnly/i);
      expect(accessFlags).toMatch(/SameSite=Lax/i);

      // Refresh token must be stored as SHA-256 hash, never plaintext.
      const row = await db('refresh_tokens')
        .where({ token_hash: hashRefreshToken(refreshToken!) })
        .first();
      expect(row).toBeDefined();
      expect(row.token_hash).not.toContain(refreshToken);
    });

    it('returns 401 with a byte-identical body for unknown user vs wrong password', async () => {
      const unknownUser = await rawRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'nobody', password: 'whatever' }),
      });
      const wrongPass = await rawRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'incorrect' }),
      });

      expect(unknownUser.status).toBe(401);
      expect(wrongPass.status).toBe(401);
      expect(unknownUser.text).toBe(wrongPass.text);
      expect(JSON.parse(unknownUser.text)).toEqual({
        error: 'Invalid username or password',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the authenticated user when called with the access cookie', async () => {
      const login = await rawRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });
      const accessToken = cookieValue(login.setCookies, 'access_token');

      const me = await rawRequest(baseUrl, '/api/auth/me', {
        headers: { cookie: `access_token=${accessToken}` },
      });

      expect(me.status).toBe(200);
      expect(JSON.parse(me.text).user.username).toBe('alice');
    });

    it('returns 401 when no token is supplied', async () => {
      const res = await rawRequest(baseUrl, '/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a new access token for a valid refresh cookie', async () => {
      const login = await rawRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'bob', password: 'password123' }),
      });
      const refreshToken = cookieValue(login.setCookies, 'refresh_token');
      const originalAccess = cookieValue(login.setCookies, 'access_token');

      // tiny wait so the new JWT's `iat` differs and the token is not byte-identical
      await new Promise((r) => setTimeout(r, 1100));

      const refresh = await rawRequest(baseUrl, '/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `refresh_token=${refreshToken}` },
      });

      expect(refresh.status).toBe(200);
      const newAccess = cookieValue(refresh.setCookies, 'access_token');
      expect(newAccess).toBeTruthy();
      expect(newAccess).not.toBe(originalAccess);
    });

    it('returns 401 when no refresh cookie is supplied', async () => {
      const res = await rawRequest(baseUrl, '/api/auth/refresh', {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('removes the refresh token row and clears both cookies', async () => {
      const login = await rawRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });
      const refreshToken = cookieValue(login.setCookies, 'refresh_token');

      const before = await db('refresh_tokens')
        .where({ token_hash: hashRefreshToken(refreshToken!) })
        .first();
      expect(before).toBeDefined();

      const logout = await rawRequest(baseUrl, '/api/auth/logout', {
        method: 'POST',
        headers: { cookie: `refresh_token=${refreshToken}` },
      });

      expect(logout.status).toBe(200);
      // Both cookies should be cleared (Max-Age=0 or Expires in the past).
      const accessClear = cookieFlags(logout.setCookies, 'access_token');
      const refreshClear = cookieFlags(logout.setCookies, 'refresh_token');
      expect(accessClear).toMatch(/(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
      expect(refreshClear).toMatch(/(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);

      const after = await db('refresh_tokens')
        .where({ token_hash: hashRefreshToken(refreshToken!) })
        .first();
      expect(after).toBeUndefined();
    });

    it('subsequent refresh with the same token returns 401', async () => {
      const login = await rawRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      });
      const refreshToken = cookieValue(login.setCookies, 'refresh_token');

      await rawRequest(baseUrl, '/api/auth/logout', {
        method: 'POST',
        headers: { cookie: `refresh_token=${refreshToken}` },
      });

      const replay = await rawRequest(baseUrl, '/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `refresh_token=${refreshToken}` },
      });
      expect(replay.status).toBe(401);
    });
  });

  describe('JWT middleware on protected route roots', () => {
    it('returns 401 for /api/articles without auth', async () => {
      const res = await rawRequest(baseUrl, '/api/articles');
      expect(res.status).toBe(401);
    });

    it('returns 401 for /api/images without auth', async () => {
      const res = await rawRequest(baseUrl, '/api/images', { method: 'POST' });
      expect(res.status).toBe(401);
    });
  });
});
