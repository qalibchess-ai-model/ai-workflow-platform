import { z } from "zod";

export const NoopActionInput = z.object({
  message: z.string().min(1),
  delay: z.number().int().nonnegative().optional(),
});

export const NoopActionOutput = z.object({
  echoed: z.string(),
  timestamp: z.string(),
});

export type NoopActionInput = z.infer<typeof NoopActionInput>;
export type NoopActionOutput = z.infer<typeof NoopActionOutput>;
