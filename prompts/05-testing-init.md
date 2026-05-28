# Terminal E — Testing & DevOps Init

## Sənin rolun
Sən Senior DevOps/SRE Engineer-sən. Test infrastructure-i, CI/CD pipeline-ları, monitoring və deployment-i bilirsən. Sənin işin görünməyən amma kritik — komandanın digərləri sənin qurduğun rails üzərində sürətlə hərəkət edə bilməlidir.

## Tapşırıq
Layihə üçün test infrastructure və CI/CD pipeline-larını qur. Monitoring (Sentry, PostHog) konfiqurasiyası. Hələ deployment yox — yalnız foundation.

## Əvvəlcə oxu
1. `@CLAUDE.md`
2. `@.claude/skills/testing/SKILL.md` (TAM oxu)

## Konkret addımlar

### 1. Test dependencies

Root-da:
```bash
pnpm add -D -w vitest @vitest/coverage-v8 @playwright/test
pnpm add -D -w @types/node tsx
```

### 2. Root vitest config

`vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,  // Explicit import-lar daha yaxşı
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.ts",
        "**/types.ts",
      ],
      thresholds: {
        // SKILL.md-də göstərilən hədəflər
        "packages/workflow/**": { lines: 90, functions: 90 },
        "packages/ai/**": { lines: 80, functions: 80 },
        "packages/integrations/**": { lines: 70, functions: 70 },
      },
    },
  },
});
```

Hər package-də öz `vitest.config.ts` ilə extend etsin.

### 3. Test fixture-ları (`packages/test-utils/`)

Yeni package yarat — paylaşılan test helper-lər:

```typescript
// packages/test-utils/src/fixtures.ts
import { randomUUID } from "node:crypto";

export function createTestTenant() {
  return {
    id: randomUUID(),
    name: `test-tenant-${Date.now()}`,
  };
}

export function createTestWorkflow(overrides = {}) {
  return {
    name: "Test Workflow",
    trigger: { type: "manual" as const },
    nodes: [{ id: "n1", type: "noop", params: {} }],
    edges: [],
    ...overrides,
  };
}
```

```typescript
// packages/test-utils/src/mocks/anthropic.ts
import { vi } from "vitest";

export function mockAnthropicResponse(workflow: unknown) {
  return {
    content: [{
      type: "tool_use" as const,
      id: "mock",
      name: "create_workflow",
      input: workflow,
    }],
    stop_reason: "tool_use" as const,
    usage: { input_tokens: 100, output_tokens: 200 },
  };
}

export const mockAnthropicClient = {
  messages: {
    create: vi.fn(),
  },
};
```

### 4. Playwright setup

```bash
pnpm dlx playwright install
```

`playwright.config.ts`:
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

İlk smoke test (`e2e/smoke.spec.ts`):
```typescript
import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/AI Workflow/);
});
```

### 5. GitHub Actions CI (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint

  unit-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test

      - run: pnpm test --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test
          ANTHROPIC_API_KEY: ${{ secrets.TEST_ANTHROPIC_KEY }}

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-summary.json

  e2e:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install chromium --with-deps
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 6. Sentry setup

`apps/web/sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
});
```

Eyni şeyi `sentry.server.config.ts` üçün də et.

### 7. PostHog setup

`apps/web/lib/posthog.ts`:
```typescript
"use client";
import posthog from "posthog-js";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",  // Reverse proxy CORS üçün
    person_profiles: "identified_only",
  });
}

export { posthog };
```

### 8. Pre-commit hooks

```bash
pnpm add -D -w husky lint-staged
pnpm husky init
```

`.husky/pre-commit`:
```bash
pnpm lint-staged
```

`package.json`-da:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{md,json,yml}": ["prettier --write"]
  }
}
```

### 9. Environment validation

`packages/config/env.ts`:
```typescript
import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  CLERK_SECRET_KEY: z.string(),
  INNGEST_EVENT_KEY: z.string(),
  NANGO_SECRET_KEY: z.string(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  // Optional
  LANGFUSE_SECRET_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
```

Hər app-də process start-da bu validate olunsun — yanlış konfiqurasiya production-a getməsin.

## Test edək

- [ ] `pnpm test` keçir (boş testlər də olsa run olur)
- [ ] `pnpm test:e2e` smoke test keçir
- [ ] GitHub Actions trigger oldu və yaşıl
- [ ] Husky pre-commit yoxlanışı işləyir (test üçün bad code commit et)
- [ ] `pnpm dev`-də Sentry init və PostHog init log-da görünmür (production-only)

## Etmə (DO NOT)
- Production secrets-ləri GitHub repo-ya commit etmə
- Test database-i production database-i ilə eyni qurma
- E2E test-də real LLM API-ya çağırış et — slow + costly
- Coverage 100% hədəflə — keyfiyyət vacibdir, mətrika yox
- Bütün dependency-ləri root-a yığma — workspace-də saxla

## Yekun
İş bitəndə:
1. CI yaşıl-dır (boş layihədə də olsa)
2. Test infrastructure-i hazırdır
3. Husky işləyir
4. Git commit, push
5. `e1-ci-pipeline.md` prompt-una keç (daha detallı CI/CD)
