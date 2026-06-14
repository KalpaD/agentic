import { Knex } from 'knex';

export const STATEMENT_TIMEOUT_MS = 2000;

// Empty TipTap document — matches the DB column default in
// 20240101000003_create_articles.ts.
const EMPTY_DOC = { type: 'doc', content: [] };

export interface Article {
  id: string;
  user_id: string;
  title: string;
  body: unknown;
  status: 'draft' | 'published';
  created_at: Date;
  updated_at: Date;
}

export interface ArticleListResult {
  articles: Article[];
  page: number;
  pages: number;
  limit: number;
  total: number;
}

export interface DeleteResult {
  deleted: boolean;
  // storage_keys of the article_images that were removed alongside the article.
  // TASK-05 will use these to enqueue MinIO object cleanup.
  storageKeys: string[];
}

export class StatementTimeoutError extends Error {
  constructor() {
    super('Article update exceeded the configured statement timeout');
    this.name = 'StatementTimeoutError';
  }
}

export async function createArticle(db: Knex, userId: string): Promise<Article> {
  const [row] = await db<Article>('articles')
    .insert({ user_id: userId, title: '', body: EMPTY_DOC })
    .returning('*');
  return row;
}

export async function listArticles(
  db: Knex,
  userId: string,
  page: number,
  limit: number,
): Promise<ArticleListResult> {
  const offset = (page - 1) * limit;

  const countRows = await db('articles')
    .where({ user_id: userId })
    .count<{ count: string }[]>('* as count');
  const total = Number(countRows[0].count);

  const articles = await db<Article>('articles')
    .where({ user_id: userId })
    .orderBy('updated_at', 'desc')
    .offset(offset)
    .limit(limit);

  return {
    articles,
    page,
    pages: total === 0 ? 1 : Math.ceil(total / limit),
    limit,
    total,
  };
}

export async function getArticle(
  db: Knex,
  userId: string,
  articleId: string,
): Promise<Article | null> {
  const row = await db<Article>('articles')
    .where({ id: articleId, user_id: userId })
    .first();
  return row ?? null;
}

/**
 * Updates an article. The UPDATE is run with a Postgres `statement_timeout`
 * applied at the transaction level — if the write exceeds it, Postgres aborts
 * with SQLSTATE 57014, which we translate into a StatementTimeoutError so the
 * route handler can return 504.
 *
 * Owner check is done in the WHERE clause (never read-then-check) so there is
 * no TOCTOU window between authorization and write.
 */
export async function updateArticle(
  db: Knex,
  userId: string,
  articleId: string,
  patch: { title?: string; body?: unknown },
  timeoutMs: number = STATEMENT_TIMEOUT_MS,
): Promise<Article | null> {
  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.body !== undefined) updates.body = patch.body;

  // Nothing to write — return the current row (still scoped to the owner).
  if (Object.keys(updates).length === 0) {
    return getArticle(db, userId, articleId);
  }

  try {
    return await db.transaction(async (trx) => {
      await trx.raw(`SET LOCAL statement_timeout = ${timeoutMs}`);
      const [row] = await trx<Article>('articles')
        .where({ id: articleId, user_id: userId })
        .update(updates)
        .returning('*');
      return row ?? null;
    });
  } catch (err) {
    if (isStatementTimeout(err)) {
      throw new StatementTimeoutError();
    }
    throw err;
  }
}

function isStatementTimeout(err: unknown): boolean {
  // Postgres SQLSTATE 57014 = query_canceled (statement_timeout fires this).
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === '57014'
  );
}

/**
 * Deletes an article and its article_images rows. The DB-level FK for
 * article_images.article_id is SET NULL (preserves binary metadata for
 * orphan cleanup); the spec wants delete cascade, so we explicitly remove
 * the image rows in the same transaction and return their storage keys
 * for an out-of-band object-store cleanup (wired in TASK-05).
 */
export async function deleteArticle(
  db: Knex,
  userId: string,
  articleId: string,
): Promise<DeleteResult> {
  return db.transaction(async (trx) => {
    const article = await trx('articles')
      .where({ id: articleId, user_id: userId })
      .first();
    if (!article) return { deleted: false, storageKeys: [] };

    const images = await trx('article_images')
      .where({ article_id: articleId })
      .select<{ storage_key: string }[]>('storage_key');

    await trx('article_images').where({ article_id: articleId }).delete();
    await trx('articles').where({ id: articleId, user_id: userId }).delete();

    return { deleted: true, storageKeys: images.map((i) => i.storage_key) };
  });
}
