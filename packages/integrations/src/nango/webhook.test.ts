import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseNangoWebhook, verifyNangoSignature } from "./webhook";

const SECRET = "test-secret-1234567890";

function sign(body: string, secret: string = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyNangoSignature", () => {
  const originalSecret = process.env.NANGO_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.NANGO_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.NANGO_WEBHOOK_SECRET;
    } else {
      process.env.NANGO_WEBHOOK_SECRET = originalSecret;
    }
  });

  it("accepts a valid signature", () => {
    const body = JSON.stringify({ type: "auth", operation: "creation" });
    expect(verifyNangoSignature(body, sign(body))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ type: "auth", operation: "creation" });
    const tampered = body + "x";
    expect(verifyNangoSignature(tampered, sign(body))).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyNangoSignature("any", null)).toBe(false);
  });

  it("rejects when secret differs", () => {
    const body = JSON.stringify({ ok: true });
    expect(verifyNangoSignature(body, sign(body, "other-secret"))).toBe(false);
  });

  it("accepts an explicit secret argument", () => {
    delete process.env.NANGO_WEBHOOK_SECRET;
    const body = JSON.stringify({ ok: true });
    expect(verifyNangoSignature(body, sign(body, "explicit"), "explicit")).toBe(
      true,
    );
  });
});

describe("parseNangoWebhook", () => {
  it("parses valid JSON object", () => {
    const event = parseNangoWebhook(
      JSON.stringify({
        type: "auth",
        operation: "creation",
        connectionId: "c1",
        providerConfigKey: "gmail",
      }),
    );
    expect(event.type).toBe("auth");
  });

  it("throws on non-object payload", () => {
    expect(() => parseNangoWebhook(JSON.stringify(42))).toThrow();
  });
});
