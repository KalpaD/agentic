import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import {
  setupTestDb,
  teardownTestDb,
  listTables,
  indexExists,
} from '../test/integration-db';

describe('Database schema & migrations (integration)', () => {
  let db: Knex;

  beforeAll(async () => {
    db = await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb(db);
  });

  beforeEach(async () => {
    // Reset to a fully-migrated, empty-data state for every test.
    await db.migrate.rollback(undefined, true);
    await db.migrate.latest();
  });

  // ── Acceptance criterion 2: all 4 tables exist with correct columns ──────
  describe('schema after migrate.latest()', () => {
    it('creates all 4 application tables', async () => {
      expect(await listTables(db)).toEqual([
        'article_images',
        'articles',
        'refresh_tokens',
        'users',
      ]);
    });

    it('creates the idx_articles_user_updated index', async () => {
      expect(await indexExists(db, 'idx_articles_user_updated')).toBe(true);
    });

    it('articles.body defaults to an empty TipTap document', async () => {
      const [user] = await db('users')
        .insert({ username: 'shape-test', password_hash: 'x' })
        .returning('*');
      const [article] = await db('articles')
        .insert({ user_id: user.id })
        .returning('*');
      expect(article.body).toEqual({ type: 'doc', content: [] });
    });

    it('articles.status CHECK constraint rejects values other than draft/published', async () => {
      const [user] = await db('users')
        .insert({ username: 'check-test', password_hash: 'x' })
        .returning('*');
      await expect(
        db('articles').insert({ user_id: user.id, status: 'archived' }),
      ).rejects.toThrow();
    });
  });

  // ── Special Notes: updated_at trigger fires on UPDATE ────────────────────
  describe('updated_at trigger on articles', () => {
    it('bumps updated_at on every UPDATE', async () => {
      const [user] = await db('users')
        .insert({ username: 'trig', password_hash: 'x' })
        .returning('*');
      const [article] = await db('articles')
        .insert({ user_id: user.id, title: 'original' })
        .returning('*');

      // Force a measurable gap so the trigger's now() differs.
      await new Promise((r) => setTimeout(r, 50));

      const [updated] = await db('articles')
        .where({ id: article.id })
        .update({ title: 'changed' })
        .returning('*');

      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(article.updated_at).getTime(),
      );
    });
  });

  // ── FK cascade behaviors ─────────────────────────────────────────────────
  describe('foreign-key cascade behavior', () => {
    it('articles.user_id ON DELETE CASCADE removes all of a user’s articles', async () => {
      const [user] = await db('users')
        .insert({ username: 'cascade-articles', password_hash: 'x' })
        .returning('*');
      await db('articles').insert([
        { user_id: user.id, title: 'a' },
        { user_id: user.id, title: 'b' },
      ]);

      await db('users').where({ id: user.id }).delete();

      const remaining = await db('articles').where({ user_id: user.id });
      expect(remaining).toEqual([]);
    });

    it('refresh_tokens.user_id ON DELETE CASCADE removes a user’s tokens', async () => {
      const [user] = await db('users')
        .insert({ username: 'cascade-tokens', password_hash: 'x' })
        .returning('*');
      await db('refresh_tokens').insert({
        user_id: user.id,
        token_hash: 'abc',
        expires_at: new Date(Date.now() + 86400000),
      });

      await db('users').where({ id: user.id }).delete();

      const remaining = await db('refresh_tokens').where({ user_id: user.id });
      expect(remaining).toEqual([]);
    });

    it('article_images.article_id ON DELETE SET NULL when an article is deleted', async () => {
      const [user] = await db('users')
        .insert({ username: 'cascade-images', password_hash: 'x' })
        .returning('*');
      const [article] = await db('articles')
        .insert({ user_id: user.id, title: 'with image' })
        .returning('*');
      const [image] = await db('article_images')
        .insert({
          article_id: article.id,
          user_id: user.id,
          storage_key: 'key/1.png',
          url: 'http://example/img.png',
          size_bytes: 1024,
          mime_type: 'image/png',
        })
        .returning('*');

      await db('articles').where({ id: article.id }).delete();

      const after = await db('article_images').where({ id: image.id }).first();
      expect(after).toBeDefined();
      expect(after.article_id).toBeNull();
      // Image still belongs to the user — only the article reference is nulled.
      expect(after.user_id).toBe(user.id);
    });

    it('article_images.user_id ON DELETE CASCADE removes the user’s images too', async () => {
      const [user] = await db('users')
        .insert({ username: 'cascade-user-images', password_hash: 'x' })
        .returning('*');
      const [article] = await db('articles')
        .insert({ user_id: user.id })
        .returning('*');
      await db('article_images').insert({
        article_id: article.id,
        user_id: user.id,
        storage_key: 'key/2.png',
        url: 'http://example/2.png',
        size_bytes: 2048,
        mime_type: 'image/png',
      });

      await db('users').where({ id: user.id }).delete();

      const remaining = await db('article_images').where({ user_id: user.id });
      expect(remaining).toEqual([]);
    });
  });

  // ── Migration rollback: each down() restores the previous state ──────────
  describe('migration rollback', () => {
    it('each migration’s down() restores the prior schema state', async () => {
      // Start from empty (beforeEach left us at latest).
      await db.migrate.rollback(undefined, true);
      expect(await listTables(db)).toEqual([]);

      // Up #1: users
      await db.migrate.up();
      expect(await listTables(db)).toEqual(['users']);

      // Up #2: refresh_tokens
      await db.migrate.up();
      expect(await listTables(db)).toEqual(['refresh_tokens', 'users']);

      // Up #3: articles (also creates the index + trigger)
      await db.migrate.up();
      expect(await listTables(db)).toEqual([
        'articles',
        'refresh_tokens',
        'users',
      ]);
      expect(await indexExists(db, 'idx_articles_user_updated')).toBe(true);

      // Up #4: article_images
      await db.migrate.up();
      expect(await listTables(db)).toEqual([
        'article_images',
        'articles',
        'refresh_tokens',
        'users',
      ]);

      // Down — reverse order, each step restores the prior state.
      await db.migrate.down();
      expect(await listTables(db)).toEqual([
        'articles',
        'refresh_tokens',
        'users',
      ]);

      await db.migrate.down();
      expect(await listTables(db)).toEqual(['refresh_tokens', 'users']);
      expect(await indexExists(db, 'idx_articles_user_updated')).toBe(false);

      await db.migrate.down();
      expect(await listTables(db)).toEqual(['users']);

      await db.migrate.down();
      expect(await listTables(db)).toEqual([]);
    });
  });

  // ── Seed verification ────────────────────────────────────────────────────
  describe('seed data', () => {
    it('seeds alice and bob with password "password123"', async () => {
      await db.seed.run();

      const users = await db('users')
        .whereIn('username', ['alice', 'bob'])
        .orderBy('username');

      expect(users.map((u) => u.username)).toEqual(['alice', 'bob']);

      for (const user of users) {
        expect(await bcrypt.compare('password123', user.password_hash)).toBe(true);
      }
    });

    it('seed is idempotent — re-running does not duplicate users', async () => {
      await db.seed.run();
      await db.seed.run();

      const count = await db('users')
        .whereIn('username', ['alice', 'bob'])
        .count<{ count: string }[]>('* as count');
      expect(Number(count[0].count)).toBe(2);
    });
  });
});
