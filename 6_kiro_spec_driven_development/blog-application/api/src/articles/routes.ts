import { Request, Response, Router } from 'express';
import { Knex } from 'knex';
import { requireAuth } from '../auth/middleware';
import { articleIdSchema, listQuerySchema, patchSchema } from './schemas';
import {
  StatementTimeoutError,
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  updateArticle,
} from './service';

const NOT_FOUND = { error: 'Article not found' };

export function createArticlesRouter(db: Knex): Router {
  const router = Router();

  // Every article route requires a valid JWT and exposes req.userId.
  router.use(requireAuth);

  router.post('/', async (req: Request, res: Response) => {
    const article = await createArticle(db, req.userId!);
    res.status(201).json({ article });
  });

  router.get('/', async (req: Request, res: Response) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query parameters' });
      return;
    }
    const result = await listArticles(
      db,
      req.userId!,
      parsed.data.page,
      parsed.data.limit,
    );
    res.status(200).json(result);
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const idParse = articleIdSchema.safeParse(req.params.id);
    if (!idParse.success) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    const article = await getArticle(db, req.userId!, idParse.data);
    if (!article) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.status(200).json({ article });
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const idParse = articleIdSchema.safeParse(req.params.id);
    if (!idParse.success) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    const bodyParse = patchSchema.safeParse(req.body ?? {});
    if (!bodyParse.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: bodyParse.error.flatten(),
      });
      return;
    }

    try {
      const updated = await updateArticle(
        db,
        req.userId!,
        idParse.data,
        bodyParse.data,
      );
      if (!updated) {
        res.status(404).json(NOT_FOUND);
        return;
      }
      res.status(200).json({ article: updated });
    } catch (err) {
      if (err instanceof StatementTimeoutError) {
        res.status(504).json({ error: 'Article update timed out' });
        return;
      }
      throw err;
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const idParse = articleIdSchema.safeParse(req.params.id);
    if (!idParse.success) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    const result = await deleteArticle(db, req.userId!, idParse.data);
    if (!result.deleted) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    if (result.storageKeys.length > 0) {
      // TASK-05 will replace this with real MinIO/S3 object deletion.
      // eslint-disable-next-line no-console
      console.log(
        '[TASK-05 pending] enqueue MinIO cleanup for storage keys:',
        result.storageKeys,
      );
    }
    res.status(200).json({ ok: true });
  });

  return router;
}
