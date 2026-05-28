import { z } from "zod";

import type { NodeHandler } from "./registry";

const inputSchema = z.object({
  message: z.string().optional(),
});

const outputSchema = z.object({
  executed: z.literal(true),
  message: z.string().optional(),
});

export const noopHandler: NodeHandler<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  type: "noop",
  inputSchema,
  outputSchema,
  execute: async (input) => ({
    executed: true,
    ...(input.message !== undefined ? { message: input.message } : {}),
  }),
};
