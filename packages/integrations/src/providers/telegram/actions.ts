import { IntegrationError } from "../../errors";
import { withRateLimit } from "../../rate-limit";
import {
  SendMessageInput,
  SendMessageOutput,
  SendPhotoInput,
  SendPhotoOutput,
  TELEGRAM_PROVIDER_KEY,
} from "./schemas";

const DEFAULT_API_BASE = "https://api.telegram.org";

type TelegramOk = {
  ok: true;
  result: { message_id?: unknown };
};

type TelegramErr = {
  ok: false;
  description?: unknown;
  error_code?: unknown;
};

type TelegramResponse = TelegramOk | TelegramErr;

function apiBase(): string {
  return process.env.TELEGRAM_API_BASE ?? DEFAULT_API_BASE;
}

/**
 * Telegram bot tokens can appear in error messages and stack traces. Strip them
 * before we ever propagate text to a user-visible field.
 */
function redactToken(text: string, botToken: string): string {
  if (!botToken) return text;
  return text.split(botToken).join("***");
}

async function callBotApi<T>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${apiBase()}/bot${botToken}/${method}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new IntegrationError(`Telegram request failed: ${redactToken(message, botToken)}`);
  }

  let payload: TelegramResponse;
  try {
    payload = (await response.json()) as TelegramResponse;
  } catch {
    throw new IntegrationError(`Telegram returned non-JSON response (status ${response.status})`);
  }

  if (!payload.ok) {
    const desc = typeof payload.description === "string" ? payload.description : "unknown error";
    throw new IntegrationError(`Telegram API error: ${redactToken(desc, botToken)}`);
  }

  return payload as T;
}

function extractMessageId(result: { message_id?: unknown }): number {
  if (typeof result.message_id !== "number" || !Number.isFinite(result.message_id)) {
    throw new IntegrationError("Telegram response missing numeric message_id");
  }
  return result.message_id;
}

export async function sendMessage(rawInput: unknown, botToken: string): Promise<SendMessageOutput> {
  const input = SendMessageInput.parse(rawInput);

  return withRateLimit(TELEGRAM_PROVIDER_KEY, input.tenantId, async () => {
    const body: Record<string, unknown> = {
      chat_id: input.chatId,
      text: input.text,
    };
    if (input.parseMode) body.parse_mode = input.parseMode;
    if (typeof input.disableWebPagePreview === "boolean") {
      body.disable_web_page_preview = input.disableWebPagePreview;
    }

    const response = await callBotApi<TelegramOk>(botToken, "sendMessage", body);
    return SendMessageOutput.parse({
      messageId: extractMessageId(response.result),
      ok: response.ok,
    });
  });
}

export async function sendPhoto(rawInput: unknown, botToken: string): Promise<SendPhotoOutput> {
  const input = SendPhotoInput.parse(rawInput);

  return withRateLimit(TELEGRAM_PROVIDER_KEY, input.tenantId, async () => {
    const body: Record<string, unknown> = {
      chat_id: input.chatId,
      photo: input.photoUrl,
    };
    if (input.caption) body.caption = input.caption;
    if (input.parseMode) body.parse_mode = input.parseMode;

    const response = await callBotApi<TelegramOk>(botToken, "sendPhoto", body);
    return SendPhotoOutput.parse({
      messageId: extractMessageId(response.result),
      ok: response.ok,
    });
  });
}
