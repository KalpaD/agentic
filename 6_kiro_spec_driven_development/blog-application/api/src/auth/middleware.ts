import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from './jwt';

// Augments Express's Request with the authenticated userId attached here.
// Lives in this file (not a .d.ts) so ts-node's import-graph loader picks it
// up via any module that imports this middleware.
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

const UNAUTHORIZED = { error: 'Unauthorized' };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json(UNAUTHORIZED);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json(UNAUTHORIZED);
  }
}

function extractToken(req: Request): string | null {
  const header = req.header('Authorization');
  if (header && header.startsWith('Bearer ')) {
    const candidate = header.slice('Bearer '.length).trim();
    if (candidate.length > 0) return candidate;
  }

  const cookieToken = (req as Request & { cookies?: Record<string, unknown> }).cookies
    ?.access_token;
  return typeof cookieToken === 'string' ? cookieToken : null;
}
