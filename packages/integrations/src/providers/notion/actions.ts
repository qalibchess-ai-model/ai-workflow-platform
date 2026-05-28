import { IntegrationError } from "../../errors";
import { withRateLimit } from "../../rate-limit";
import {
  CreatePageInput,
  CreatePageOutput,
  NOTION_PROVIDER_KEY,
  QueryDatabaseInput,
  QueryDatabaseOutput,
} from "./schemas";

const DEFAULT_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function apiBase(): string {
  return process.env.NOTION_API_BASE ?? DEFAULT_API_BASE;
}

/**
 * Notion integration tokens can appear in error messages from fetch or the
 * server. Strip them before propagating any text to user-visible fields.
 */
function redactKey(text: string, apiKey: string): string {
  if (!apiKey) return text;
  return text.split(apiKey).join("***");
}

async function callNotionApi<T>(
  apiKey: string,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${apiBase()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new IntegrationError(`Notion request failed: ${redactKey(message, apiKey)}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new IntegrationError(`Notion returned non-JSON response (status ${response.status})`);
  }

  if (!response.ok) {
    const desc =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `HTTP ${response.status}`;
    throw new IntegrationError(`Notion API error: ${redactKey(desc, apiKey)}`);
  }

  return payload as T;
}

function buildParagraphBlock(text: string): Record<string, unknown> {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: text },
        },
      ],
    },
  };
}

type CreatePageResponse = {
  id?: unknown;
  url?: unknown;
};

export async function createPage(rawInput: unknown, apiKey: string): Promise<CreatePageOutput> {
  const input = CreatePageInput.parse(rawInput);

  return withRateLimit(NOTION_PROVIDER_KEY, input.tenantId, async () => {
    const body: Record<string, unknown> = {
      parent: { database_id: input.databaseId },
      properties: input.properties,
    };
    if (input.content) {
      body.children = [buildParagraphBlock(input.content)];
    }

    const response = await callNotionApi<CreatePageResponse>(apiKey, "POST", "/pages", body);
    if (typeof response.id !== "string" || response.id.length === 0) {
      throw new IntegrationError("Notion response missing page id");
    }
    const pageId = response.id;
    const fallbackUrl = `https://www.notion.so/${pageId.replace(/-/g, "")}`;
    const url = typeof response.url === "string" ? response.url : fallbackUrl;

    return CreatePageOutput.parse({
      pageId,
      url,
      ok: true,
    });
  });
}

type QueryDatabaseResponse = {
  results?: unknown;
  next_cursor?: unknown;
  has_more?: unknown;
};

export async function queryDatabase(
  rawInput: unknown,
  apiKey: string,
): Promise<QueryDatabaseOutput> {
  const input = QueryDatabaseInput.parse(rawInput);

  return withRateLimit(NOTION_PROVIDER_KEY, input.tenantId, async () => {
    const body: Record<string, unknown> = {};
    if (input.filter) body.filter = input.filter;
    if (input.pageSize) body.page_size = input.pageSize;
    if (input.startCursor) body.start_cursor = input.startCursor;

    const response = await callNotionApi<QueryDatabaseResponse>(
      apiKey,
      "POST",
      `/databases/${input.databaseId}/query`,
      body,
    );

    if (!Array.isArray(response.results)) {
      throw new IntegrationError("Notion response missing results array");
    }

    const results = response.results.map((raw) => {
      const page = raw as { id?: unknown; url?: unknown; properties?: unknown };
      if (typeof page.id !== "string") {
        throw new IntegrationError("Notion query result missing page id");
      }
      return {
        id: page.id,
        url: typeof page.url === "string" ? page.url : undefined,
        properties:
          typeof page.properties === "object" && page.properties !== null
            ? (page.properties as Record<string, unknown>)
            : undefined,
      };
    });

    return QueryDatabaseOutput.parse({
      results,
      nextCursor: typeof response.next_cursor === "string" ? response.next_cursor : null,
      hasMore: response.has_more === true,
    });
  });
}
