import type { ZodTypeAny } from "zod";

import { noopAction } from "./actions";
import { NoopActionInput, NoopActionOutput } from "./schemas";

export type NodeDefinition = {
  type: string;
  category: string;
  label: string;
  description: string;
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
  handler: (input: unknown) => Promise<unknown>;
};

export const noopNodes: NodeDefinition[] = [
  {
    type: "noop.echo",
    category: "Testing",
    label: "Echo Message",
    description: "Returns the input message after an optional delay",
    inputSchema: NoopActionInput,
    outputSchema: NoopActionOutput,
    handler: noopAction,
  },
];
