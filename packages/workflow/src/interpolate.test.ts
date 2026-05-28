import { describe, expect, it } from "vitest";

import { interpolate, interpolateString } from "./interpolate";

describe("interpolate", () => {
  it("replaces {{expr}} in strings", () => {
    expect(interpolateString("Hello {{state.user.name}}!", { user: { name: "Ada" } })).toBe(
      "Hello Ada!",
    );
  });

  it("returns the raw value if string is a single template", () => {
    expect(interpolateString("{{state.count}}", { count: 5 })).toBe(5);
    expect(interpolateString("{{state.user}}", { user: { name: "Ada" } })).toEqual({ name: "Ada" });
  });

  it("walks objects and arrays", () => {
    const out = interpolate(
      {
        url: "https://api/{{state.path}}",
        list: ["{{state.first}}", "static"],
        nested: { count: "{{state.count}}" },
      },
      { path: "users", first: "a", count: 3 },
    );
    expect(out).toEqual({
      url: "https://api/users",
      list: ["a", "static"],
      nested: { count: 3 },
    });
  });

  it("leaves non-template strings alone", () => {
    expect(interpolateString("plain text", {})).toBe("plain text");
  });

  it("renders null/undefined as empty in mixed templates", () => {
    expect(interpolateString("a={{state.missing}}", {})).toBe("a=");
  });
});
