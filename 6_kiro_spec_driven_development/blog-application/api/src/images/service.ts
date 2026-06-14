import crypto from 'crypto';
import { Knex } from 'knex';
import { StorageClient } from './storage';

export const UPLOAD_TIMEOUT_MS = 10_000;

export class StorageError extends Error {
  constructor(message = 'Image upload failed') {
    super(message);
    this.name = 'StorageError';
  }
}

export class UploadTimeoutError extends Error {
  constructor(message = 'Image upload timed out') {
    super(message);
    this.name = 'UploadTimeoutError';
  }
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Builds an opaque, per-user storage key that does NOT include the
 * user-supplied filename — eliminates any path-traversal vector from
 * client-controlled bytes. Format: `<userId>/<uuid>.<ext>`.
 */
export function generateStorageKey(userId: string, mimeType: string): string {
  const ext = EXTENSION_BY_MIME[mimeType] ?? 'bin';
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}

export interface UploadInput {
  userId: string;
  buffer: Buffer;
  sizeBytes: number;
  mimeType: string;
}

export interface UploadResult {
  id: string;
  url: string;
  storageKey: string;
}

/**
 * Uploads the file to S3-compatible storage, then records its metadata in
 * `article_images`. If the upload fails (or aborts on the timeout), no DB row
 * is created — the caller surfaces 502.
 */
export async function uploadImage(
  db: Knex,
  storage: StorageClient,
  input: UploadInput,
  timeoutMs: number = UPLOAD_TIMEOUT_MS,
): Promise<UploadResult> {
  const key = generateStorageKey(input.userId, input.mimeType);

  try {
    await storage.upload({
      key,
      body: input.buffer,
      contentType: input.mimeType,
      timeoutMs,
    });
  } catch (err) {
    if (isAbortError(err)) throw new UploadTimeoutError();
    throw new StorageError((err as Error).message);
  }

  const url = storage.publicUrlFor(key);

  const [row] = await db('article_images')
    .insert({
      user_id: input.userId,
      storage_key: key,
      url,
      size_bytes: input.sizeBytes,
      mime_type: input.mimeType,
    })
    .returning<{ id: string }[]>(['id']);

  return { id: row.id, url, storageKey: key };
}

function isAbortError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { name?: string; code?: string };
  return e.name === 'AbortError' || e.code === 'AbortError' || e.code === 'ABORTED';
}
