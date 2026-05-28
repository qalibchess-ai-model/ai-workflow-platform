import { EventSchemas, Inngest } from "inngest";
import {
  EVENT_WORKFLOW_EXECUTE_REQUESTED,
  type WorkflowExecuteRequested,
} from "@workflow/workflow";

type Events = {
  [EVENT_WORKFLOW_EXECUTE_REQUESTED]: { data: WorkflowExecuteRequested };
};

export const inngest = new Inngest({
  id: "ai-workflow-platform",
  schemas: new EventSchemas().fromRecord<Events>(),
});
