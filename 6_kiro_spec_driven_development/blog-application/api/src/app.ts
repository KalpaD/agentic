import express, { Application, Request, Response } from 'express';
import cors from 'cors';

/**
 * Creates and configures the Express application.
 * Separated from server startup to enable testing without binding to a port.
 */
export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}
