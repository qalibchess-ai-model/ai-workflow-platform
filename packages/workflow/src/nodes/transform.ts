import { z } from "zod";

import { ExpressionError, evaluate } from "../expr";
import type { NodeHandler } from "./registry";

const inputSchema = z
  .object({
    mapping: z.record(z.string()).optional(),
    arrayMap: z
      .object({
        source: z.string().min(1),
        expression: z.string().min(1),
      })
      .optional(),
    arrayFilter: z
      .object({
        source: z.string().min(1),
        expression: z.string().min(1),
      })
      .optional(),
  })
  .refine(
    (val) =>
      val.mapping !== undefined || val.arrayMap !== undefined || val.arrayFilter !== undefined,
    { message: "transform requires at least one of: mapping, arrayMap, arrayFilter" },
  );

const outputSchema = z.record(z.unknown());

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

function evalSafe(expression: string, scope: Record<string, unknown>): unknown {
  try {
    return evaluate(expression, scope);
  } catch (err) {
    if (err instanceof ExpressionError) {
      throw new Error(`Transform expression failed: ${err.message}`);
    }
    throw err;
  }
}

export const transformHandler: NodeHandler<Input, Output> = {
  type: "transform",
  inputSchema,
  outputSchema,
  execute: async (input, ctx) => {
    const out: Record<string, unknown> = {};

    if (input.mapping) {
      for (const [key, expression] of Object.entries(input.mapping)) {
        out[key] = evalSafe(expression, { state: ctx.state });
      }
    }

    if (input.arrayMap) {
      const sourceValue = evalSafe(input.arrayMap.source, { state: ctx.state });
      if (!Array.isArray(sourceValue)) {
        throw new Error(`arrayMap.source did not resolve to an array: ${input.arrayMap.source}`);
      }
      out.mapped = sourceValue.map((item) =>
        evalSafe(input.arrayMap!.expression, { state: ctx.state, item }),
      );
    }

    if (input.arrayFilter) {
      const sourceValue = evalSafe(input.arrayFilter.source, { state: ctx.state });
      if (!Array.isArray(sourceValue)) {
        throw new Error(
          `arrayFilter.source did not resolve to an array: ${input.arrayFilter.source}`,
        );
      }
      out.filtered = sourceValue.filter((item) =>
        Boolean(evalSafe(input.arrayFilter!.expression, { state: ctx.state, item })),
      );
    }

    return out;
  },
};
