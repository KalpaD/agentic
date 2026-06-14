import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt';

describe('jwt helpers', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  it('signAccessToken / verifyAccessToken round-trips the userId', () => {
    const token = signAccessToken('user-123');
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.exp - payload.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
  });

  it('signRefreshToken / verifyRefreshToken round-trips the userId', () => {
    const token = signRefreshToken('user-456');
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-456');
    expect(payload.exp - payload.iat).toBe(REFRESH_TOKEN_TTL_SECONDS);
  });

  it('access and refresh tokens are signed with distinct secrets', () => {
    const access = signAccessToken('u');
    expect(() => verifyRefreshToken(access)).toThrow();
    const refresh = signRefreshToken('u');
    expect(() => verifyAccessToken(refresh)).toThrow();
  });

  it('verifyAccessToken rejects a tampered token', () => {
    const token = signAccessToken('user-abc');
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('verifyAccessToken rejects an expired token', () => {
    const expired = jwt.sign({ sub: 'u' }, process.env.JWT_SECRET!, {
      expiresIn: -1,
    });
    expect(() => verifyAccessToken(expired)).toThrow();
  });

  it('hashRefreshToken is deterministic and looks like a SHA-256 hex digest', () => {
    const hash1 = hashRefreshToken('any-token-value');
    const hash2 = hashRefreshToken('any-token-value');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRefreshToken('different')).not.toBe(hash1);
  });
});
