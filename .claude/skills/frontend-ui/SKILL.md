---
name: frontend-ui
description: Use this skill for any frontend work in apps/web/ — React Flow workflow editor, shadcn/ui components, Tailwind styling, Server Components vs Client Components decisions, form handling, real-time updates, or any Next.js 15 App Router work. Triggers include building UI components, integrating React Flow nodes, designing forms, implementing data fetching patterns, or styling the application. Use proactively for visual or interactive work.
---

# Frontend UI Skill

Next.js 15 + React Flow + shadcn/ui üçün konvensiyalar.

## Server vs Client Components

**Default: Server Component**. Yalnız aşağıdakı hallarda `"use client"`:

- `useState`, `useEffect`, `useRef` lazımdırsa
- Event handler-lər (`onClick`, `onChange`)
- Browser-only API (localStorage, window)
- Third-party client library-lər (React Flow!)

```typescript
// app/dashboard/page.tsx — Server Component (default)
export default async function DashboardPage() {
  const workflows = await db.workflows.findByTenant(tenantId);
  return <WorkflowList workflows={workflows} />;
}

// components/workflow-editor.tsx — Client Component (interactive)
"use client";
import { ReactFlow } from "@xyflow/react";

export function WorkflowEditor({ initialNodes }: Props) {
  // ...
}
```

## React Flow node strukturu

Hər node tipi üçün ayrı komponent:

```typescript
// components/workflow/nodes/ai-generate-node.tsx
"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type AINodeData = {
  prompt: string;
  model: "sonnet" | "haiku";
};

export function AIGenerateNode({ data, selected }: NodeProps<AINodeData>) {
  return (
    <Card className={cn(
      "min-w-[240px] shadow-md transition-all",
      selected && "ring-2 ring-primary"
    )}>
      <Handle type="target" position={Position.Top} />
      <CardHeader className="p-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <span className="font-medium text-sm">AI Generate</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground">
        {data.prompt.slice(0, 60)}...
      </CardContent>
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}
```

Node-ları register et:

```typescript
// components/workflow-editor.tsx
const nodeTypes = {
  "ai.generate": AIGenerateNode,
  "http.request": HttpRequestNode,
  "gmail.send": GmailSendNode,
  // ...
};
```

## shadcn/ui komponenti istifadə

Yalnız lazım olan komponenti əlavə et:

```bash
npx shadcn@latest add button card dialog form input
```

`components/ui/` qovluğunu **birbaşa redaktə etmə** — Tailwind class-larla customize et.

## Form handling

`react-hook-form` + Zod + shadcn Form:

```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const FormSchema = z.object({
  name: z.string().min(1, "Ad tələb olunur"),
  description: z.string().optional(),
});

export function CreateWorkflowForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    // Server action ilə göndər
    await createWorkflowAction(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* shadcn Form fields */}
      </form>
    </Form>
  );
}
```

## Data fetching

### Server Component-də
```typescript
const data = await db.workflows.findById(id);
```

### Client Component-də
TanStack Query istifadə et:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["workflow", id],
  queryFn: () => fetch(`/api/workflows/${id}`).then(r => r.json()),
});
```

### Mutations
Server Actions üstündür:

```typescript
"use server";
export async function createWorkflow(input: CreateWorkflowInput) {
  const { userId, orgId } = auth();
  if (!orgId) throw new Error("Unauthorized");

  const workflow = await db.workflows.create({
    tenantId: orgId,
    createdBy: userId,
    ...input,
  });

  revalidatePath("/dashboard/workflows");
  return workflow;
}
```

## Real-time updates

Workflow run statusu real-time göstərmək üçün — Server-Sent Events (SSE):

```typescript
// app/api/runs/[id]/stream/route.ts
export async function GET(req: Request, { params }: Props) {
  const stream = new ReadableStream({
    async start(controller) {
      const channel = redis.subscribe(`run:${params.id}`);
      for await (const msg of channel) {
        controller.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

## Loading və error states

Hər səhifədə `loading.tsx` və `error.tsx`:

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}

// app/dashboard/error.tsx
"use client";
export default function Error({ error, reset }: Props) {
  return <ErrorBoundary error={error} onReset={reset} />;
}
```

## Stil konvensiyaları

- **Tailwind** — utility classes, no custom CSS unless absolutely necessary
- `cn()` helper ilə class-ları birləşdir (`@/lib/utils`)
- Dark mode `next-themes` ilə — bütün komponentlər dəstək versin
- Spacing: 4, 8, 12, 16, 24, 32 (4-ün qatları)
- Color: yalnız Tailwind theme color-ları (`primary`, `muted`, ...)

## Performance qaydaları

- `<Image>` istifadə et, `<img>` yox
- Heavy komponentləri `dynamic()` ilə lazy load et
- React Flow viewport-da görünən node-ları virtualize et (auto)
- `useMemo`/`useCallback` yalnız ölçülmüş performans problemində

## Accessibility

- Bütün interactive elementlərdə `aria-label` (icon button-lar üçün)
- Keyboard navigation hər yerdə işləməlidir
- shadcn komponentləri default accessible — özün quranda da bunu saxla
- Color contrast WCAG AA standartı
