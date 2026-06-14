import { Server } from 'http';
import { Application } from 'express';
import { Knex } from 'knex';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { createApp } from '../app';
import { signAccessToken } from '../auth/jwt';
import { setupTestDb, teardownTestDb } from '../test/integration-db';
import { createStorageClient, loadStorageConfig } from './storage';

// 1x1 transparent PNG — a real, tiny, valid PNG file.
const TINY_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe('Images API (integration)', () => {
  let db: Knex;
  let server: Server;
  let baseUrl: string;
  let aliceToken: string;
  let aliceId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-images-access';
    process.env.JWT_REFRESH_SECRET = 'integration-images-refresh';
    process.env.STORAGE_ENDPOINT = 'http://minio:9000';
    process.env.STORAGE_ACCESS_KEY = 'minioadmin';
    process.env.STORAGE_SECRET_KEY = 'minioadmin';
    process.env.STORAGE_BUCKET = 'blog-images';
    process.env.STORAGE_REGION = 'us-east-1';
    // Use the internal hostname so the test container can fetch the object back.
    process.env.STORAGE_PUBLIC_URL = 'http://minio:9000/blog-images';
    delete process.env.NODE_ENV;

    db = await setupTestDb();
    await db.migrate.latest();
    await db.seed.run();
    aliceId = (await db('users').where({ username: 'alice' }).first()).id;
    aliceToken = signAccessToken(aliceId);

    const storage = createStorageClient(loadStorageConfig());
    const app: Application = createApp(db, storage);
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = (server.address() as { port: number }).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await teardownTestDb(db);
  });

  beforeEach(async () => {
    await db('article_images').delete();
  });

  async function postFile(opts: {
    buffer: Buffer;
    mime: string;
    filename: string;
    token?: string;
  }): Promise<{ status: number; body: any }> {
    const form = new FormData();
    form.append('file', new Blob([opts.buffer], { type: opts.mime }), opts.filename);
    const res = await fetch(`${baseUrl}/api/images`, {
      method: 'POST',
      body: form,
      headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : {},
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  }

  it('uploads a valid PNG and returns a reachable public URL', async () => {
    const res = await postFile({
      buffer: TINY_PNG,
      mime: 'image/png',
      filename: 'tiny.png',
      token: aliceToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^http:\/\/minio:9000\/blog-images\/.+\.png$/);

    // Fetch the object back from MinIO using the returned URL.
    const fetchRes = await fetch(res.body.url);
    expect(fetchRes.status).toBe(200);
    const fetched = Buffer.from(await fetchRes.arrayBuffer());
    expect(fetched.equals(TINY_PNG)).toBe(true);

    // article_images row exists with the expected metadata.
    // size_bytes is BIGINT — node-postgres returns those as strings so
    // 64-bit precision survives the trip through JS.
    const rows = await db('article_images').where({ user_id: aliceId });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: aliceId,
      mime_type: 'image/png',
      url: res.body.url,
    });
    expect(Number(rows[0].size_bytes)).toBe(TINY_PNG.length);
  });

  it('rejects an oversized upload with HTTP 400 and the size message', async () => {
    // 10 MB + 1 byte
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 0);
    const res = await postFile({
      buffer: oversized,
      mime: 'image/jpeg',
      filename: 'big.jpg',
      token: aliceToken,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/10 MB/);

    // Acceptance Criterion 5: no DB row created on error.
    expect(await db('article_images').count<{ count: string }[]>('* as count')).toEqual([
      { count: '0' },
    ]);
  });

  it('rejects an unsupported MIME type with HTTP 400 listing accepted formats', async () => {
    const txt = Buffer.from('not an image');
    const res = await postFile({
      buffer: txt,
      mime: 'text/plain',
      filename: 'notes.txt',
      token: aliceToken,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('JPEG');
    expect(res.body.error).toContain('PNG');
    expect(res.body.error).toContain('GIF');
    expect(res.body.error).toContain('WebP');

    expect(await db('article_images').count<{ count: string }[]>('* as count')).toEqual([
      { count: '0' },
    ]);
  });

  it('returns 401 without a JWT', async () => {
    const res = await postFile({
      buffer: TINY_PNG,
      mime: 'image/png',
      filename: 'no-auth.png',
    });
    expect(res.status).toBe(401);
  });
});
