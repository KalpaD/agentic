import { z } from 'zod';

export const articleIdSchema = z.string().uuid();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Title hard cap is 200 chars (matches the VARCHAR(200) DB column).
// Body is any JSON object — full TipTap doc validation lives on the client.
export const patchSchema = z.object({
  title: z.string().max(200, 'Title may not exceed 200 characters').optional(),
  body: z.record(z.unknown()).optional(),
});

export type PatchBody = z.infer<typeof patchSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
