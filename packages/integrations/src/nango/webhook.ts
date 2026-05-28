import crypto from "node:crypto";

import { IntegrationConfigError, WebhookSignatureError } from "../errors";
import type { NangoWebhookEvent } from "./types";

function getWebhookSecret(secret: string | undefined): string {
  const value = secret ?? process.env.NANGO_WEBHOOK_SECRET;
  if (!value) {
    throw new IntegrationConfigError(
      "NANGO_WEBHOOK_SECRET is required to verify webhook signatures",
    );
  }
  return value;
}

export function verifyNangoSignature(
  body: string,
  signature: string | null,
  secret?: string,
): boolean {
  if (!signature) return false;

  const resolvedSecret = getWebhookSecret(secret);
  const expected = crypto
    .createHmac("sha256", resolvedSecret)
    .update(body)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function parseNangoWebhook(body: string): NangoWebhookEvent {
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object") {
    throw new WebhookSignatureError("Webhook body is not an object");
  }
  return parsed as NangoWebhookEvent;
}
