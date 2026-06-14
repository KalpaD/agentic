import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { signAccessToken } from './jwt';
import { requireAuth } from './middleware';

function buildReq(opts: {
  authHeader?: string;
  cookies?: Record<string, string>;
}): Request {
  const headers: Record<string, string> = opts.authHeader
    ? { authorization: opts.authHeader }
    : {};
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    cookies: opts.cookies ?? {},
  } as unknown as Request;
}

function buildRes(): Response & { _status?: number; _body?: unknown } {
  const res: Partial<Response> & { _status?: number; _body?: unknown } = {};
  res.status = vi.fn((code: number) => {
    res._status = code;
    return res as Response;
  });
  res.json = vi.fn((body: unknown) => {
    res._body = body;
    return res as Response;
  });
  return res as Response & { _status?: number; _body?: unknown };
}

describe('requireAuth middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-middleware-secret';
    process.env.JWT_REFRESH_SECRET = 'test-middleware-refresh';
  });

  it('attaches userId and calls next() on a valid Authorization header', () => {
    const token = signAccessToken('user-1');
    const req = buildReq({ authHeader: `Bearer ${token}` });
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, res, next);

    expect(req.userId).toBe('user-1');
    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBeUndefined();
  });

  it('falls back to access_token cookie when no header is present', () => {
    const token = signAccessToken('user-2');
    const req = buildReq({ cookies: { access_token: token } });
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, res, next);

    expect(req.userId).toBe('user-2');
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 when no token is supplied', () => {
    const req = buildReq({});
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 on a tampered token', () => {
    const token = signAccessToken('user-3');
    const tampered = token.slice(0, -3) + 'xyz';
    const req = buildReq({ authHeader: `Bearer ${tampered}` });
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 on an expired token', () => {
    const expired = jwt.sign({ sub: 'user-4' }, process.env.JWT_SECRET!, {
      expiresIn: -1,
    });
    const req = buildReq({ authHeader: `Bearer ${expired}` });
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
