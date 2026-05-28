# Terminal D — Integrations Init

## Sənin rolun
Sən Senior Integrations Engineer-sən. OAuth flow-ları, webhook signature verification, rate limiting və multi-tenant connection idarəetməsi bilirsən. Sənin yazdığın hər inteqrasiya təhlükəsiz və scalable olmalıdır.

## Tapşırıq
`packages/integrations/` daxilində inteqrasiya infrastructure-i qur. Hələ konkret inteqrasiyalar (Gmail, Slack) yox — yalnız Nango client, MCP foundation, və ilk "noop" inteqrasiyası test üçün.

## Əvvəlcə oxu
1. `@CLAUDE.md`
2. `@.claude/skills/integrations/SKILL.md` (TAM oxu)

## Konkret addımlar

### 1. Nango account setup (manual)

Bu addımı sən etmirsən — istifadəçiyə deyəcəksən:
1. https://nango.dev-də account aç (free tier)
2. Secret key və Public key götür
3. `.env`-ə əlavə et:
   ```
   NANGO_SECRET_KEY=...
   NANGO_PUBLIC_KEY=...
   NANGO_HOST=https://api.nango.dev
   ```

### 2. Dependencies

```bash
cd packages/integrations
pnpm add @nangohq/node @nangohq/frontend zod
pnpm add @modelcontextprotocol/sdk
pnpm add @upstash/redis @upstash/ratelimit
pnpm add -D vitest
```

### 3. Folder strukturu

```
packages/integrations/src/
├── nango/
│   ├── client.ts          # Nango server client
│   ├── connect.ts         # Connection session yaratma
│   ├── webhook.ts         # Webhook signature verification
│   └── types.ts
├── mcp/
│   ├── client.ts          # MCP server connection
│   ├── registry.ts        # Dynamic node registration
│   └── types.ts
├── rate-limit/
│   └── index.ts           # Provider başına rate limiting
├── providers/             # Konkret provider-lər (Gmail, Slack, ...)
│   └── noop/              # Test üçün
│       ├── actions.ts
│       ├── nodes.ts
│       └── schemas.ts
├── errors.ts              # Custom error classes
└── index.ts
```

### 4. Nango client (`src/nango/client.ts`)

```typescript
import { Nango } from "@nangohq/node";

if (!process.env.NANGO_SECRET_KEY) {
  throw new Error("NANGO_SECRET_KEY is required");
}

export const nango = new Nango({
  secretKey: process.env.NANGO_SECRET_KEY,
  host: process.env.NANGO_HOST || "https://api.nango.dev",
});

export type NangoCallParams = {
  tenantId: string;           // Bizim connection ID
  provider: string;            // "gmail", "slack", ...
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  data?: unknown;
  params?: Record<string, string>;
};

export async function nangoCall<T = unknown>(p: NangoCallParams): Promise<T> {
  const response = await nango.proxy({
    method: p.method,
    endpoint: p.endpoint,
    providerConfigKey: p.provider,
    connectionId: p.tenantId,
    data: p.data,
    params: p.params,
  });
  return response.data as T;
}
```

### 5. Connection session (`src/nango/connect.ts`)

İstifadəçi yeni inteqrasiya bağlayarkən:

```typescript
import { nango } from "./client";

export async function createConnectSession(opts: {
  tenantId: string;
  userId: string;
  provider: string;
}): Promise<{ token: string }> {
  const session = await nango.createConnectSession({
    end_user: { id: opts.userId },
    organization: { id: opts.tenantId },
    allowed_integrations: [opts.provider],
  });

  return { token: session.data.token };
}
```

### 6. Webhook handler (`src/nango/webhook.ts`)

```typescript
import crypto from "node:crypto";

export function verifyNangoSignature(
  body: string,
  signature: string | null,
  secret: string = process.env.NANGO_WEBHOOK_SECRET!
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export type NangoWebhookEvent =
  | { type: "auth"; operation: "creation"; connectionId: string; providerConfigKey: string }
  | { type: "sync"; operation: "completion"; connectionId: string; model: string }
  | { type: "sync"; operation: "error"; connectionId: string; error: string };

export function parseNangoWebhook(body: string): NangoWebhookEvent {
  return JSON.parse(body);
}
```

