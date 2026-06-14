import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { Knex } from 'knex';
import { createArticlesRouter } from './articles/routes';
import { createAuthRouter } from './auth/routes';
import { createImagesRouter } from './images/routes';
import { StorageClient } from './images/storage';

/**
 * Creates and configures the Express application.
 * Separated from server startup to enable testing without binding to a port.
 */
export function createApp(db: Knex, storage: StorageClient): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/articles', createArticlesRouter(db));
  app.use('/api/images', createImagesRouter(db, storage));

  return app;
}
