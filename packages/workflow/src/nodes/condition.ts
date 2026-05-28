import { z } from "zod";

import { ExpressionError, evaluate } from "../expr";
import type { NodeHandler } from "./registry";

const inputSchema = z.object({
  expression: z.string().min(1),
  skipWhenFalse: z.array(z.string()).optional(),
  skipWhenTrue: z.array(z.string()).optional(),
});

const outputSchema = z.object({
  result: z.boolean(),
  skip: z.array(z.string()),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

export const conditionHandler: NodeHandler<Input, Output> = {
  type: "condition",
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    let raw: unknown;
    try {
      raw = evaluate(input.expression, { state: ctx.state });
    } catch (err) {
      if (err instanceof ExpressionError) {
        throw new Error(`Condition expression failed: ${err.message}`);
      }
      throw err;
    }
    const result = Boolean(raw);
    const skip = result ? (input.skipWhenTrue ?? []) : (input.skipWhenFalse ?? []);

    ctx.logger.info({
      msg: "condition evaluated",
      nodeId: ctx.nodeId,
      expression: input.expression,
      result,
      skip,
    });

    return { result, skip };
  },
};
