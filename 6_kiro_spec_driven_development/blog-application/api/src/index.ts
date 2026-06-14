import dotenv from 'dotenv';
import { createApp } from './app';
import db from './db/knex';
import { createStorageClient, loadStorageConfig } from './images/storage';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function start(): Promise<void> {
  // Run any pending migrations before accepting traffic
  // eslint-disable-next-line no-console
  console.log('Running database migrations…');
  await db.migrate.latest();
  // eslint-disable-next-line no-console
  console.log('Migrations complete.');

  const storage = createStorageClient(loadStorageConfig());
  const app = createApp(db, storage);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Blog API server running on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
