export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const ALLOWED_FORMATS_LIST = 'JPEG, PNG, GIF, WebP';

export const FILE_TOO_LARGE = `File exceeds the 10 MB maximum allowed size`;
export const UNSUPPORTED_FORMAT = `Unsupported file format. Accepted formats: ${ALLOWED_FORMATS_LIST}`;

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validates a multipart file's size and MIME type. Size is checked first so a
 * file that is both oversized and the wrong format reports the size constraint
 * (per the spec's "rejects files that are both oversized and wrong format —
 * error references size constraint" requirement).
 */
export function validateFile(
  sizeBytes: number,
  mimeType: string,
): ValidationResult {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: FILE_TOO_LARGE };
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, error: UNSUPPORTED_FORMAT };
  }
  return { ok: true };
}
