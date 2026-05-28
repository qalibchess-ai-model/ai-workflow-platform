import { z } from "zod";

export const TELEGRAM_PROVIDER_KEY = "telegram";

/**
 * Telegram accepts both numeric chat ids (e.g. -100123456789) and `@channelname`
 * usernames in the same `chat_id` field. We accept a string to support both —
 * numeric ids should be passed as strings to avoid JS precision loss on the
 * 64-bit ids Telegram uses for supergroups/channels.
 */
const ChatId = z.string().min(1).max(64);

const ParseMode = z.enum(["HTML", "Markdown", "MarkdownV2"]);

export const SendMessageInput = z.object({
  tenantId: z.string().min(1),
  chatId: ChatId,
  text: z.string().min(1).max(4096),
  parseMode: ParseMode.optional(),
  disableWebPagePreview: z.boolean().optional(),
});

export const SendMessageOutput = z.object({
  messageId: z.number().int(),
  ok: z.boolean(),
});

export const SendPhotoInput = z.object({
  tenantId: z.string().min(1),
  chatId: ChatId,
  photoUrl: z.string().url(),
  caption: z.string().max(1024).optional(),
  parseMode: ParseMode.optional(),
});

export const SendPhotoOutput = z.object({
  messageId: z.number().int(),
  ok: z.boolean(),
});

export type SendMessageInput = z.infer<typeof SendMessageInput>;
export type SendMessageOutput = z.infer<typeof SendMessageOutput>;
export type SendPhotoInput = z.infer<typeof SendPhotoInput>;
export type SendPhotoOutput = z.infer<typeof SendPhotoOutput>;
