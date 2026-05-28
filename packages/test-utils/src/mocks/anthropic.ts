import { vi } from "vitest";

export interface MockAnthropicResponse {
  content: Array<{
    type: "tool_use";
    id: string;
    name: string;
    input: unknown;
  }>;
  stop_reason: "tool_use";
  usage: { input_tokens: number; output_tokens: number };
}

export function mockAnthropicResponse(workflow: unknown): MockAnthropicResponse {
  return {
    content: [
      {
        type: "tool_use",
        id: "mock",
        name: "create_workflow",
        input: workflow,
      },
    ],
    stop_reason: "tool_use",
    usage: { input_tokens: 100, output_tokens: 200 },
  };
}

export const mockAnthropicClient = {
  messages: {
    create: vi.fn(),
  },
};

export function resetAnthropicMock(): void {
  mockAnthropicClient.messages.create.mockReset();
}
