import { CookieOptions, Request, Response, Router } from 'express';
import { Knex } from 'knex';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './jwt';
import { attemptLogin } from './login';
import { requireAuth } from './middleware';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function accessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: isProd() ? 'strict' : 'lax',
    secure: isProd(),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  };
}

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: isProd() ? 'strict' : 'lax',
    secure: isProd(),
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
}

export function createAuthRouter(db: Knex): Router {
  const router = Router();

  router.post('/login', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { username?: unknown; password?: unknown };
    const result = await attemptLogin(db, body.username, body.password);

    if (!result.ok) {
      res.status(401).json({ error: result.error });
      return;
    }

    const accessToken = signAccessToken(result.user.id);
    const refreshToken = signRefreshToken(result.user.id);

    await db('refresh_tokens').insert({
      user_id: result.user.id,
      token_hash: hashRefreshToken(refreshToken),
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    });

    res
      .cookie(ACCESS_COOKIE, accessToken, accessCookieOptions())
      .cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
      .status(200)
      .json({ user: result.user });
  });

  router.post('/refresh', async (req: Request, res: Response) => {
    const token = (req.cookies ?? {})[REFRESH_COOKIE];
    if (typeof token !== 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let userId: string;
    try {
      userId = verifyRefreshToken(token).sub;
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const row = await db('refresh_tokens')
      .where({ token_hash: hashRefreshToken(token), user_id: userId })
      .andWhere('expires_at', '>', new Date())
      .first();

    if (!row) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const newAccess = signAccessToken(userId);
    res
      .cookie(ACCESS_COOKIE, newAccess, accessCookieOptions())
      .status(200)
      .json({ ok: true });
  });

  router.post('/logout', async (req: Request, res: Response) => {
    const token = (req.cookies ?? {})[REFRESH_COOKIE];
    if (typeof token === 'string') {
      await db('refresh_tokens')
        .where({ token_hash: hashRefreshToken(token) })
        .delete();
    }
    res
      .clearCookie(ACCESS_COOKIE, { path: '/' })
      .clearCookie(REFRESH_COOKIE, { path: '/' })
      .status(200)
      .json({ ok: true });
  });

  router.get('/me', requireAuth, async (req: Request, res: Response) => {
    const row = await db<{ id: string; username: string }>('users')
      .select('id', 'username')
      .where({ id: req.userId })
      .first();
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({ user: row });
  });

  return router;
}
