import { IntegrationError } from "../../errors";
import { withRateLimit } from "../../rate-limit";
import {
  SLACK_PROVIDER_KEY,
  SendMessageInput,
  SendMessageOutput,
  UploadFileInput,
  UploadFileOutput,
} from "./schemas";

const DEFAULT_API_BASE = "https://slack.com/api";

type SlackOk = { ok: true } & Record<string, unknown>;
type SlackErr = { ok: false; error?: unknown };
type SlackResponse = SlackOk | SlackErr;

function apiBase(): string {
  return process.env.SLACK_API_BASE ?? DEFAULT_API_BASE;
}

/**
 * Slack bot tokens can be echoed in error descriptions or response bodies. Strip
 * them before any text propagates into a thrown error or log line.
 */
function redactToken(text: string, botToken: string): string {
  if (!botToken) return text;
  return text.split(botToken).join("***");
}

function authHeaders(
  botToken: string,
  contentType = "application/json; charset=utf-8",
): Record<string, string> {
  return {
    Authorization: `Bearer ${botToken}`,
    "Content-Type": contentType,
  };
}

async function readJson(
  response: Response,
  botToken: string,
  context: string,
): Promise<SlackResponse> {
  let payload: SlackResponse;
  try {
    payload = (await response.json()) as SlackResponse;
  } catch {
    throw new IntegrationError(
      `Slack returned non-JSON response from ${context} (status ${response.status})`,
    );
  }
  if (!payload.ok) {
    const code = typeof payload.error === "string" ? payload.error : "unknown_error";
    throw new IntegrationError(`Slack API error from ${context}: ${redactToken(code, botToken)}`);
  }
  return payload;
}

async function callJson<T extends SlackOk>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${apiBase()}/${method}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: authHeaders(botToken),
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new IntegrationError(
      `Slack request failed (${method}): ${redactToken(message, botToken)}`,
    );
  }
  return (await readJson(response, botToken, method)) as T;
}

export async function sendMessage(rawInput: unknown, botToken: string): Promise<SendMessageOutput> {
  const input = SendMessageInput.parse(rawInput);

  return withRateLimit(SLACK_PROVIDER_KEY, input.tenantId, async () => {
    const body: Record<string, unknown> = {
      channel: input.channel,
      text: input.text,
    };
    if (input.blocks) body.blocks = input.blocks;

    const payload = await callJson<SlackOk & { channel?: unknown; ts?: unknown }>(
      botToken,
      "chat.postMessage",
      body,
    );

    if (typeof payload.channel !== "string" || typeof payload.ts !== "string") {
      throw new IntegrationError("Slack chat.postMessage response missing channel/ts");
    }
    return SendMessageOutput.parse({ ok: payload.ok, channel: payload.channel, ts: payload.ts });
  });
}

/**
 * Three-step external upload flow (files.upload was sunset in Nov 2025):
 *   1. Download bytes from fileUrl.
 *   2. files.getUploadURLExternal → reserve an upload URL + file_id.
 *   3. POST the bytes to that URL.
 *   4. files.completeUploadExternal → attach the file to the channel.
 */
export async function uploadFile(rawInput: unknown, botToken: string): Promise<UploadFileOutput> {
  const input = UploadFileInput.parse(rawInput);

  return withRateLimit(SLACK_PROVIDER_KEY, input.tenantId, async () => {
    const filename = deriveFilename(input.fileUrl);

    const sourceBytes = await downloadBytes(input.fileUrl, botToken);

    const reserveUrl = `${apiBase()}/files.getUploadURLExternal?filename=${encodeURIComponent(
      filename,
    )}&length=${sourceBytes.byteLength}`;

    let reserveResponse: Response;
    try {
      reserveResponse = await fetch(reserveUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${botToken}` },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new IntegrationError(
        `Slack request failed (files.getUploadURLExternal): ${redactToken(message, botToken)}`,
      );
    }
    const reserved = (await readJson(
      reserveResponse,
      botToken,
      "files.getUploadURLExternal",
    )) as SlackOk & { upload_url?: unknown; file_id?: unknown };

    if (typeof reserved.upload_url !== "string" || typeof reserved.file_id !== "string") {
      throw new IntegrationError(
        "Slack files.getUploadURLExternal response missing upload_url/file_id",
      );
    }

    try {
      const uploadResponse = await fetch(reserved.upload_url, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: sourceBytes,
      });
      if (!uploadResponse.ok) {
        throw new IntegrationError(`Slack upload_url returned HTTP ${uploadResponse.status}`);
      }
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new IntegrationError(
        `Slack file bytes upload failed: ${redactToken(message, botToken)}`,
      );
    }

    const completeBody: Record<string, unknown> = {
      files: [
        input.title ? { id: reserved.file_id, title: input.title } : { id: reserved.file_id },
      ],
      channel_id: input.channel,
    };

    await callJson<SlackOk>(botToken, "files.completeUploadExternal", completeBody);

    return UploadFileOutput.parse({ ok: true, fileId: reserved.file_id });
  });
}

function deriveFilename(fileUrl: string): string {
  try {
    const parsed = new URL(fileUrl);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last && last.length > 0 ? decodeURIComponent(last) : "upload";
  } catch {
    return "upload";
  }
}

async function downloadBytes(fileUrl: string, botToken: string): Promise<ArrayBuffer> {
  let response: Response;
  try {
    response = await fetch(fileUrl, { method: "GET" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new IntegrationError(`Failed to download source file: ${redactToken(message, botToken)}`);
  }
  if (!response.ok) {
    throw new IntegrationError(`Failed to download source file: HTTP ${response.status}`);
  }
  return response.arrayBuffer();
}
