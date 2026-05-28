import { z } from "zod";

export const HUBSPOT_PROVIDER_KEY = "hubspot";

/**
 * Additional contact/deal property bag forwarded verbatim to the HubSpot
 * `properties` object. Keys must be valid HubSpot property names; values are
 * coerced to strings by HubSpot itself, so we accept the common scalar types.
 */
const PropertyBag = z.record(z.string().min(1), z.union([z.string(), z.number(), z.boolean()]));

export const CreateContactInput = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  properties: PropertyBag.optional(),
});

export const CreateContactOutput = z.object({
  contactId: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().min(1),
});

export const CreateDealInput = z.object({
  tenantId: z.string().min(1),
  dealName: z.string().min(1).max(255),
  amount: z.number().nonnegative().optional(),
  stage: z.string().min(1).max(255).optional(),
});

export const CreateDealOutput = z.object({
  dealId: z.string().min(1),
  dealName: z.string().min(1),
  createdAt: z.string().min(1),
});

export type CreateContactInput = z.infer<typeof CreateContactInput>;
export type CreateContactOutput = z.infer<typeof CreateContactOutput>;
export type CreateDealInput = z.infer<typeof CreateDealInput>;
export type CreateDealOutput = z.infer<typeof CreateDealOutput>;
