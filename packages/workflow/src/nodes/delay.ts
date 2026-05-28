import { z } from "zod";

import type { NodeHandler } from "./registry";

const inputSchema = z.object({
  durationMs: z
    .number()
    .int()
    .positive()
    .max(7 * 24 * 60 * 60 * 1000),
});

const outputSchema = z.object({
  delayed: z.literal(true),
  durationMs: z.number().int().positive(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

export const delayHandler: NodeHandler<Input, Output> = {
  type: "delay",
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    ctx.logger.info({
      msg: "delay node executing (fallback path — no step.sleep)",
      nodeId: ctx.nodeId,
      durationMs: input.durationMs,
    });
    await new Promise((resolve) => setTimeout(resolve, input.durationMs));
    return { delayed: true, durationMs: input.durationMs };
  },
};
