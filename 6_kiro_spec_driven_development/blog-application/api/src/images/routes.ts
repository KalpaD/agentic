import { NextFunction, Request, Response, Router } from 'express';
import { Knex } from 'knex';
import multer from 'multer';
import { requireAuth } from '../auth/middleware';
import { StorageClient } from './storage';
import { StorageError, UploadTimeoutError, uploadImage } from './service';
import {
  FILE_TOO_LARGE,
  MAX_FILE_SIZE_BYTES,
  validateFile,
} from './validation';

export function createImagesRouter(db: Knex, storage: StorageClient): Router {
  const router = Router();

  // Buffer the upload in memory with a hard size cap so oversized payloads
  // never fully materialise — multer aborts the stream once the limit is hit.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  });

  router.use(requireAuth);

  router.post(
    '/',
    (req: Request, res: Response, next: NextFunction) => {
      upload.single('file')(req, res, (err: unknown) => {
        if (err) {
          if (isMulterSizeError(err)) {
            res.status(400).json({ error: FILE_TOO_LARGE });
            return;
          }
          next(err);
          return;
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const validation = validateFile(file.size, file.mimetype);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }

      try {
        const result = await uploadImage(db, storage, {
          userId: req.userId!,
          buffer: file.buffer,
          sizeBytes: file.size,
          mimeType: file.mimetype,
        });
        res.status(200).json({ url: result.url });
      } catch (err) {
        if (err instanceof UploadTimeoutError) {
          res.status(502).json({ error: 'Image upload timed out' });
          return;
        }
        if (err instanceof StorageError) {
          res.status(502).json({ error: 'Image upload failed' });
          return;
        }
        throw err;
      }
    },
  );

  return router;
}

function isMulterSizeError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'LIMIT_FILE_SIZE'
  );
}
