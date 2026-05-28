# Notion Integration

Create pages in a Notion database and query existing rows. Authentication uses
an integration token stored in the encrypted credentials system — workflow
params never carry it.

## Workflow nodes

| Node type              | Action                       | Input (excl. `tenantId`, `apiKey`)                   | Output                               |
| ---------------------- | ---------------------------- | ---------------------------------------------------- | ------------------------------------ |
| `notion.createPage`    | Insert a row into a database | `databaseId`, `properties`, `content?`               | `pageId`, `url`, `ok`                |
| `notion.queryDatabase` | Query rows of a database     | `databaseId`, `filter?`, `pageSize?`, `startCursor?` | `results[]`, `nextCursor`, `hasMore` |

- `tenantId` is injected by the execution engine from `ExecutionContext`.
- `apiKey` is loaded at execution time via
  `ctx.loadCredential<NotionCredential>("notion")`. If the tenant has no Notion
  credential, the node fails with `CredentialNotFoundError` and a message that
  points the user at _Settings → Credentials_.
- `databaseId` accepts both a hyphenated UUID (`abcdef01-...`) and the bare
  32-char hex form (`abcdef01234567890abcdef012345678`). Notion normalizes
  either.
- `properties` is a Notion-shaped property map (e.g.
  `{ Name: { title: [{ text: { content: "Hi" } }] } }`) — its structure depends
  on the target database's schema. Validation is left to Notion's API.
- `content`, when provided, is appended as a single paragraph block under the
  new page.

Both handlers go through `withRateLimit("notion", tenantId, …)`. The bucket is
**3 requests/sec/tenant**, matching the per-integration limit Notion publishes.

## One-time setup

### 1. Create an internal integration

1. Go to <https://www.notion.so/my-integrations> and **+ New integration**.
2. Pick the workspace you want to grant access to.
3. Capabilities: keep **Read content**, **Update content**, and **Insert
   content** enabled (turn off any you don't need).
4. Submit — Notion gives you an **Internal Integration Token** of the form
   `secret_…`. This is the value to store as the `apiKey` credential.

### 2. Share databases with the integration

By design, an integration sees **only** the pages/databases explicitly shared
with it.

1. Open the target Notion database.
2. Click **…** (top-right) → **Connections** (or **Add connections**).
3. Select your integration.

Without this step, both `notion.createPage` and `notion.queryDatabase` will
fail with `object_not_found`.

### 3. Store the credential

Settings → Credentials → Add → **Notion**, paste the token. The token is
encrypted at rest (AES-256-GCM); only the worker can decrypt it when a run
executes.

### 4. Find a `databaseId`

Open the database as a full page in Notion and look at the URL:

```
https://www.notion.so/<workspace>/<DATABASE_ID>?v=<VIEW_ID>
                                  ^^^^^^^^^^^^^
```

The 32-char hex chunk before `?v=` is the database id. Pass it as-is (no
hyphens needed) — the API normalizes either form.

## Environment

```
UPSTASH_REDIS_REST_URL=...   # required for withRateLimit
UPSTASH_REDIS_REST_TOKEN=...
NOTION_API_BASE=...          # optional, override the API host for tests/mocks
```

## Testing

`actions.test.ts` and `nodes.test.ts` mock `fetch` and `ctx.loadCredential` —
no real Notion API calls. The tests also verify that the `apiKey` never leaks
into request bodies and that errors from the Notion API have the key redacted
before being thrown.
