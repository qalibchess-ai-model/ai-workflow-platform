import { describe, expect, it } from "vitest";

import {
  CREDENTIAL_PROVIDERS,
  PROVIDER_METADATA,
  getCredentialSchema,
  isKnownProvider,
  parseCredentialValue,
} from "./schemas";
import { detectRequiredCredentials } from "./detect";

describe("provider schemas", () => {
  it("exposes a schema and metadata for every known provider", () => {
    for (const p of CREDENTIAL_PROVIDERS) {
      expect(getCredentialSchema(p)).toBeDefined();
      expect(PROVIDER_METADATA[p]).toBeDefined();
      expect(PROVIDER_METADATA[p].fields.length).toBeGreaterThan(0);
    }
  });

  it("validates Notion token shape", () => {
    expect(() => parseCredentialValue("notion", { apiKey: "x" })).toThrow();
    expect(parseCredentialValue("notion", { apiKey: "secret_xxxxxxxxxxxxxxxxxxxx" })).toEqual({
      apiKey: "secret_xxxxxxxxxxxxxxxxxxxx",
    });
  });

  it("validates Telegram bot token shape", () => {
    expect(() => parseCredentialValue("telegram", { botToken: "abc" })).toThrow();
    expect(
      parseCredentialValue("telegram", { botToken: "123456789:AAFmKQrYJ-some_token_value" }),
    ).toEqual({ botToken: "123456789:AAFmKQrYJ-some_token_value" });
  });

  it("validates Slack bot token prefix", () => {
    expect(() => parseCredentialValue("slack", { botToken: "no-prefix" })).toThrow();
    expect(parseCredentialValue("slack", { botToken: "xoxb-12345" })).toBeDefined();
  });

  it("validates Supabase shape", () => {
    expect(() =>
      parseCredentialValue("supabase", { url: "not-a-url", anonKey: "a", serviceKey: "b" }),
    ).toThrow();
    expect(
      parseCredentialValue("supabase", {
        url: "https://abc.supabase.co",
        anonKey: "x".repeat(40),
        serviceKey: "y".repeat(40),
      }),
    ).toMatchObject({ url: "https://abc.supabase.co" });
  });

  it("accepts custom with optional baseUrl", () => {
    expect(parseCredentialValue("custom", { apiKey: "k" })).toEqual({ apiKey: "k" });
    expect(parseCredentialValue("custom", { apiKey: "k", baseUrl: "https://a.b" })).toEqual({
      apiKey: "k",
      baseUrl: "https://a.b",
    });
  });

  it("rejects unknown providers", () => {
    expect(isKnownProvider("nope")).toBe(false);
    expect(() => getCredentialSchema("nope")).toThrow(/Unknown credential provider/);
  });
});

describe("detectRequiredCredentials", () => {
  it("extracts providers from node-type prefixes", () => {
    const required = detectRequiredCredentials({
      name: "x",
      trigger: { type: "manual" },
      nodes: [
        { id: "a", type: "notion.create_page", params: {} },
        { id: "b", type: "slack.send_message", params: {} },
        { id: "c", type: "http.request", params: {} }, // unknown → ignored
      ],
      edges: [],
    });
    expect(required.sort()).toEqual(["notion", "slack"].sort());
  });

  it("deduplicates repeated providers", () => {
    const required = detectRequiredCredentials({
      name: "x",
      trigger: { type: "manual" },
      nodes: [
        { id: "a", type: "notion.create_page", params: {} },
        { id: "b", type: "notion.update_page", params: {} },
      ],
      edges: [],
    });
    expect(required).toEqual(["notion"]);
  });
});
