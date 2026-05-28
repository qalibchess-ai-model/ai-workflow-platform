# Slack Integration

Post messages and upload files through a tenant's Slack bot. Authentication
uses a bot user OAuth token (`xoxb-…`) stored in the encrypted credentials
system — workflow params never carry it.

## Workflow nodes

| Node type           | Action               | Input (excl. `tenantId`, `botToken`)            | Output                |
| ------------------- | -------------------- | ----------------------------------------------- | --------------------- |
| `slack.sendMessage` | Post a message       | `channel`, `text`, `blocks?` (Block Kit blocks) | `ok`, `channel`, `ts` |
| `slack.uploadFile`  | Upload a file by URL | `channel`, `fileUrl`, `title?`                  | `ok`, `fileId`        |

- `tenantId` is injected by the execution engine from `ExecutionContext`.
- `botToken` is loaded at execution time via
  `ctx.loadCredential<SlackCredential>("slack")`. If the tenant has no Slack
  credential, the node fails with `CredentialNotFoundError` and a message that
  points the user at _Settings → Credentials_.
- `channel` accepts a Slack channel ID (`C0123…`, `G…`, `D…`) or a channel
  name (`#general`). For DMs use the user's `D…` ID.
- `blocks` is an optional array of Block Kit blocks; we accept anything that
  serialises to an object so callers can use the full Slack block schema
  without being blocked by a stale Zod shape.

Both handlers go through `withRateLimit("slack", tenantId, …)`. The bucket is
**1 token / second / tenant**, matching Slack's "no more than one message per
second per channel" rule for tier 1 Web API methods. Spikes that exceed this
will throw `RateLimitError` rather than be sent to Slack and risk a 429.

## File upload flow

`files.upload` was sunset in November 2025. `slack.uploadFile` uses the
external upload flow:

1. Fetch the source bytes from `fileUrl` (one outbound HTTP call).
2. `GET /files.getUploadURLExternal?filename=…&length=…` — reserve an
   `upload_url` + `file_id`.
3. `POST` the bytes to `upload_url` (no Slack auth — that URL is single-use
   and pre-signed).
4. `POST /files.completeUploadExternal` with `{ channel_id, files: [{ id,
title? }] }` to attach the upload to the target channel.

A failure at any step aborts the flow and surfaces a redacted error.

## One-time setup

### 1. Create a Slack app

1. Go to <https://api.slack.com/apps> → **Create New App** → "From scratch".
2. Name it, pick the workspace.
3. **OAuth & Permissions** → add bot token scopes:
   - `chat:write` — required for `slack.sendMessage`.
   - `files:write` — required for `slack.uploadFile`.
   - `chat:write.public` — optional, lets the bot post to public channels it
     hasn't been invited to.
4. Click **Install to Workspace** and approve. Copy the **Bot User OAuth
   Token** — this is the value to store as the `botToken` credential. It
   always starts with `xoxb-`.

### 2. Store the credential

Settings → Credentials → Add → **Slack**, paste the `xoxb-…` token. The token
is encrypted at rest (AES-256-GCM); only the worker can decrypt it at run
time.

### 3. Invite the bot

For private channels, run `/invite @your-bot-name` in the channel. Public
channels work without an invite if the app has `chat:write.public`.

### 4. Find a channel ID (optional)

You can use `#channel-name` directly, but IDs are faster and survive renames:

- Slack desktop: right-click the channel → **View channel details** → bottom
  of the modal shows the ID.
- API: `conversations.list` with the bot token.

## Environment

```
UPSTASH_REDIS_REST_URL=...   # required for withRateLimit
UPSTASH_REDIS_REST_TOKEN=...
SLACK_API_BASE=...           # optional, override the API host for tests/mocks
```

No webhook setup is required for outbound messaging — only for receiving
events, which this provider does not yet implement.

## Testing

`actions.test.ts` and `nodes.test.ts` mock `fetch` and `ctx.loadCredential` —
no real Slack API calls. The tests verify that the `botToken` never leaks
into the request body or upload URL and that Slack-API error strings have the
token redacted before being thrown.
