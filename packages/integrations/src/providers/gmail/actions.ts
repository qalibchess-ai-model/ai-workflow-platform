import { nangoCall } from "../../nango/client";
import { withRateLimit } from "../../rate-limit";
import {
  GMAIL_PROVIDER_KEY,
  ListMessagesInput,
  ListMessagesOutput,
  SendEmailInput,
  SendEmailOutput,
} from "./schemas";

type SendRawResponse = {
  id?: unknown;
  threadId?: unknown;
  labelIds?: unknown;
};

type ListResponse = {
  messages?: Array<{ id?: unknown; threadId?: unknown }> | null;
  resultSizeEstimate?: unknown;
  nextPageToken?: unknown;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildRfc2822Message(input: SendEmailInput): string {
  const headers: string[] = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: ${input.html ? "text/html" : "text/plain"}; charset=UTF-8`,
    "Content-Transfer-Encoding: 7bit",
  ];

  if (input.cc && input.cc.length > 0) {
    headers.splice(1, 0, `Cc: ${input.cc.join(", ")}`);
  }
  if (input.bcc && input.bcc.length > 0) {
    headers.splice(1, 0, `Bcc: ${input.bcc.join(", ")}`);
  }

  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

export async function sendEmail(rawInput: unknown): Promise<SendEmailOutput> {
  const input = SendEmailInput.parse(rawInput);
  const raw = base64UrlEncode(buildRfc2822Message(input));

  return withRateLimit(GMAIL_PROVIDER_KEY, input.tenantId, async () => {
    const response = await nangoCall<SendRawResponse>({
      tenantId: input.tenantId,
      provider: GMAIL_PROVIDER_KEY,
      method: "POST",
      endpoint: "/gmail/v1/users/me/messages/send",
      data: { raw },
    });

    return SendEmailOutput.parse({
      messageId: response.id,
      threadId: response.threadId,
      labelIds: response.labelIds,
    });
  });
}

export async function listMessages(rawInput: unknown): Promise<ListMessagesOutput> {
  const input = ListMessagesInput.parse(rawInput);

  const params: Record<string, string> = {
    maxResults: String(input.maxResults),
    includeSpamTrash: String(input.includeSpamTrash),
  };
  if (input.query) params.q = input.query;
  if (input.pageToken) params.pageToken = input.pageToken;
  if (input.labelIds && input.labelIds.length > 0) {
    params.labelIds = input.labelIds.join(",");
  }

  return withRateLimit(GMAIL_PROVIDER_KEY, input.tenantId, async () => {
    const response = await nangoCall<ListResponse>({
      tenantId: input.tenantId,
      provider: GMAIL_PROVIDER_KEY,
      method: "GET",
      endpoint: "/gmail/v1/users/me/messages",
      params,
    });

    return ListMessagesOutput.parse({
      messages: response.messages ?? [],
      resultSizeEstimate: response.resultSizeEstimate ?? 0,
      nextPageToken: response.nextPageToken,
    });
  });
}
