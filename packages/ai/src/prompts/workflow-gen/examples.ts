import type { WorkflowDefinition } from "@workflow/workflow";

export type FewShotExample = {
  user: string;
  workflow: WorkflowDefinition;
};

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    user: "Manual olaraq başladılan sadə noop workflow",
    workflow: {
      name: "Manual noop",
      trigger: { type: "manual" },
      nodes: [{ id: "noop-1", type: "noop", params: {} }],
      edges: [],
    },
  },
  {
    user: "Hər gün saat 9-da HTTP endpoint-i yoxla",
    workflow: {
      name: "Daily health check",
      trigger: { type: "schedule", cron: "0 9 * * *" },
      nodes: [
        {
          id: "fetch-status",
          type: "http.request",
          params: { url: "https://example.com/health", method: "GET" },
        },
      ],
      edges: [],
    },
  },
];
