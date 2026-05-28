import { z } from "zod";

import type { NodeHandler } from "./registry";

const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);

const inputSchema = z.object({
  url: z.string().url(),
  method: HttpMethodSchema.default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  timeoutMs: z.number().int().positive().max(60_000).default(30_000),
  expectJson: z.boolean().default(true),
});

const outputSchema = z.object({
  status: z.number(),
  ok: z.boolean(),
  headers: z.record(z.string()),
  body: z.unknown(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

function buildUrl(base: string, query: Input["query"]): string {
  if (!query || Object.keys(query).length === 0) return base;
  const url = new URL(base);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function serializeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export const httpRequestHandler: NodeHandler<Input, Output> = {
  type: "http.request",
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    const url = buildUrl(input.url, input.query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);

    const headers: Record<string, string> = { ...(input.headers ?? {}) };
    let body: string | undefined;
    if (input.body !== undefined && input.method !== "GET" && input.method !== "HEAD") {
      if (typeof input.body === "string") {
        body = input.body;
      } else {
        body = JSON.stringify(input.body);
        if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
          headers["content-type"] = "application/json";
        }
      }
    }

    try {
      const response = await fetch(url, {
        method: input.method,
        headers,
        body,
        signal: controller.signal,
      });

      const responseHeaders = serializeHeaders(response.headers);
      const contentType = response.headers.get("content-type") ?? "";
      let parsedBody: unknown;
      if (input.expectJson && contentType.includes("application/json")) {
        parsedBody = await response.json();
      } else {
        parsedBody = await response.text();
      }

      const result: Output = {
        status: response.status,
        ok: response.ok,
        headers: responseHeaders,
        body: parsedBody,
      };

      ctx.logger.info({
        msg: "http.request completed",
        nodeId: ctx.nodeId,
        url,
        method: input.method,
        status: response.status,
      });

      return result;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`HTTP request timed out after ${input.timeoutMs}ms: ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },
};
