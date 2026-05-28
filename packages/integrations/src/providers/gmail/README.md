# Gmail Integration

Real Gmail integration using Nango as the OAuth + token-management layer.

## Workflow nodes

| Node type    | Action      | Input (excl. `tenantId`)                                                       | Output                                                                  |
| ------------ | ----------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `gmail.send` | Send email  | `to`, `subject`, `body`, `html?`, `cc?`, `bcc?`                                | `messageId`, `threadId`, `labelIds?`                                    |
| `gmail.list` | List emails | `query?`, `labelIds?`, `maxResults?` (≤500), `pageToken?`, `includeSpamTrash?` | `messages[]` (`id`, `threadId`), `resultSizeEstimate`, `nextPageToken?` |

`tenantId` is **never** taken from workflow input. The execution engine injects it
from `ExecutionContext.tenantId`. The Nango `connectionId` is the same value as
the tenant id.

Both handlers go through `withRateLimit("gmail", tenantId, …)` so the per-tenant
budget tracks the global Gmail quota (≈250 quota units/sec; see
[Gmail API quotas](https://developers.google.com/gmail/api/reference/quota)).

## Nango dashboard setup

You only need to do this once per environment.

### 1. Create the Google OAuth client

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create an OAuth 2.0 Client ID (`Web application`).
3. Add the Nango callback as an authorized redirect URI:
   `https://api.nango.dev/oauth/callback`
   (self-hosted Nango: replace with your host).
4. Note the `Client ID` and `Client Secret`.

### 2. Enable the Gmail API

In the same Google Cloud project: **APIs & Services → Enable APIs → Gmail API**.

### 3. Create the integration in Nango

1. Open your Nango dashboard.
2. **Integrations → Configure New Integration → Google Mail**.
3. Set:
   - **Integration ID (Unique Key)**: `gmail` (must match `GMAIL_PROVIDER_KEY`).
   - **Client ID / Client Secret**: from step 1.
   - **Scopes** (minimum):
     - `https://www.googleapis.com/auth/gmail.send` — required for `gmail.send`
     - `https://www.googleapis.com/auth/gmail.readonly` — required for `gmail.list`
     - `https://www.googleapis.com/auth/gmail.modify` — only if you later add label/archive actions
4. Save.

### 4. Environment variables for our service

```
NANGO_SECRET_KEY=...        # from Nango dashboard → Environment Settings
NANGO_WEBHOOK_SECRET=...    # set in Nango dashboard → Webhooks
NANGO_HOST=https://api.nango.dev   # only override when self-hosting
UPSTASH_REDIS_REST_URL=...  # required for withRateLimit
UPSTASH_REDIS_REST_TOKEN=...
```

## End-user connection flow

Once the integration is configured, end users connect their Gmail account via
Nango Connect UI. Our backend mints a short-lived session token through
`createConnectSession({ tenantId, userId, provider: "gmail" })`, the frontend
hands it to `@nangohq/frontend`, and Nango completes the OAuth dance. On
success Nango fires an `auth.creation` webhook that we verify with
`verifyNangoSignature`.

After a successful connection the `connectionId` stored in Nango equals our
internal `tenantId`, which is what `sendEmail` / `listMessages` use when
calling `nango.proxy`.

## Testing

Tests mock `nangoCall` and `withRateLimit` — no live Gmail API calls. See
`actions.test.ts` and `nodes.test.ts`.