### 7. Provider definition pattern (`src/providers/noop/`)

Test üçün ən sadə provider. Real provider-lər bu pattern-i izləyəcək:

`schemas.ts`:
```typescript
import { z } from "zod";

export const NoopActionInput = z.object({
  message: z.string(),
  delay: z.number().optional(),
});

export const NoopActionOutput = z.object({
  echoed: z.string(),
  timestamp: z.string(),
});
```

`actions.ts`:
```typescript
import type { z } from "zod";
import { NoopActionInput, NoopActionOutput } from "./schemas";

export async function noopAction(
  input: z.infer<typeof NoopActionInput>
): Promise<z.infer<typeof NoopActionOutput>> {
  if (input.delay) {
    await new Promise(r => setTimeout(r, input.delay));
  }
  return {
    echoed: input.message,
    timestamp: new Date().toISOString(),
  };
}
```

`nodes.ts`:
```typescript
import { NoopActionInput, NoopActionOutput } from "./schemas";
import { noopAction } from "./actions";

export const noopNodes = [
  {
    type: "noop.echo",
    category: "Testing",
    label: "Echo Message",
    description: "Returns the input message",
    inputSchema: NoopActionInput,
    outputSchema: NoopActionOutput,
    handler: noopAction,
  },
];
```

### 8. MCP client (`src/mcp/client.ts`)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse";

export type MCPConnectionConfig = {
  id: string;
  serverUrl: string;
  apiKey?: string;
  tenantId: string;
};

export async function connectMCPServer(
  config: MCPConnectionConfig
): Promise<{ client: Client; tools: unknown[] }> {
  const transport = new SSEClientTransport(new URL(config.serverUrl), {
    requestInit: config.apiKey
      ? { headers: { Authorization: `Bearer ${config.apiKey}` } }
      : undefined,
  });

  const client = new Client(
    { name: "ai-workflow-platform", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  const { tools } = await client.listTools();

  return { client, tools };
}
```

### 9. Rate limiting (`src/rate-limit/index.ts`)

```typescript
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = Redis.fromEnv();

// SKILL.md-də göstərilən provider başına limitlər
const limiters = new Map<string, Ratelimit>();

function getLimiter(provider: string): Ratelimit {
  let limiter = limiters.get(provider);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(50, "1s", 50),  // Default
      prefix: `ratelimit:${provider}`,
    });
    limiters.set(provider, limiter);
  }
  return limiter;
}

export async function withRateLimit<T>(
  provider: string,
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  const limiter = getLimiter(provider);
  const { success, reset } = await limiter.limit(`${provider}:${tenantId}`);

  if (!success) {
    const waitMs = reset - Date.now();
    throw new RateLimitError(provider, waitMs);
  }

  return fn();
}

export class RateLimitError extends Error {
  constructor(public provider: string, public retryAfterMs: number) {
    super(`Rate limit exceeded for ${provider}`);
  }
}
```

### 10. Public API (`src/index.ts`)

```typescript
export { nango, nangoCall } from "./nango/client";
export { createConnectSession } from "./nango/connect";
export { verifyNangoSignature, parseNangoWebhook } from "./nango/webhook";
export { connectMCPServer } from "./mcp/client";
export { withRateLimit, RateLimitError } from "./rate-limit";
export { noopNodes } from "./providers/noop/nodes";
```

## Test edək

- [ ] `pnpm typecheck` keçir
- [ ] Unit testlər keçir (noopAction, webhook verification)
- [ ] Nango credentials ilə manual test:
  ```typescript
  const session = await createConnectSession({
    tenantId: "test-tenant",
    userId: "test-user",
    provider: "gmail",
  });
  console.log(session.token);
  ```

## Etmə (DO NOT)
- Gmail, Slack və s. konkret inteqrasiya yazma — `d1-gmail-integration.md`-də
- API key-ləri DB-də saxla (Nango saxlayır, sən etmə)
- Webhook signature-ları skip etmə — security risk
- Rate limit-i bypass et — provider hesabını ban edəcək
- Synchronous loop-da API call-lar et — paralel mümkün olduqda Promise.all

## Yekun
Bitəndə git commit, sonra `d1-gmail-integration.md` prompt-una keç.
