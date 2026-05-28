import { z } from "zod";

export const SLACK_PROVIDER_KEY = "slack";

/**
 * Slack accepts channel IDs (e.g. "C0123456789", "G…", "D…") or channel names
 * ("#general"). Both are passed in the `channel` field of the Web API call, so
 * we accept a string here and let Slack reject anything malformed.
 */
const Channel = z.string().min(1).max(80);

/**
 * Slack Block Kit blocks — we don't model the full schema here (Slack's own
 * schema is huge and evolves), but we ensure each block is an object so an
 * obviously-bad value (string, number, null) is rejected before we hit the
 * API.
 */
const Blocks = z.array(z.record(z.unknown())).max(50);

export const SendMessageInput = z.object({
  tenantId: z.string().min(1),
  channel: Channel,
  text: z.string().min(1).max(40000),
  blocks: Blocks.optional(),
});

export const SendMessageOutput = z.object({
  ok: z.boolean(),
  channel: z.string(),
  ts: z.string(),
});

export const UploadFileInput = z.object({
  tenantId: z.string().min(1),
  channel: Channel,
  fileUrl: z.string().url(),
  title: z.string().max(255).optional(),
});

export const UploadFileOutput = z.object({
  ok: z.boolean(),
  fileId: z.string(),
});

export type SendMessageInput = z.infer<typeof SendMessageInput>;
export type SendMessageOutput = z.infer<typeof SendMessageOutput>;
export type UploadFileInput = z.infer<typeof UploadFileInput>;
export type UploadFileOutput = z.infer<typeof UploadFileOutput>;
