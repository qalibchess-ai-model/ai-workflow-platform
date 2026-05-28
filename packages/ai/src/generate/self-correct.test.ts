import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerBuiltinNodes } from "@workflow/workflow";

registerBuiltinNodes();

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("../client", () => ({
  MODELS: {
    sonnet: "claude-sonnet-4-6",
    haiku: "claude-haiku-4-5-20251001",
    opus: "claude-opus-4-7",
  },
  anthropic: {
    messages: { create: createMock },
  },
}));

vi.mock("../observability", () => ({
  observe:
    (_name: string) =>
    <F>(fn: F): F =>
      fn,
  langfuse: { trace: vi.fn(), flushAsync: vi.fn().mockResolvedValue(undefined) },
}));

import { generateWorkflowWithCorrection, WorkflowSelfCorrectError } from "./self-correct";

const validWorkflow = {
  name: "Valid",
  trigger: { type: "manual" },
  nodes: [{ id: "n1", type: "noop", params: {} }],
  edges: [],
};

const invalidWorkflow = {
  name: "Invalid",
  trigger: { type: "manual" },
  nodes: [{ id: "n1", type: "ghost-node", params: {} }],
  edges: [],
};

function toolUseResponse(input: unknown, id = "toolu_x") {
  return {
    content: [{ type: "tool_use", id, name: "create_workflow", input }],
  };
}

beforeEach(() => {
  createMock.mockReset();
});

describe("generateWorkflowWithCorrection", () => {
  it("returns workflow on first successful attempt", async () => {
    createMock.mockResolvedValueOnce(toolUseResponse(validWorkflow));

    const result = await generateWorkflowWithCorrection({ userPrompt: "Test" });

    expect(result.attempts).toBe(1);
    expect(result.workflow.name).toBe("Valid");
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("retries after validation failure and succeeds on second attempt", async () => {
    createMock
      .mockResolvedValueOnce(toolUseResponse(invalidWorkflow, "toolu_1"))
      .mockResolvedValueOnce(toolUseResponse(validWorkflow, "toolu_2"));

    const result = await generateWorkflowWithCorrection({ userPrompt: "Test" });

    expect(result.attempts).toBe(2);
    expect(result.workflow.name).toBe("Valid");
    expect(createMock).toHaveBeenCalledTimes(2);

    const secondCall = createMock.mock.calls[1]?.[0];
    expect(secondCall?.messages).toHaveLength(3);
    expect(secondCall?.messages[1]?.role).toBe("assistant");
    expect(secondCall?.messages[2]?.role).toBe("user");
    const toolResultBlock = secondCall?.messages[2]?.content[0];
    expect(toolResultBlock?.type).toBe("tool_result");
    expect(toolResultBlock?.is_error).toBe(true);
    expect(toolResultBlock?.tool_use_id).toBe("toolu_1");
  });

  it("throws after maxAttempts when validation never passes", async () => {
    createMock.mockResolvedValue(toolUseResponse(invalidWorkflow, "toolu_x"));

    await expect(
      generateWorkflowWithCorrection({ userPrompt: "Test", maxAttempts: 3 }),
    ).rejects.toThrow(WorkflowSelfCorrectError);

    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("respects custom maxAttempts", async () => {
    createMock.mockResolvedValue(toolUseResponse(invalidWorkflow));

    await expect(
      generateWorkflowWithCorrection({ userPrompt: "Test", maxAttempts: 2 }),
    ).rejects.toThrow(WorkflowSelfCorrectError);

    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("fails fast when the model does not call the tool", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "Salam" }],
    });

    await expect(generateWorkflowWithCorrection({ userPrompt: "Test" })).rejects.toThrow(
      /NO_TOOL_USE/,
    );

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("sends prompt-cached system blocks", async () => {
    createMock.mockResolvedValueOnce(toolUseResponse(validWorkflow));

    await generateWorkflowWithCorrection({ userPrompt: "Test" });

    const args = createMock.mock.calls[0]?.[0];
    const system = args?.system;
    expect(Array.isArray(system)).toBe(true);
    const cached = system?.find(
      (block: { cache_control?: { type: string } }) => block.cache_control?.type === "ephemeral",
    );
    expect(cached).toBeDefined();
  });
});
