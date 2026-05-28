import { describe, expect, it, vi } from "vitest";

import { registerBuiltinNodes } from "@workflow/workflow";

registerBuiltinNodes();

vi.mock("../client", () => ({
  MODELS: {
    sonnet: "claude-sonnet-4-6",
    haiku: "claude-haiku-4-5-20251001",
    opus: "claude-opus-4-7",
  },
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "create_workflow",
            input: {
              name: "Test Workflow",
              trigger: { type: "manual" },
              nodes: [{ id: "noop-1", type: "noop", params: {} }],
              edges: [],
            },
          },
        ],
      }),
    },
  },
}));

vi.mock("../observability", () => ({
  observe:
    (_name: string) =>
    <F>(fn: F): F =>
      fn,
  langfuse: { trace: vi.fn(), flushAsync: vi.fn().mockResolvedValue(undefined) },
}));

import { generateWorkflow, WorkflowGenerationError } from "./workflow";

describe("generateWorkflow", () => {
  it("returns a validated workflow from a mocked tool_use response", async () => {
    const result = await generateWorkflow({ userPrompt: "Test" });

    expect(result.name).toBe("Test Workflow");
    expect(result.nodes).toHaveLength(1);
    expect(result.trigger.type).toBe("manual");
  });

  it("throws WorkflowGenerationError if model returns no tool_use block", async () => {
    const { anthropic } = await import("../client");
    vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
      content: [{ type: "text", text: "no tool call here" }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(generateWorkflow({ userPrompt: "x" })).rejects.toThrow(WorkflowGenerationError);
  });

  it("throws WorkflowGenerationError when validation fails", async () => {
    const { anthropic } = await import("../client");
    vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_2",
          name: "create_workflow",
          input: {
            name: "Bad",
            trigger: { type: "manual" },
            nodes: [{ id: "x", type: "unknown-node", params: {} }],
            edges: [],
          },
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(generateWorkflow({ userPrompt: "bad" })).rejects.toThrow(/UNKNOWN_NODE_TYPE/);
  });
});
