import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

function requireSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, requireSecret('JWT_SECRET'), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, requireSecret('JWT_REFRESH_SECRET'), {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, requireSecret('JWT_SECRET')) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, requireSecret('JWT_REFRESH_SECRET')) as TokenPayload;
}

// SHA-256 of the raw refresh token — what we store in refresh_tokens.token_hash.
// Keeping the raw token out of the DB means a DB leak does not yield usable
// tokens, and rotation/revocation is a simple row delete.
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
