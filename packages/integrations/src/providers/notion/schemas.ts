import { z } from "zod";

export const NOTION_PROVIDER_KEY = "notion";

/**
 * Notion accepts both hyphenated UUIDs ("xxxxxxxx-xxxx-...") and bare 32-char
 * hex ids in the same field. We accept either — the API normalizes them.
 */
const NotionId = z
  .string()
  .min(32)
  .max(36)
  .regex(/^[0-9a-fA-F-]+$/, "Notion id must be a 32-char hex or a hyphenated UUID");

export const CreatePageInput = z.object({
  tenantId: z.string().min(1),
  databaseId: NotionId,
  properties: z.record(z.unknown()),
  content: z.string().min(1).max(2000).optional(),
});

export const CreatePageOutput = z.object({
  pageId: z.string(),
  url: z.string().url(),
  ok: z.boolean(),
});

export const QueryDatabaseInput = z.object({
  tenantId: z.string().min(1),
  databaseId: NotionId,
  filter: z.record(z.unknown()).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  startCursor: z.string().min(1).optional(),
});

const NotionPageRef = z.object({
  id: z.string(),
  url: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});

export const QueryDatabaseOutput = z.object({
  results: z.array(NotionPageRef),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean(),
});

export type CreatePageInput = z.infer<typeof CreatePageInput>;
export type CreatePageOutput = z.infer<typeof CreatePageOutput>;
export type QueryDatabaseInput = z.infer<typeof QueryDatabaseInput>;
export type QueryDatabaseOutput = z.infer<typeof QueryDatabaseOutput>;
