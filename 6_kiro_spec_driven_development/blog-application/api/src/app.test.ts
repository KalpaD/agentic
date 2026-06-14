import knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app';

/**
 * Unit tests for the Express application setup. Uses Node's built-in http
 * module instead of supertest. The Knex instance is created but never queried
 * (no connection is opened until a query runs), so /health stays self-contained.
 */
describe('GET /health', () => {
  // Real Knex client, but no connection ever opens — /health does not touch DB.
  const stubDb = knex({
    client: 'pg',
    connection: { connectionString: 'postgres://stub:stub@localhost:1/stub' },
  });

  afterAll(async () => {
    await stubDb.destroy();
  });

  it('returns 200 OK with status: ok', async () => {
    const app = createApp(stubDb);

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    const port = (server.address() as { port: number }).port;

    const response = await fetch(`http://localhost:${port}/health`);
    const body = (await response.json()) as { status: string };

    server.close();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });
});
