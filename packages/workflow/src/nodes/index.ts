import { noopHandler } from "./noop";
import { hasHandler, registerNode } from "./registry";

export function registerBuiltinNodes(): void {
  if (!hasHandler(noopHandler.type)) {
    registerNode(noopHandler);
  }
}

export { noopHandler };
export * from "./registry";
