import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { Knex } from 'knex';
import { requireAuth } from './auth/middleware';
import { createAuthRouter } from './auth/routes';

/**
 * Creates and configures the Express application.
 * Separated from server startup to enable testing without binding to a port.
 */
export function createApp(db: Knex): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter(db));

  // Pre-wire the JWT gate on article & image roots so unauthenticated requests
  // are rejected even before TASK-04 / TASK-05 mount the actual route handlers.
  app.use('/api/articles', requireAuth);
  app.use('/api/images', requireAuth);

  return app;
}
