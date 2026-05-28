---
name: testing
description: Use this skill when writing or debugging tests — Vitest unit tests, Playwright E2E tests, mocking LLM calls, integration tests, or test infrastructure. Triggers include adding tests for new features, fixing flaky tests, mocking external services, setting up test fixtures, or designing test strategies. Use proactively whenever new code is written that should be tested.
---

# Testing Skill

Vitest + Playwright istifadə edərək testlər.

## Test piramidası

```
        /\
       /  \  E2E (Playwright) — yalnız kritik flow-lar
      /----\
     /      \  Integration (Vitest + real DB)
    /--------\
   /          \  Unit (Vitest + mock-lar)
  /____________\
```

70% unit, 20% integration, 10% E2E.

## Unit test pattern

```typescript
// packages/workflow/src/validate.test.ts
import { describe, it, expect, vi } from "vitest";
import { validateWorkflow } from "./validate";

describe("validateWorkflow", () => {
  it("rejects workflow with circular dependency", () => {
    const workflow = {
      nodes: [{ id: "a", type: "noop" }, { id: "b", type: "noop" }],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "a" }],
    };

    expect(() => validateWorkflow(workflow)).toThrow("Circular dependency");
  });

  it("accepts valid linear workflow", () => {
    const workflow = {
      nodes: [{ id: "a", type: "noop" }, { id: "b", type: "noop" }],
      edges: [{ from: "a", to: "b" }],
    };

    expect(() => validateWorkflow(workflow)).not.toThrow();
  });
});
```

### Test naming
- `it("verb noun condition")` — "rejects workflow with circular dependency"
- DESCRIBE blok funksiya adı və ya senaryo
- Hər test bir şey yoxlasın (single assertion principle)

## LLM mocking

Real Claude API testlərdə çağırılmamalıdır — slow + bahalı + non-deterministic.

```typescript
// packages/ai/src/__mocks__/anthropic.ts
import { vi } from "vitest";

export const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
};

// Test-də
beforeEach(() => {
  mockAnthropic.messages.create.mockResolvedValue({
    content: [{
      type: "tool_use",
      name: "create_workflow",
      input: { /* mock workflow */ },
    }],
    stop_reason: "tool_use",
  });
});
```

### Snapshot test for prompts

Prompt-lar dəyişəndə görmək üçün:

```typescript
it("matches workflow generation prompt snapshot", () => {
  const prompt = buildSystemPrompt(availableTools);
  expect(prompt).toMatchSnapshot();
});
```

## Integration test (real DB)

Test database ilə:

```typescript
// vitest.config.ts
export default {
  test: {
    setupFiles: ["./test/setup.ts"],
    globalSetup: "./test/global-setup.ts",
  },
};

// test/global-setup.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";

export async function setup() {
  process.env.DATABASE_URL = "postgresql://test@localhost/test_db";
  await migrate(testDb, { migrationsFolder: "./drizzle" });
}

export async function teardown() {
  await testDb.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
}
```

Hər test öz datasını izolyasiya etsin:

```typescript
describe("workflow creation", () => {
  let tenantId: string;

  beforeEach(async () => {
    tenantId = randomUUID();
    await db.tenants.insert({ id: tenantId, name: "test" });
  });

  afterEach(async () => {
    await db.workflows.delete({ tenantId });
    await db.tenants.delete({ id: tenantId });
  });

  it("creates workflow with valid input", async () => {
    // ...
  });
});
```

## Playwright E2E

Yalnız kritik path-lər:

1. Sign up → onboarding → first workflow yaratma
2. Prompt-dan workflow generate → save → run
3. Inteqrasiya bağlama → workflow-da istifadə

```typescript
// e2e/workflow-creation.spec.ts
import { test, expect } from "@playwright/test";

test("user creates workflow from prompt", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New Workflow" }).click();

  await page.fill(
    'textarea[name="prompt"]',
    "Hər gün saat 9-da Gmail-imdən şikayətləri Slack-ə göndər"
  );
  await page.getByRole("button", { name: "Generate" }).click();

  // AI generation gözlə
  await expect(page.getByText("Workflow generated")).toBeVisible({ timeout: 30000 });

  // Workflow düzgün göstərilsin
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
});
```

### Test data
- Hər test öz test user-ini yaratsın (Clerk test mode)
- Test database production-dan ayrı olmalı
- Real LLM çağırışları E2E-də OK, amma seyrək (1-2 test)

## Inngest function testing

```typescript
import { InngestTestEngine } from "@inngest/test";
import { executeWorkflow } from "./functions";

it("executes workflow with all steps", async () => {
  const t = new InngestTestEngine({ function: executeWorkflow });

  const { result } = await t.execute({
    events: [{ name: "workflow/execute.requested", data: { /* ... */ } }],
  });

  expect(result.success).toBe(true);
});
```

## Coverage hədəfləri

- `packages/workflow/` — 90%+ (kritik)
- `packages/ai/` — 80%+ (LLM mock-lu)
- `packages/integrations/` — 70%+
- `apps/web/` — 50%+ (UI testləri E2E-də)

Coverage report:
```bash
pnpm test --coverage
```

## CI configuration

`.github/workflows/test.yml`:

```yaml
- name: Run tests
  run: pnpm test --coverage
  env:
    DATABASE_URL: postgresql://postgres@localhost/test
    ANTHROPIC_API_KEY: ${{ secrets.TEST_ANTHROPIC_KEY }}  # rate-limited test key

- name: E2E tests
  run: pnpm test:e2e
  if: github.event_name == 'pull_request'
```

## DO və DON'T

### DO
- Hər bug fix üçün regression test yaz
- Test name-lər nə yoxladığını dəqiq desin
- `beforeEach` cleanup et — test order asılılığı olmasın
- Flaky test-i ya düzəlt, ya sil — ignore etmə
- Mock-lar real API contract-a uyğun olsun

### DON'T
- Real production API-ya test-dən çağırış etmə
- Test-də random data istifadə etmə (deterministic)
- Console.log test-də qoyma
- Slow test-ləri unit suite-də saxlama (integration-a köçür)
- 100% coverage-ə fokus olma — keyfiyyət vacibdir
