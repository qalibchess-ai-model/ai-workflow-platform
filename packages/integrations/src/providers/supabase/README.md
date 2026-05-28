# Supabase Integration

Insert and read rows from a tenant's Supabase project through the PostgREST
API. Authentication uses the **service role key** stored in the encrypted
credentials system — workflow params never carry it, and the key never leaves
the worker process.

## Workflow nodes

| Node type         | Action        | Input (excl. `tenantId`)                                     | Output          |
| ----------------- | ------------- | ------------------------------------------------------------ | --------------- |
| `supabase.insert` | Insert row(s) | `table`, `data` (object or array of objects)                 | `rows`, `count` |
| `supabase.select` | Select rows   | `table`, `filter?` (PostgREST conditions), `limit?` (1–1000) | `rows`, `count` |

- `tenantId` is injected by the execution engine from `ExecutionContext`.
- `url` + `serviceKey` are loaded at execution time via
  `ctx.loadCredential<SupabaseCredential>("supabase")`. If the tenant has no
  Supabase credential, the node fails with `CredentialNotFoundError`.
- `table` must be a plain SQL identifier (`[a-zA-Z_][a-zA-Z0-9_]*`). Schema
  prefixes (`public.users`) are not accepted — use the default schema.
- `filter` is a `{ column: condition }` map where `condition` is a PostgREST
  expression: `eq.42`, `gte.10`, `in.(1,2,3)`, `ilike.*foo*`, etc. See
  https://postgrest.org/en/stable/api.html#operators for the full list.

Both handlers go through `withRateLimit("supabase", tenantId, …)`. The bucket
is **20 requests/sec/tenant** — well under Supabase's free-tier limits while
still allowing reasonable batch throughput.

## REST contract

The provider talks directly to PostgREST at:

```
<credential.url>/rest/v1/<table>
```

with headers:

```
apikey: <serviceKey>
Authorization: Bearer <serviceKey>
Content-Type: application/json
```

`insert` adds `Prefer: return=representation` so the inserted rows are echoed
back (we need the assigned ids/defaults in workflow state).

## One-time setup

### 1. Find the project credentials

1. Open the Supabase dashboard for the project.
2. Settings → API.
3. Copy the **Project URL** (e.g. `https://abcd1234.supabase.co`).
4. Copy the **service_role** key. ⚠️ This key bypasses Row Level Security —
   treat it like a root password. It must only ever live in worker
   environments, never in the browser.

### 2. Store the credential

Settings → Credentials → Add → **Supabase**, paste the URL and service key
(the anon key is also captured for future client-side flows). Values are
encrypted at rest (AES-256-GCM); only the worker can decrypt them when a run
executes.

### 3. Use the nodes in a workflow

**Insert:**

```json
{
  "type": "supabase.insert",
  "params": {
    "table": "events",
    "data": { "user_id": "{{ trigger.user_id }}", "kind": "signup" }
  }
}
```

**Select with filter and limit:**

```json
{
  "type": "supabase.select",
  "params": {
    "table": "events",
    "filter": { "user_id": "eq.{{ trigger.user_id }}", "kind": "eq.signup" },
    "limit": 10
  }
}
```

## Environment

```
UPSTASH_REDIS_REST_URL=...   # required for withRateLimit
UPSTASH_REDIS_REST_TOKEN=...
```

No webhook setup is required for these operations.

## Security notes

- The service role key is **never** logged or echoed back in errors. Both
  network failures and PostgREST error bodies are passed through a redactor
  that replaces the key with `***` before throwing.
- `table` and `filter` keys are validated as plain SQL identifiers — the
  PostgREST querystring cannot be poisoned with arbitrary operators in the
  column position.
- RLS is bypassed by the service role key. Workflow authors should treat the
  Supabase node as having full database access; do not expose it directly to
  untrusted prompt input without `filter` constraints.

## Testing

`actions.test.ts` and `nodes.test.ts` mock `fetch` and `ctx.loadCredential` —
no real Supabase API calls. The tests verify:

- Correct REST URL, method, headers (`apikey`, `Bearer`, `Prefer`).
- Service key never appears in the request body and is redacted from any
  error message (network or PostgREST).
- Filter and limit are serialized as PostgREST querystring.
- Invalid identifiers (SQL injection, path traversal) are rejected before
  the request is made.
- `tenantId` is injected from `ExecutionContext`, not from workflow params.
- Rate limiter is invoked with the `supabase` provider key.
