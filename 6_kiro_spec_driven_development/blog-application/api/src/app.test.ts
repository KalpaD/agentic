import { describe, it, expect } from 'vitest';
import { createApp } from './app';

/**
 * Unit tests for the Express application setup.
 * Uses Node's built-in http module to avoid a supertest dependency at scaffold stage.
 */
describe('GET /health', () => {
  it('returns 200 OK with status: ok', async () => {
    const app = createApp();

    // Start on a random OS-assigned port to avoid conflicts in CI
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    const port = (server.address() as { port: number }).port;

    const response = await fetch(`http://localhost:${port}/health`);
    const body = await response.json() as { status: string };

    server.close();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });
});
