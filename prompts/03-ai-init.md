# Terminal C — AI Generation Init

## Sənin rolun
Sən Senior AI/ML Engineer-sən. LLM-ə əsaslanan sistemlərin etibarlılığını bilirsən: prompt engineering, structured output, validation loops, hallucination handling. Sənin yazdığın kod platformanın əsas dəyəridir — yaxşı işləməsə, məhsul işləməz.

## Tapşırıq
`packages/ai/` daxilində LLM infrastructure-i qur. Hələ workflow generation tam yox — yalnız əsas Anthropic client, Langfuse observability, və ilk "Hello LLM" cağırışı.

## Əvvəlcə oxu
1. `@CLAUDE.md`
2. `@.claude/skills/ai-generation/SKILL.md` (TAM oxu — bu sənin biblya-ndır)

## Konkret addımlar

### 1. Dependencies

```bash
cd packages/ai
pnpm add @anthropic-ai/sdk langfuse zod
pnpm add -D vitest
```

### 2. Folder strukturu

```
packages/ai/src/
├── client.ts              # Anthropic client wrapper
├── observability.ts       # Langfuse setup, decorators
├── prompts/
│   ├── workflow-gen/
│   │   ├── v1.ts          # Prompt v1 — versioning vacibdir
│   │   ├── examples.ts    # Few-shot examples
│   │   └── system.ts      # System prompt
│   └── README.md          # Prompt yazma qaydaları
├── generate/
│   ├── workflow.ts        # Main generation function
│   ├── validate.ts        # Output validation
│   └── self-correct.ts    # Retry on failure
├── tools/
│   └── workflow-tool.ts   # Tool definition for Claude
└── index.ts
```

### 3. Client wrapper (`src/client.ts`)

```typescript
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODELS = {
  // SKILL.md-də qeyd olunan default model-lər
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
  opus: "claude-opus-4-7",
} as const;

export type ModelName = keyof typeof MODELS;
```

### 4. Observability (`src/observability.ts`)

```typescript
import { Langfuse } from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

// Decorator pattern — hər LLM çağırışını avtomatik trace edir
export function observe<T extends (...args: any[]) => Promise<any>>(
  name: string
) {
  return (fn: T): T => {
    return (async (...args: Parameters<T>) => {
      const trace = langfuse.trace({ name });
      try {
        const result = await fn(...args);
        trace.update({ output: result });
        return result;
      } catch (error) {
        trace.update({
          output: { error: String(error) },
          level: "ERROR",
        });
        throw error;
      } finally {
        await langfuse.flushAsync();
      }
    }) as T;
  };
}
```

### 5. System prompt v1 (`src/prompts/workflow-gen/system.ts`)

**KRITIK**: Bu fayl sənin platformanın "ağlının" əsasıdır. Diqqətlə yaz.

```typescript
export const SYSTEM_PROMPT_V1 = `Sən AI Workflow Platforması üçün xüsusi tərtib edilmiş workflow generation modelisən.

ROLUN:
İstifadəçinin təbii dildə təsvirinə əsasən, strukturlaşdırılmış workflow JSON yaradırsan. Bu workflow sonradan execution engine tərəfindən icra olunacaq.

NƏ ETMƏLİSƏN:
1. İstifadəçinin niyyətini başa düş — nə avtomatlaşdırmaq istəyir?
2. Hansı trigger lazımdır (manual, schedule, webhook)?
3. Hansı node-lar lazımdır (yalnız mövcud siyahıdan seç)?
4. Node-lar arasında məlumat axını necə olmalıdır?
5. \`create_workflow\` tool-unu çağır.

ÜMUMI QAYDALAR:
- Node ID-ləri kebab-case olmalıdır (məsələn: "fetch-emails", "send-slack-msg")
- Hər workflow-da minimum 1 node olmalıdır
- Edge-lər yalnız mövcud node-ları bağlaya bilər
- Şərt məntiqi üçün edge-də \`condition\` field-ində JavaScript expression yaz
- Əmin deyilsənsə — sual ver, fərziyyə qurma

QADAĞALAR:
- Mövcud olmayan node tipi YARATMA — bu xətaya gətirib çıxaracaq
- User-in sensitive məlumatlarını (parol, API key) workflow params-də HARDCODE ETMƏ
- Tool çağırışından xaric mətn YAZMA — yalnız tool çağır

ÜSLUB:
- Workflow adları qısa və təsviri olsun
- Hər node-un params-i tam olmalıdır (boş qoyma)
- İstifadəçinin dilində cavab ver (Azərbaycan, türk, ingilis, ...)`;
```

### 6. Tool definition (`src/tools/workflow-tool.ts`)

Workflow schema-nı `packages/workflow` package-dən import et və JSON Schema-ya çevir:

```typescript
import { WorkflowDefinitionSchema } from "@workflow/schema";
import { zodToJsonSchema } from "zod-to-json-schema";

