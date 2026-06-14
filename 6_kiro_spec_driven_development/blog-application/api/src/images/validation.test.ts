import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MIME_TYPES,
  FILE_TOO_LARGE,
  MAX_FILE_SIZE_BYTES,
  UNSUPPORTED_FORMAT,
  validateFile,
} from './validation';

describe('validateFile', () => {
  // Property 10 (valid cases): any size in (0, 10MB] with an accepted MIME passes.
  it.each(ALLOWED_MIME_TYPES.map((m) => [m]))(
    'accepts a 1-byte %s file',
    (mime) => {
      expect(validateFile(1, mime)).toEqual({ ok: true });
    },
  );

  it.each(ALLOWED_MIME_TYPES.map((m) => [m]))(
    'accepts an exactly-10MB %s file (boundary)',
    (mime) => {
      expect(validateFile(MAX_FILE_SIZE_BYTES, mime)).toEqual({ ok: true });
    },
  );

  // Property 11 (oversized): files over the cap are rejected with the size message.
  it('rejects a file that is 1 byte over the limit', () => {
    expect(validateFile(MAX_FILE_SIZE_BYTES + 1, 'image/jpeg')).toEqual({
      ok: false,
      error: FILE_TOO_LARGE,
    });
  });

  // Property 11 (bad MIME): unsupported formats rejected with the accepted list.
  it.each([['image/svg+xml'], ['application/pdf'], ['text/plain']])(
    'rejects unsupported MIME %s with the accepted-format list',
    (mime) => {
      const result = validateFile(1024, mime);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(UNSUPPORTED_FORMAT);
        expect(result.error).toContain('JPEG');
        expect(result.error).toContain('PNG');
        expect(result.error).toContain('GIF');
        expect(result.error).toContain('WebP');
      }
    },
  );

  // Spec: "rejects files that are both oversized and wrong format — error
  // references size constraint". Size check must run before MIME check.
  it('reports size error when a file is both oversized AND the wrong format', () => {
    const result = validateFile(MAX_FILE_SIZE_BYTES + 1, 'application/pdf');
    expect(result).toEqual({ ok: false, error: FILE_TOO_LARGE });
  });
});
