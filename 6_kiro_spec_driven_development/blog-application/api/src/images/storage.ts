import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface StorageConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  publicUrl: string;
}

export interface StorageClient {
  upload(input: {
    key: string;
    body: Buffer;
    contentType: string;
    timeoutMs: number;
  }): Promise<void>;
  publicUrlFor(key: string): string;
}

export function loadStorageConfig(): StorageConfig {
  const required = [
    'STORAGE_ENDPOINT',
    'STORAGE_ACCESS_KEY',
    'STORAGE_SECRET_KEY',
    'STORAGE_BUCKET',
    'STORAGE_REGION',
    'STORAGE_PUBLIC_URL',
  ] as const;
  for (const k of required) {
    if (!process.env[k]) throw new Error(`Missing required env var: ${k}`);
  }
  return {
    endpoint: process.env.STORAGE_ENDPOINT!,
    accessKey: process.env.STORAGE_ACCESS_KEY!,
    secretKey: process.env.STORAGE_SECRET_KEY!,
    bucket: process.env.STORAGE_BUCKET!,
    region: process.env.STORAGE_REGION!,
    publicUrl: process.env.STORAGE_PUBLIC_URL!,
  };
}

/**
 * Builds an S3-compatible upload client. The same code is used for MinIO in
 * local dev and real S3 in production — only the env vars differ.
 *
 * `forcePathStyle: true` is required for MinIO, which does not support the
 * virtual-host bucket addressing real S3 uses.
 */
export function createStorageClient(config: StorageConfig): StorageClient {
  const s3 = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });

  return {
    async upload({ key, body, contentType, timeoutMs }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
          }),
          { abortSignal: controller.signal },
        );
      } finally {
        clearTimeout(timer);
      }
    },
    publicUrlFor(key) {
      // STORAGE_PUBLIC_URL already includes the bucket (e.g.
      // http://localhost:9000/blog-images) — append the object key.
      return `${config.publicUrl.replace(/\/$/, '')}/${key}`;
    },
  };
}
