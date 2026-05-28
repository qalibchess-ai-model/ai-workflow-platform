import { z } from "zod";

export const GMAIL_PROVIDER_KEY = "gmail";

export const SendEmailInput = z.object({
  tenantId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  html: z.boolean().default(false),
});

export const SendEmailOutput = z.object({
  messageId: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()).optional(),
});

export const ListMessagesInput = z.object({
  tenantId: z.string().min(1),
  query: z.string().max(1000).optional(),
  labelIds: z.array(z.string()).optional(),
  maxResults: z.number().int().min(1).max(500).default(20),
  pageToken: z.string().optional(),
  includeSpamTrash: z.boolean().default(false),
});

export const GmailMessageRef = z.object({
  id: z.string(),
  threadId: z.string(),
});

export const ListMessagesOutput = z.object({
  messages: z.array(GmailMessageRef),
  resultSizeEstimate: z.number().int().nonnegative(),
  nextPageToken: z.string().optional(),
});

export type SendEmailInput = z.infer<typeof SendEmailInput>;
export type SendEmailOutput = z.infer<typeof SendEmailOutput>;
export type ListMessagesInput = z.infer<typeof ListMessagesInput>;
export type ListMessagesOutput = z.infer<typeof ListMessagesOutput>;
