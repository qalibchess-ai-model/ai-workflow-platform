import { evaluate, ExpressionError } from "./expr";
import type { WorkflowState } from "./types";

const TEMPLATE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

export function interpolateString(input: string, state: WorkflowState): unknown {
  const match = input.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (match && match[1] !== undefined) {
    return evaluate(match[1], { state });
  }
  return input.replace(TEMPLATE_RE, (_, expr: string) => {
    const value = evaluate(expr, { state });
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}

export function interpolate<T>(value: T, state: WorkflowState): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return interpolateString(value, state) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, state)) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolate(v, state);
    }
    return out as T;
  }
  return value;
}

export { ExpressionError };
