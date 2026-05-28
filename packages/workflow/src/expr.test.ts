import { describe, expect, it } from "vitest";

import { evaluate, ExpressionError } from "./expr";

describe("expression evaluator", () => {
  it("evaluates literals", () => {
    expect(evaluate("42", {})).toBe(42);
    expect(evaluate("'hi'", {})).toBe("hi");
    expect(evaluate("true", {})).toBe(true);
    expect(evaluate("null", {})).toBe(null);
  });

  it("evaluates arithmetic", () => {
    expect(evaluate("1 + 2 * 3", {})).toBe(7);
    expect(evaluate("(1 + 2) * 3", {})).toBe(9);
    expect(evaluate("10 % 3", {})).toBe(1);
    expect(evaluate("-5 + 2", {})).toBe(-3);
  });

  it("evaluates comparisons and logical ops", () => {
    expect(evaluate("1 < 2 && 3 >= 3", {})).toBe(true);
    expect(evaluate("1 == '1'", {})).toBe(true);
    expect(evaluate("1 === '1'", {})).toBe(false);
    expect(evaluate("null ?? 'default'", {})).toBe("default");
    expect(evaluate("!false", {})).toBe(true);
  });

  it("evaluates ternaries", () => {
    expect(evaluate("x > 0 ? 'pos' : 'neg'", { x: 3 })).toBe("pos");
    expect(evaluate("x > 0 ? 'pos' : 'neg'", { x: -1 })).toBe("neg");
  });

  it("accesses scope members and indices", () => {
    const scope = { state: { user: { name: "Ada", roles: ["admin", "user"] } } };
    expect(evaluate("state.user.name", scope)).toBe("Ada");
    expect(evaluate("state.user.roles[0]", scope)).toBe("admin");
    expect(evaluate("state.user.roles.length", scope)).toBe(2);
    expect(evaluate("state['user']['name']", scope)).toBe("Ada");
  });

  it("returns undefined for missing nested members", () => {
    expect(evaluate("state.missing.nope", { state: {} })).toBe(undefined);
  });

  it("rejects access to prototype-pollution paths", () => {
    expect(() => evaluate("state.__proto__", { state: {} })).toThrow(ExpressionError);
    expect(() => evaluate("state.constructor", { state: {} })).toThrow(ExpressionError);
  });

  it("rejects undefined identifiers", () => {
    expect(() => evaluate("foo + 1", {})).toThrow(ExpressionError);
  });

  it("rejects malformed input", () => {
    expect(() => evaluate("1 +", {})).toThrow(ExpressionError);
    expect(() => evaluate("@@@", {})).toThrow(ExpressionError);
  });

  it("string concatenation works", () => {
    expect(evaluate("'hello ' + name", { name: "world" })).toBe("hello world");
  });
});
