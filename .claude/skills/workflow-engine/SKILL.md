---
name: workflow-engine
description: Use this skill whenever the user is working on Inngest functions, workflow execution logic, retry strategies, state management, durable workflows, or anything related to the backend execution engine. Triggers include creating new workflow types, debugging failed runs, implementing step functions, handling timeouts, or designing workflow state transitions. This skill is critical and should be used proactively for any backend work in apps/worker/ or packages/workflow/.
---

# Workflow Engine Skill

Inngest əsaslı workflow execution sistemini quranda istifadə et.

## Əsas prinsiplər

1. **Hər addım idempotent olmalıdır** — eyni input həmişə eyni nəticə verməlidir
2. **State Inngest-də saxlanılır** — application memory-də saxlama
3. **Side effect-lər `step.run()` daxilində olmalıdır** — retry-lar üçün
4. **Long-running tasks `step.sleep()` istifadə et** — process bağlanmasın

## Inngest function şablonu

```typescript
import { inngest } from "@/lib/inngest";
import { z } from "zod";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 3,
    concurrency: { limit: 10, key: "event.data.tenantId" },
  },
  { event: "workflow/execute.requested" },
  async ({ event, step, logger }) => {
    // 1. Validate input (HƏMİŞƏ)
    const input = z.object({
      workflowId: z.string().uuid(),
      tenantId: z.string().uuid(),
      triggerData: z.record(z.unknown()),
    }).parse(event.data);

    // 2. Load workflow definition (idempotent)
    const workflow = await step.run("load-workflow", async () => {
      return await db.workflows.findById(input.workflowId);
    });

    // 3. Execute nodes ardıcıllıqla
    let state: Record<string, unknown> = { trigger: input.triggerData };

    for (const node of workflow.nodes) {
      state = await step.run(`node-${node.id}`, async () => {
        return await executeNode(node, state);
      });
    }

    return { success: true, finalState: state };
  }
);
```

## Vacib qaydalar

### DO
- Hər `step.run()` üçün unikal ID istifadə et
- Long timeout-lar üçün `step.sleep()` istifadə et (saatlar/günlər)
- Tenant izolyasiyası üçün `concurrency.key` istifadə et
- Hər function üçün retry strategy aydın təyin et
- Logger-də structured data göndər (`logger.info({ ... })`)

### DON'T
- `step.run()` xaricində side effect etmə (database write, API call)
- Random ID-lər `step.run()` ID-si kimi istifadə etmə (idempotent olmur)
- `setTimeout/setInterval` istifadə etmə — `step.sleep()` istifadə et
- Bütün workflow-u bir step-də icra etmə — addımlara böl

## Error handling

```typescript
// Recoverable error - Inngest avtomatik retry edir
throw new Error("Temporary API failure");

// Non-recoverable error - retry-i dayandır
import { NonRetriableError } from "inngest";
throw new NonRetriableError("Invalid workflow definition");
```

## Tenant izolyasiyası

Hər workflow run-da `tenantId` event data-ya daxil olmalıdır. Database query-lərində RLS aktiv olduğundan əmin ol:

```typescript
await db.execute(sql`SET app.current_tenant_id = ${tenantId}`);
```

## Node execution pattern

Hər node tipinin öz handler-i var (`packages/workflow/src/nodes/`):

```typescript
type NodeHandler = (
  node: WorkflowNode,
  state: WorkflowState,
  ctx: ExecutionContext
) => Promise<WorkflowState>;

const handlers: Record<NodeType, NodeHandler> = {
  "ai.generate": handleAIGenerate,
  "http.request": handleHttpRequest,
  "gmail.send": handleGmailSend,
  // ...
};
```

Yeni node tipi əlavə etdikdə:
1. `packages/workflow/src/nodes/<type>.ts` faylı yarat
2. Zod schema ilə input/output validate et
3. `packages/workflow/src/nodes/index.ts`-də qeydiyyatdan keçir
4. Unit test yaz (`<type>.test.ts`)
5. `docs/workflow-schema.md`-də sənədləşdir

## Debugging

Inngest Dev Server: `npx inngest-cli dev` (port 8288)

Hər run-ı UI-da gör — bütün step-lər, retry-lar, state dəyişiklikləri vizual göstərilir.
