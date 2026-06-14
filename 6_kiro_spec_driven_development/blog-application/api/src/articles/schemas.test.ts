import { describe, expect, it } from 'vitest';
import { articleIdSchema, listQuerySchema, patchSchema } from './schemas';

describe('listQuerySchema', () => {
  it('defaults to page=1 and limit=20 when called with no query params', () => {
    expect(listQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('coerces string query values to integers', () => {
    expect(listQuerySchema.parse({ page: '3', limit: '5' })).toEqual({
      page: 3,
      limit: 5,
    });
  });

  it.each([
    { page: '0' },
    { page: '-1' },
    { limit: '0' },
    { limit: '-5' },
    { limit: '101' },
  ])('rejects out-of-range value %o', (q) => {
    expect(listQuerySchema.safeParse(q).success).toBe(false);
  });
});

describe('patchSchema', () => {
  it('accepts a title-only patch', () => {
    expect(patchSchema.parse({ title: 'Hello' })).toEqual({ title: 'Hello' });
  });

  it('accepts a body-only patch', () => {
    const body = { type: 'doc', content: [] };
    expect(patchSchema.parse({ body })).toEqual({ body });
  });

  it('accepts a fully-empty patch (no-op update)', () => {
    expect(patchSchema.parse({})).toEqual({});
  });

  it('accepts exactly 200-character titles', () => {
    const title = 'a'.repeat(200);
    expect(patchSchema.safeParse({ title }).success).toBe(true);
  });

  it('rejects titles over 200 characters', () => {
    const title = 'a'.repeat(201);
    expect(patchSchema.safeParse({ title }).success).toBe(false);
  });

  it('rejects non-object bodies', () => {
    expect(patchSchema.safeParse({ body: 'not-an-object' }).success).toBe(false);
    expect(patchSchema.safeParse({ body: 42 }).success).toBe(false);
  });
});

describe('articleIdSchema', () => {
  it('accepts a UUID', () => {
    expect(
      articleIdSchema.safeParse('a4b3c2d1-1234-5678-9012-abcdef012345').success,
    ).toBe(true);
  });

  it('rejects non-UUID strings', () => {
    expect(articleIdSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(articleIdSchema.safeParse('123').success).toBe(false);
  });
});