export const createWorkflowTool = {
  name: "create_workflow",
  description: "Create a workflow from the user's natural language description",
  input_schema: zodToJsonSchema(WorkflowDefinitionSchema, {
    target: "openApi3",  // Anthropic tool schema uyğundur
  }),
};
```

### 7. Generation function (`src/generate/workflow.ts`)

```typescript
import { anthropic, MODELS } from "../client";
import { observe } from "../observability";
import { SYSTEM_PROMPT_V1 } from "../prompts/workflow-gen/system";
import { createWorkflowTool } from "../tools/workflow-tool";
import { WorkflowDefinitionSchema } from "@workflow/schema";

export type GenerateInput = {
  userPrompt: string;
  availableNodeTypes: string[];
  language?: "az" | "tr" | "en";
};

export const generateWorkflow = observe("generate-workflow")(
  async (input: GenerateInput) => {
    const userMessage = buildUserMessage(input);

    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 4096,
      temperature: 0.2,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_V1,
          cache_control: { type: "ephemeral" },  // Token qənaəti
        },
      ],
      tools: [createWorkflowTool],
      tool_choice: { type: "tool", name: "create_workflow" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolUse = response.content.find(b => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not call create_workflow tool");
    }

    return WorkflowDefinitionSchema.parse(toolUse.input);
  }
);

function buildUserMessage(input: GenerateInput): string {
  return `
İstifadəçinin sorğusu:
<user_request>
${input.userPrompt}
</user_request>

Mövcud node tipləri:
<available_nodes>
${input.availableNodeTypes.join("\n")}
</available_nodes>

Yuxarıdakı sorğunu workflow-a çevir və \`create_workflow\` tool-unu çağır.`.trim();
}
```

### 8. İlk test

```typescript
// src/generate/workflow.test.ts
import { describe, it, expect, vi } from "vitest";
import { generateWorkflow } from "./workflow";

vi.mock("../client", () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: "tool_use",
          name: "create_workflow",
          input: {
            name: "Test Workflow",
            trigger: { type: "manual" },
            nodes: [{ id: "noop-1", type: "noop", params: {} }],
            edges: [],
          },
        }],
      }),
    },
  },
}));

describe("generateWorkflow", () => {
  it("returns valid workflow from mock response", async () => {
    const result = await generateWorkflow({
      userPrompt: "Test",
      availableNodeTypes: ["noop"],
    });

    expect(result.name).toBe("Test Workflow");
    expect(result.nodes).toHaveLength(1);
  });
});
```

## Test edək

- [ ] `pnpm typecheck` keçir
- [ ] `pnpm test` keçir
- [ ] `.env`-ə real `ANTHROPIC_API_KEY` qoy və manual test:
  ```typescript
  const result = await generateWorkflow({
    userPrompt: "Hər gün saat 9-da test",
    availableNodeTypes: ["noop", "http.request"],
  });
  console.log(JSON.stringify(result, null, 2));
  ```
- [ ] Langfuse dashboard-da trace görünür

## Etmə (DO NOT)
- Validation və self-correction loop-u indi qur — `c2-validation-layer.md` üçün
- Streaming response istifadə etmə (workflow generation tam JSON gözləyir)
- Temperature > 0.3 qoyma (deterministic output lazımdır)
- API key client tərəfə göndərmə
- Prompt-da real user data-nı escape etmədən qoyma (prompt injection)
- "Best practices" axtarıb tonlarla şey əlavə etmə — minimal işləyən sistem qur

## Yekun
İş bitəndə:
1. Generation function manual test-də işləyir
2. Langfuse-də trace görünür
3. Git commit, push
4. `c1-prompt-to-workflow.md` prompt-una keç (daha mürəkkəb scenarios)
