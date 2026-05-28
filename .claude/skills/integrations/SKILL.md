---
name: integrations
description: Use this skill when working on third-party integrations, OAuth flows, Nango setup, MCP (Model Context Protocol) servers, API connections, webhook handling, or anything in packages/integrations/. Triggers include adding new integrations (Gmail, Slack, Notion, etc.), debugging auth issues, building MCP clients, designing webhook handlers, or working with external APIs. Use proactively for any integration work.
---

# Integrations Skill

Nango və MCP istifadə edərək third-party inteqrasiyalar.

## İki növ inteqrasiya

1. **Nango** — populyar SaaS (Gmail, Slack, Notion, HubSpot, ...) üçün hazır OAuth
2. **MCP** — istifadəçinin öz daxili sistemləri və ya custom protocol

Birincisi 90% halları əhatə edir. İkincisi enterprise üçün gələcəkdə açılır.

## Nango setup

```typescript
// packages/integrations/src/nango/client.ts
import { Nango } from "@nangohq/node";

export const nango = new Nango({
  secretKey: process.env.NANGO_SECRET_KEY!,
});

export async function getConnection(tenantId: string, provider: string): Promise<NangoConnection> {
  return await nango.getConnection(provider, tenantId);
}
```

## Yeni inteqrasiya əlavə etmə

Hər inteqrasiya üçün `packages/integrations/src/<provider>/` qovluğu:

```
gmail/
├── index.ts          # Public API
├── actions.ts        # send_email, list_messages, ...
├── triggers.ts       # new_email, label_added, ...
├── schemas.ts        # Zod schemas (input/output)
└── nodes.ts          # Workflow node definitions
```

### Action implementation şablonu

```typescript
// packages/integrations/src/gmail/actions.ts
import { z } from "zod";
import { nango, getConnection } from "../nango/client";

const SendEmailInput = z.object({
  tenantId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

const SendEmailOutput = z.object({
  messageId: z.string(),
  threadId: z.string(),
});

export async function sendEmail(
  input: z.infer<typeof SendEmailInput>,
): Promise<z.infer<typeof SendEmailOutput>> {
  const validated = SendEmailInput.parse(input);

  const response = await nango.proxy({
    method: "POST",
    endpoint: "/gmail/v1/users/me/messages/send",
    providerConfigKey: "gmail",
    connectionId: validated.tenantId,
    data: {
      raw: encodeEmail(validated.to, validated.subject, validated.body),
    },
  });

  return SendEmailOutput.parse(response.data);
}
```

### Workflow node registration

```typescript
// packages/integrations/src/gmail/nodes.ts
export const gmailNodes: NodeDefinition[] = [
  {
    type: "gmail.sendMessage",
    label: "Send Email",
    category: "Email",
    inputSchema: SendEmailInput.omit({ tenantId: true }),
    outputSchema: SendEmailOutput,
    handler: sendEmail,
    description: "Send an email via Gmail",
  },
  // ... digər node-lar
];
```

## OAuth connection flow

İstifadəçi yeni inteqrasiya əlavə edərkən:

1. Frontend: "Connect Gmail" düyməsinə klik
2. Backend: Nango-dan auth URL generate et
3. İstifadəçi yönləndirilir, icazə verir
4. Nango callback-i emal edir, connection yaranır
5. Webhook bizə xəbər verir, DB-də qeyd edirik

```typescript
// app/api/integrations/connect/[provider]/route.ts
export async function POST(req: Request, { params }: Props) {
  const { userId, orgId } = auth();
  if (!orgId) throw new UnauthorizedError();

  const sessionToken = await nango.createConnectSession({
    end_user: { id: userId },
    organization: { id: orgId },
    allowed_integrations: [params.provider],
  });

  return Response.json({ sessionToken });
}
```

## Webhook handling

Nango bütün webhook-ları bizim endpoint-ə yönəldir:

```typescript
// app/api/webhooks/nango/route.ts
import { verifyNangoWebhook } from "@nangohq/node";

export async function POST(req: Request) {
  const signature = req.headers.get("x-nango-signature");
  const body = await req.text();

  if (!verifyNangoWebhook(signature, body, process.env.NANGO_WEBHOOK_SECRET!)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case "auth.connection_created":
      await handleConnectionCreated(event);
      break;
    case "sync.completed":
      await triggerWorkflows(event);
      break;
  }

  return new Response("OK");
}
```

## MCP server inteqrasiyası

İstifadəçi öz MCP server-ini bağlamaq istəsə:

```typescript
// packages/integrations/src/mcp/client.ts
import { Client } from "@modelcontextprotocol/sdk/client";

export async function connectMCPServer(config: MCPConfig) {
  const client = new Client({
    name: "ai-workflow-platform",
    version: "1.0.0",
  });

  await client.connect({
    type: "sse",
    url: config.serverUrl,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  // Server-in tools-larını fetch et
  const tools = await client.listTools();

  // Hər tool-u workflow node kimi qeydiyyatdan keçir
  for (const tool of tools) {
    registerDynamicNode({
      type: `mcp.${config.id}.${tool.name}`,
      label: tool.description,
      // ...
    });
  }

  return client;
}
```

## Rate limiting

Hər provider üçün rate limit-i bil:

```typescript
import { Ratelimit } from "@upstash/ratelimit";

const limiters: Record<string, Ratelimit> = {
  gmail: new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(250, "1s", 250), // Gmail: 250/sec
  }),
  slack: new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(50, "1s", 50),
  }),
};

export async function rateLimitedCall<T>(
  provider: string,
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const limiter = limiters[provider];
  if (!limiter) return fn();

  const { success } = await limiter.limit(`${provider}:${tenantId}`);
  if (!success) {
    throw new RateLimitError(`Rate limit exceeded for ${provider}`);
  }

  return fn();
}
```

## DO və DON'T

### DO

- Hər API çağırışında tenantId yoxla (cross-tenant data leak qarşısını al)
- Zod ilə həm input həm output validate et
- Webhook signature-ları MƏCBURİ yoxla
- Connection sıfırlanma logikasını qur (token expired)
- Hər inteqrasiya üçün dokumentasiya yaz

### DON'T

- API key-ləri DB-də plain text saxlama (Nango bunu özü edir, sən etmə)
- Webhook-larda uzun-running task et — Inngest-ə göndər
- Customer data-nı log-da çap etmə
- Bütün API çağırışları sinxron etmə — paralel mümkün olduqda Promise.all
- Provider error mesajlarını user-ə birbaşa göstərmə (info leak)
