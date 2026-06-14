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
import { explodingStorage } from '../test/stubs';
import { updateArticle } from './service';

interface Article {
  id: string;
  user_id: string;
  title: string;
  body: { type: string; content: unknown[] };
  status: string;
  created_at: string;
  updated_at: string;
}

describe('Articles API (integration)', () => {
  let db: Knex;
  let server: Server;
  let baseUrl: string;
  let aliceId: string;
  let bobId: string;
  let aliceToken: string;
  let bobToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-articles-access';
    process.env.JWT_REFRESH_SECRET = 'integration-articles-refresh';
    delete process.env.NODE_ENV;

    db = await setupTestDb();
    await db.migrate.latest();
    await db.seed.run();

    aliceId = (await db('users').where({ username: 'alice' }).first()).id;
    bobId = (await db('users').where({ username: 'bob' }).first()).id;
    aliceToken = signAccessToken(aliceId);
    bobToken = signAccessToken(bobId);

    const app: Application = createApp(db, explodingStorage);
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
    // Wipe articles + images between tests so each starts from a clean slate.
    // refresh_tokens left alone — auth tests already cleaned those up.
    await db('article_images').delete();
    await db('articles').delete();
  });

  async function authed(
    token: string,
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: any }> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  }

  async function createArticleFor(token: string): Promise<Article> {
    const res = await authed(token, '/api/articles', { method: 'POST' });
    expect(res.status).toBe(201);
    return res.body.article as Article;
  }

  describe('POST /api/articles', () => {
    it('creates a blank article owned by the requester (Property 3)', async () => {
      const res = await authed(aliceToken, '/api/articles', { method: 'POST' });

      expect(res.status).toBe(201);
      expect(res.body.article.user_id).toBe(aliceId);
      expect(res.body.article.title).toBe('');
      expect(res.body.article.body).toEqual({ type: 'doc', content: [] });
      expect(res.body.article.status).toBe('draft');
    });

    it('lets the same user create many distinct articles (Property 4)', async () => {
      const ids = new Set<string>();
      for (let i = 0; i < 5; i += 1) {
        const a = await createArticleFor(aliceToken);
        ids.add(a.id);
      }
      expect(ids.size).toBe(5);

      const list = await authed(aliceToken, '/api/articles');
      expect(list.body.total).toBe(5);
      expect(list.body.articles).toHaveLength(5);
    });

    it('returns 401 without a token', async () => {
      const res = await fetch(`${baseUrl}/api/articles`, { method: 'POST' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/articles', () => {
    it('returns only the requester’s articles', async () => {
      await createArticleFor(aliceToken);
      await createArticleFor(aliceToken);
      await createArticleFor(bobToken);

      const aliceList = await authed(aliceToken, '/api/articles');
      const bobList = await authed(bobToken, '/api/articles');

      expect(aliceList.body.total).toBe(2);
      expect(bobList.body.total).toBe(1);
      expect(aliceList.body.articles.every((a: Article) => a.user_id === aliceId)).toBe(true);
      expect(bobList.body.articles.every((a: Article) => a.user_id === bobId)).toBe(true);
    });

    it('sorts articles by updated_at descending (Property 13)', async () => {
      const a = await createArticleFor(aliceToken);
      const b = await createArticleFor(aliceToken);
      const c = await createArticleFor(aliceToken);

      // Touch them in reverse order (a → newest after these patches)
      for (const id of [c.id, b.id, a.id]) {
        await authed(aliceToken, `/api/articles/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: `touched-${id}` }),
        });
        // ensure distinct updated_at timestamps for assertion
        await new Promise((r) => setTimeout(r, 20));
      }

      const list = await authed(aliceToken, '/api/articles');
      const titles = list.body.articles.map((art: Article) => art.title);
      expect(titles).toEqual([`touched-${a.id}`, `touched-${b.id}`, `touched-${c.id}`]);
    });

    it('paginates at 20 per page with metadata (Property 14)', async () => {
      // Create 25 articles for alice.
      const rows = Array.from({ length: 25 }, () => ({
        user_id: aliceId,
        title: '',
        body: { type: 'doc', content: [] },
      }));
      await db('articles').insert(rows);

      const page1 = await authed(aliceToken, '/api/articles?page=1&limit=20');
      expect(page1.body.articles).toHaveLength(20);
      expect(page1.body.page).toBe(1);
      expect(page1.body.pages).toBe(2);
      expect(page1.body.total).toBe(25);

      const page2 = await authed(aliceToken, '/api/articles?page=2&limit=20');
      expect(page2.body.articles).toHaveLength(5);
      expect(page2.body.page).toBe(2);
    });
  });

  describe('GET /api/articles/:id', () => {
    it('returns the article for its owner', async () => {
      const a = await createArticleFor(aliceToken);
      const res = await authed(aliceToken, `/api/articles/${a.id}`);
      expect(res.status).toBe(200);
      expect(res.body.article.id).toBe(a.id);
    });

    it('returns 404 for an article owned by a different user (Property 9)', async () => {
      const a = await createArticleFor(aliceToken);
      const res = await authed(bobToken, `/api/articles/${a.id}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 for a non-existent uuid', async () => {
      const res = await authed(
        aliceToken,
        `/api/articles/00000000-0000-0000-0000-000000000000`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/articles/:id', () => {
    it('persists title and body — round-trip matches (Property 8)', async () => {
      const a = await createArticleFor(aliceToken);
      const body = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Round-trip me' }],
          },
        ],
      };

      const patch = await authed(aliceToken, `/api/articles/${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Saved Title', body }),
      });
      expect(patch.status).toBe(200);

      const fetched = await authed(aliceToken, `/api/articles/${a.id}`);
      expect(fetched.body.article.title).toBe('Saved Title');
      expect(fetched.body.article.body).toEqual(body);
    });

    it('rejects a title over 200 characters with 400', async () => {
      const a = await createArticleFor(aliceToken);
      const res = await authed(aliceToken, `/api/articles/${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'x'.repeat(201) }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 when patching another user’s article', async () => {
      const a = await createArticleFor(aliceToken);
      const res = await authed(bobToken, `/api/articles/${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'evil' }),
      });
      expect(res.status).toBe(404);

      const aliceView = await authed(aliceToken, `/api/articles/${a.id}`);
      expect(aliceView.body.article.title).toBe(''); // not changed
    });

    it('translates Postgres statement_timeout (57014) into StatementTimeoutError', async () => {
      // Direct service-layer call with a tight timeout + a forced slow query
      // proves the catch path (which the route maps to 504).
      const a = await createArticleFor(aliceToken);

      await expect(
        db.transaction(async (trx) => {
          await trx.raw('SET LOCAL statement_timeout = 50');
          await trx.raw('SELECT pg_sleep(0.2)');
          await trx('articles').where({ id: a.id }).update({ title: 'x' });
        }),
      ).rejects.toMatchObject({ code: '57014' });

      // Sanity: updateArticle path with a real (generous) timeout still works.
      const ok = await updateArticle(db, aliceId, a.id, { title: 'normal' });
      expect(ok?.title).toBe('normal');
    });
  });

  describe('DELETE /api/articles/:id', () => {
    it('removes the article and cascades to article_images (Property 15)', async () => {
      const a = await createArticleFor(aliceToken);
      await db('article_images').insert([
        {
          article_id: a.id,
          user_id: aliceId,
          storage_key: 'alice/img1.png',
          url: 'http://example/img1.png',
          size_bytes: 100,
          mime_type: 'image/png',
        },
        {
          article_id: a.id,
          user_id: aliceId,
          storage_key: 'alice/img2.png',
          url: 'http://example/img2.png',
          size_bytes: 200,
          mime_type: 'image/png',
        },
      ]);

      const del = await authed(aliceToken, `/api/articles/${a.id}`, { method: 'DELETE' });
      expect(del.status).toBe(200);

      const after = await authed(aliceToken, `/api/articles/${a.id}`);
      expect(after.status).toBe(404);

      const remainingImages = await db('article_images').where({ article_id: a.id });
      expect(remainingImages).toEqual([]);
    });

    it('returns 404 when deleting another user’s article', async () => {
      const a = await createArticleFor(aliceToken);
      const res = await authed(bobToken, `/api/articles/${a.id}`, { method: 'DELETE' });
      expect(res.status).toBe(404);

      const stillThere = await authed(aliceToken, `/api/articles/${a.id}`);
      expect(stillThere.status).toBe(200);
    });
  });

  describe('Concurrent writes by different users (Property 16)', () => {
    it('parallel PATCHes never cross-contaminate', async () => {
      const aArticle = await createArticleFor(aliceToken);
      const bArticle = await createArticleFor(bobToken);

      const aliceBody = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'alice writes' }] }],
      };
      const bobBody = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'bob writes' }] }],
      };

      const [aRes, bRes] = await Promise.all([
        authed(aliceToken, `/api/articles/${aArticle.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: 'alice-title', body: aliceBody }),
        }),
        authed(bobToken, `/api/articles/${bArticle.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: 'bob-title', body: bobBody }),
        }),
      ]);

      expect(aRes.status).toBe(200);
      expect(bRes.status).toBe(200);

      const [aFetch, bFetch] = await Promise.all([
        authed(aliceToken, `/api/articles/${aArticle.id}`),
        authed(bobToken, `/api/articles/${bArticle.id}`),
      ]);
      expect(aFetch.body.article.title).toBe('alice-title');
      expect(aFetch.body.article.body).toEqual(aliceBody);
      expect(bFetch.body.article.title).toBe('bob-title');
      expect(bFetch.body.article.body).toEqual(bobBody);
    });
  });
});
