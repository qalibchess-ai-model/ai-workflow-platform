# HubSpot Integration

Create CRM objects (contacts, deals) in a tenant's HubSpot account using a
Private App access token. The token is stored in the encrypted credentials
system — workflow params never carry it.

## Workflow nodes

| Node type               | Action         | Input (excl. `tenantId`, `accessToken`)           | Output                            |
| ----------------------- | -------------- | ------------------------------------------------- | --------------------------------- |
| `hubspot.createContact` | Create contact | `email`, `firstName?`, `lastName?`, `properties?` | `contactId`, `email`, `createdAt` |
| `hubspot.createDeal`    | Create deal    | `dealName`, `amount?`, `stage?`                   | `dealId`, `dealName`, `createdAt` |

- `tenantId` is injected by the execution engine from `ExecutionContext`.
- `accessToken` is loaded at execution time via
  `ctx.loadCredential<HubspotCredential>("hubspot")`. If the tenant has no
  HubSpot credential, the node fails with `CredentialNotFoundError` pointing
  the user at _Settings → Credentials_.
- `properties` on `createContact` is a `Record<string, string | number | boolean>`
  forwarded verbatim into HubSpot's `properties` object (e.g. `company`,
  `lifecyclestage`, custom properties). Values are coerced to string before
  sending — HubSpot stores all property values as strings anyway.
- `stage` on `createDeal` maps to HubSpot's `dealstage` property and must be a
  valid pipeline stage id from the tenant's pipeline (e.g.
  `appointmentscheduled`, `presentationscheduled`, `closedwon`).

Both handlers go through `withRateLimit("hubspot", tenantId, …)`. The bucket
is **10 requests/sec/tenant**, conservatively below HubSpot's published Private
App limit of 100 requests / 10 seconds so concurrent workflow runs in the same
tenant cannot exhaust the upstream quota.

## One-time setup

### 1. Create a Private App

1. In HubSpot, go to **Settings → Integrations → Private Apps → Create**.
2. Name the app (e.g. "AI Workflow Platform").
3. Under **Scopes**, grant at minimum:
   - `crm.objects.contacts.write` — to create contacts
   - `crm.objects.contacts.read` — to read back created contacts
   - `crm.objects.deals.write` — to create deals
   - `crm.objects.deals.read` — to read back created deals
4. **Create app** → HubSpot shows the access token of the form `pat-na1-…`.
   This is the value to store as the `accessToken` credential.

Private App tokens do not expire on their own but are revocable from the same
page.

### 2. Store the credential

Settings → Credentials → Add → **HubSpot**, paste the token. The token is
encrypted at rest (AES-256-GCM); only the worker can decrypt it when a run
executes.

### 3. Discover pipeline stage ids (optional, for deals)

The `stage` input expects a HubSpot pipeline stage **internal id**, not the
human label. List them via:

```bash
curl -H "Authorization: Bearer $HUBSPOT_TOKEN" \
  https://api.hubapi.com/crm/v3/pipelines/deals | jq '.results[].stages[] | {id, label}'
```

If `stage` is omitted, HubSpot places the deal in the first stage of the
default pipeline.

## Environment

```
UPSTASH_REDIS_REST_URL=...   # required for withRateLimit
UPSTASH_REDIS_REST_TOKEN=...
HUBSPOT_API_BASE=...         # optional, override the API host for tests/mocks
```

## Testing

`actions.test.ts` and `nodes.test.ts` mock `fetch` and `ctx.loadCredential` —
no real HubSpot API calls. The tests verify that:

- The bearer token rides only in the `Authorization` header, never in the JSON
  body.
- Errors from HubSpot (including 4xx responses and network failures) propagate
  as `IntegrationError` with the access token redacted.
- `accessToken` cannot leak through workflow params — the node input schema
  strips it.
