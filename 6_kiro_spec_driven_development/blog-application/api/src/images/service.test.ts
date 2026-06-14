import { Knex } from 'knex';
import { describe, expect, it, vi } from 'vitest';
import {
  StorageError,
  UploadTimeoutError,
  generateStorageKey,
  uploadImage,
} from './service';
import { StorageClient } from './storage';

function makeStorage(overrides: Partial<StorageClient> = {}): StorageClient {
  return {
    upload: vi.fn(async () => {}),
    publicUrlFor: (key: string) => `https://cdn.example/${key}`,
    ...overrides,
  };
}

// Tiny mock that only supports: db('article_images').insert(...).returning([...]).
function makeDb(): { db: Knex; rows: Record<string, unknown>[] } {
  const rows: Record<string, unknown>[] = [];
  const fn = (table: string) => {
    if (table !== 'article_images') throw new Error(`unexpected table: ${table}`);
    return {
      insert(row: Record<string, unknown>) {
        return {
          returning(_cols: string[]) {
            const inserted = { id: `id-${rows.length + 1}`, ...row };
            rows.push(inserted);
            return Promise.resolve([inserted]);
          },
        };
      },
    };
  };
  return { db: fn as unknown as Knex, rows };
}

describe('generateStorageKey', () => {
  it('produces keys of shape <userId>/<uuid>.<ext>', () => {
    const key = generateStorageKey('user-1', 'image/png');
    expect(key).toMatch(/^user-1\/[0-9a-f-]{36}\.png$/);
  });

  it('maps each accepted MIME type to its canonical extension', () => {
    expect(generateStorageKey('u', 'image/jpeg')).toMatch(/\.jpg$/);
    expect(generateStorageKey('u', 'image/png')).toMatch(/\.png$/);
    expect(generateStorageKey('u', 'image/gif')).toMatch(/\.gif$/);
    expect(generateStorageKey('u', 'image/webp')).toMatch(/\.webp$/);
  });
});

describe('uploadImage', () => {
  it('uploads, builds the public URL, and inserts the article_images row', async () => {
    const storage = makeStorage();
    const { db, rows } = makeDb();

    const result = await uploadImage(db, storage, {
      userId: 'user-A',
      buffer: Buffer.from([1, 2, 3]),
      sizeBytes: 3,
      mimeType: 'image/png',
    });

    expect(storage.upload).toHaveBeenCalledOnce();
    expect(result.url).toMatch(/^https:\/\/cdn\.example\/user-A\/.*\.png$/);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: 'user-A',
      mime_type: 'image/png',
      size_bytes: 3,
    });
  });

  it('throws UploadTimeoutError when the storage upload aborts', async () => {
    const storage = makeStorage({
      upload: vi.fn(async () => {
        const e = new Error('aborted');
        (e as Error & { name: string }).name = 'AbortError';
        throw e;
      }),
    });
    const { db, rows } = makeDb();

    await expect(
      uploadImage(db, storage, {
        userId: 'user-B',
        buffer: Buffer.from([0]),
        sizeBytes: 1,
        mimeType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(UploadTimeoutError);

    // No DB row on failure (Acceptance Criterion 5).
    expect(rows).toEqual([]);
  });

  it('throws StorageError on any other upload failure (no DB row written)', async () => {
    const storage = makeStorage({
      upload: vi.fn(async () => {
        throw new Error('network glitch');
      }),
    });
    const { db, rows } = makeDb();

    await expect(
      uploadImage(db, storage, {
        userId: 'user-C',
        buffer: Buffer.from([0]),
        sizeBytes: 1,
        mimeType: 'image/png',
      }),
    ).rejects.toBeInstanceOf(StorageError);

    expect(rows).toEqual([]);
  });

  it('forwards the timeoutMs override to the storage client', async () => {
    const storage = makeStorage();
    const { db } = makeDb();

    await uploadImage(
      db,
      storage,
      {
        userId: 'u',
        buffer: Buffer.from([1]),
        sizeBytes: 1,
        mimeType: 'image/png',
      },
      1234,
    );

    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 1234 }),
    );
  });
});
