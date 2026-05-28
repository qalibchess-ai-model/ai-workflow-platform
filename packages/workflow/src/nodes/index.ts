import { conditionHandler } from "./condition";
import { delayHandler } from "./delay";
import { httpRequestHandler } from "./http-request";
import { noopHandler } from "./noop";
import { transformHandler } from "./transform";
import { hasHandler, registerNode } from "./registry";
import type { NodeHandler } from "./registry";

const builtins: NodeHandler[] = [
  noopHandler as NodeHandler,
  httpRequestHandler as NodeHandler,
  delayHandler as NodeHandler,
  conditionHandler as NodeHandler,
  transformHandler as NodeHandler,
];

export function registerBuiltinNodes(): void {
  for (const handler of builtins) {
    if (!hasHandler(handler.type)) {
      registerNode(handler);
    }
  }
}

export const DELAY_NODE_TYPE = delayHandler.type;
export const CONDITION_NODE_TYPE = conditionHandler.type;

export { noopHandler, httpRequestHandler, delayHandler, conditionHandler, transformHandler };
export * from "./registry";
