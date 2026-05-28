# Terminal B — Workflow Engine Init

## Sənin rolun
Sən Senior Backend Engineer-sən, distributed systems təcrübən var. Inngest əsaslı workflow engine qurursan. Etibarlılıq və idempotency hər şeydən vacibdir — bir step iki dəfə icra olunsa belə, nəticə eyni olmalıdır.

## Tapşırıq
`apps/worker/` və `packages/workflow/` daxilində workflow execution infrastructure-i qur. Real node-lar deyil — engine-in skeleti və ilk "noop" handler-i.

## Əvvəlcə oxu
1. `@CLAUDE.md`
2. `@.claude/skills/workflow-engine/SKILL.md` (TAM oxu)

## Konkret addımlar

### 1. Dependencies

`apps/worker/`:
```bash
cd apps/worker
pnpm add hono @hono/node-server inngest
pnpm add -D @types/node tsx
```

`packages/workflow/`:
```bash
cd packages/workflow
pnpm add zod inngest
```

`packages/db/`:
```bash
cd packages/db
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### 2. Database schema (`packages/db/`)

`src/schema.ts`:
```typescript
import { pgTable, uuid, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const runStatusEnum = pgEnum("run_status", [
  "pending", "running", "completed", "failed", "cancelled"
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  definition: jsonb("definition").notNull(),  // {nodes, edges, trigger}
  version: text("version").notNull().default("1"),
  createdBy: text("created_by").notNull(),    // Clerk user ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").references(() => workflows.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  status: runStatusEnum("status").notNull().default("pending"),
  triggerData: jsonb("trigger_data"),
  output: jsonb("output"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stepLogs = pgTable("step_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => runs.id).notNull(),
  nodeId: text("node_id").notNull(),
  status: runStatusEnum("status").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  error: text("error"),
  durationMs: text("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Migration generate et:
```bash
pnpm drizzle-kit generate
```

### 3. Workflow types (`packages/workflow/src/types.ts`)

```typescript
import { z } from "zod";

export const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  params: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const EdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  condition: z.string().optional(),  // JavaScript expression
});

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("schedule"), cron: z.string() }),
  z.object({ type: z.literal("webhook"), path: z.string() }),
]);

export const WorkflowDefinitionSchema = z.object({
  name: z.string(),
  trigger: TriggerSchema,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof NodeSchema>;
```

### 4. Node handler registry (`packages/workflow/src/nodes/`)

`registry.ts`:
```typescript
import { z } from "zod";

export type NodeHandler<TInput = unknown, TOutput = unknown> = {
  type: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  execute: (input: TInput, ctx: ExecutionContext) => Promise<TOutput>;
};

const registry = new Map<string, NodeHandler>();

export function registerNode(handler: NodeHandler) {
  if (registry.has(handler.type)) {
    throw new Error(`Node type already registered: ${handler.type}`);
  }
  registry.set(handler.type, handler);
}

export function getHandler(type: string): NodeHandler {
  const handler = registry.get(type);
  if (!handler) throw new Error(`Unknown node type: ${type}`);
  return handler;
}

export function listHandlers(): NodeHandler[] {
  return Array.from(registry.values());
}
```

İlk handler: `nodes/noop.ts` (test üçün):
```typescript
export const noopHandler: NodeHandler = {
  type: "noop",
  inputSchema: z.object({ message: z.string().optional() }),
  outputSchema: z.object({ executed: z.boolean() }),
  execute: async (input) => ({ executed: true }),
};
```

### 5. Inngest function (`apps/worker/src/functions/execute.ts`)

`SKILL.md`-də göstərilən şablona əməl et. Əsas function:

```typescript
import { inngest } from "../lib/inngest";
import { WorkflowDefinitionSchema } from "@/packages/workflow";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 3,
    concurrency: { limit: 10, key: "event.data.tenantId" },
  },
  { event: "workflow/execute.requested" },
  async ({ event, step, logger }) => {
    // SKILL.md-dəki şablona uyğun implementation
  }
);
```

### 6. Hono server (`apps/worker/src/index.ts`)

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serve as inngestServe } from "inngest/hono";
import { inngest } from "./lib/inngest";
import { executeWorkflow } from "./functions/execute";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.on(
  ["GET", "POST", "PUT"],
  "/api/inngest",
  inngestServe({ client: inngest, functions: [executeWorkflow] })
);

serve({ fetch: app.fetch, port: 8787 });
```

### 7. Workflow validation (`packages/workflow/src/validate.ts`)

- Circular dependency check
- Bütün edge endpoint-ləri mövcud node-lara işarə edir
- Bütün node type-lar registered-dir
- Trigger valid-dir

### 8. Test setup

`vitest.config.ts` yarat, ilk test:

```typescript
// packages/workflow/src/validate.test.ts
import { describe, it, expect } from "vitest";
import { validateWorkflow } from "./validate";

describe("validateWorkflow", () => {
  it("rejects circular dependencies", () => {
    expect(() => validateWorkflow({ /* circular */ })).toThrow();
  });
});
```

## Test edək

- [ ] `pnpm db:generate` migration yaradır
- [ ] `cd apps/worker && pnpm dev` server işə düşür port 8787-də
- [ ] `npx inngest-cli dev` ilə Inngest dev server qoş
- [ ] Test event göndər: `inngest.send({ name: "workflow/execute.requested", data: { ... } })`
- [ ] Workflow execute olur, run status DB-də güncəllənir
- [ ] `pnpm test` keçir
- [ ] `pnpm typecheck` keçir

## Etmə (DO NOT)
- Real node-ları indi qur (Gmail, Slack, ...) — Terminal D işləyir
- AI generation logic yazma — Terminal C işləyir
- UI complete et — Terminal A işləyir
- Production-grade RBAC implementasiya etmə — Clerk verir o-nu
- Database connection pooling üçün PgBouncer əlavə etmə — Neon edir bunu

## Yekun
Bitəndə git commit, sonra `b1-execution-engine.md` prompt-una keç.
