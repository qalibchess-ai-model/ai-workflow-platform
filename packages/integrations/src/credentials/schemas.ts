import { z } from "zod";

/**
 * Per-provider Zod schemas for user-supplied API credentials.
 *
 * Each schema describes *which* fields a credential entry needs. Values are
 * always stored encrypted; these schemas exist so the UI can render the right
 * form and the workflow engine can fail fast on missing/malformed credentials.
 */

export const NotionCredentialSchema = z.object({
  apiKey: z
    .string()
    .min(20, "Notion integration token expected (secret_...)")
    .describe("Notion integration token, e.g. secret_AbCd..."),
});

export const TelegramCredentialSchema = z.object({
  botToken: z
    .string()
    .regex(/^\d+:[A-Za-z0-9_-]+$/, "Telegram bot token format: <bot_id>:<hash>")
    .describe("Bot token from @BotFather"),
});

export const SlackCredentialSchema = z.object({
  botToken: z
    .string()
    .startsWith("xoxb-", "Slack bot tokens start with xoxb-")
    .describe("Slack bot user OAuth token (xoxb-...)"),
});

export const HubspotCredentialSchema = z.object({
  accessToken: z.string().min(20).describe("HubSpot private app access token"),
});

export const SupabaseCredentialSchema = z.object({
  url: z.string().url().describe("Project URL (https://xxx.supabase.co)"),
  anonKey: z.string().min(20).describe("Anon (public) key"),
  serviceKey: z
    .string()
    .min(20)
    .describe("Service role key — server-side only, never exposed to the browser"),
});

export const CustomCredentialSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

export const PROVIDER_CREDENTIAL_SCHEMAS = {
  notion: NotionCredentialSchema,
  telegram: TelegramCredentialSchema,
  slack: SlackCredentialSchema,
  hubspot: HubspotCredentialSchema,
  supabase: SupabaseCredentialSchema,
  custom: CustomCredentialSchema,
} as const;

export type CredentialProvider = keyof typeof PROVIDER_CREDENTIAL_SCHEMAS;

export const CREDENTIAL_PROVIDERS = Object.keys(
  PROVIDER_CREDENTIAL_SCHEMAS,
) as CredentialProvider[];

export interface ProviderFieldSpec {
  name: string;
  label: string;
  required: boolean;
  /** true → render as masked password input; never show plaintext. */
  secret: boolean;
  placeholder?: string;
}

export interface ProviderMeta {
  key: CredentialProvider;
  displayName: string;
  description: string;
  fields: ProviderFieldSpec[];
}

export const PROVIDER_METADATA: Record<CredentialProvider, ProviderMeta> = {
  notion: {
    key: "notion",
    displayName: "Notion",
    description: "Notion-a məlumat yazmaq və oxumaq üçün integration token.",
    fields: [
      {
        name: "apiKey",
        label: "Integration Token",
        required: true,
        secret: true,
        placeholder: "secret_…",
      },
    ],
  },
  telegram: {
    key: "telegram",
    displayName: "Telegram",
    description: "Bot vasitəsilə mesaj göndərmək üçün bot token.",
    fields: [
      {
        name: "botToken",
        label: "Bot Token",
        required: true,
        secret: true,
        placeholder: "123456:ABC-DEF…",
      },
    ],
  },
  slack: {
    key: "slack",
    displayName: "Slack",
    description: "Bot user OAuth token — kanal mesajları üçün.",
    fields: [
      {
        name: "botToken",
        label: "Bot User OAuth Token",
        required: true,
        secret: true,
        placeholder: "xoxb-…",
      },
    ],
  },
  hubspot: {
    key: "hubspot",
    displayName: "HubSpot",
    description: "Private App access token — contact, deal, ticket idarəsi.",
    fields: [
      {
        name: "accessToken",
        label: "Access Token",
        required: true,
        secret: true,
        placeholder: "pat-…",
      },
    ],
  },
  supabase: {
    key: "supabase",
    displayName: "Supabase",
    description: "Layihənin URL-i + key-ləri.",
    fields: [
      {
        name: "url",
        label: "Project URL",
        required: true,
        secret: false,
        placeholder: "https://xxx.supabase.co",
      },
      { name: "anonKey", label: "Anon Key", required: true, secret: true },
      { name: "serviceKey", label: "Service Role Key", required: true, secret: true },
    ],
  },
  custom: {
    key: "custom",
    displayName: "Custom",
    description: "İstənilən digər servis üçün generic API key + base URL.",
    fields: [
      { name: "apiKey", label: "API Key", required: true, secret: true },
      {
        name: "baseUrl",
        label: "Base URL (optional)",
        required: false,
        secret: false,
        placeholder: "https://api.example.com",
      },
    ],
  },
};

export function getCredentialSchema(provider: string): z.ZodTypeAny {
  if (!(provider in PROVIDER_CREDENTIAL_SCHEMAS)) {
    throw new Error(`Unknown credential provider: ${provider}`);
  }
  return PROVIDER_CREDENTIAL_SCHEMAS[provider as CredentialProvider];
}

export function isKnownProvider(provider: string): provider is CredentialProvider {
  return provider in PROVIDER_CREDENTIAL_SCHEMAS;
}

export function parseCredentialValue(provider: string, raw: unknown): Record<string, unknown> {
  const schema = getCredentialSchema(provider);
  return schema.parse(raw) as Record<string, unknown>;
}

export type NotionCredential = z.infer<typeof NotionCredentialSchema>;
export type TelegramCredential = z.infer<typeof TelegramCredentialSchema>;
export type SlackCredential = z.infer<typeof SlackCredentialSchema>;
export type HubspotCredential = z.infer<typeof HubspotCredentialSchema>;
export type SupabaseCredential = z.infer<typeof SupabaseCredentialSchema>;
export type CustomCredential = z.infer<typeof CustomCredentialSchema>;
