import "server-only";

import { EventSchemas, Inngest } from "inngest";
import type {
  EVENT_WORKFLOW_EXECUTE_REQUESTED,
  WorkflowExecuteRequested,
} from "@workflow/workflow";

type Events = {
  [EVENT_WORKFLOW_EXECUTE_REQUESTED]: { data: WorkflowExecuteRequested };
};

export const inngest = new Inngest({
  id: "ai-workflow-platform",
  schemas: new EventSchemas().fromRecord<Events>(),
});
