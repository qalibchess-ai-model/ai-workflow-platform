# Telegram Integration

Send messages and photos through a tenant's Telegram bot. Authentication uses a
bot token stored in the encrypted credentials system — workflow params never
carry it.

## Workflow nodes

| Node type              | Action       | Input (excl. `tenantId`, `botToken`)                                                      | Output            |
| ---------------------- | ------------ | ----------------------------------------------------------------------------------------- | ----------------- |
| `telegram.sendMessage` | Send a text  | `chatId`, `text`, `parseMode?` (`HTML`/`Markdown`/`MarkdownV2`), `disableWebPagePreview?` | `messageId`, `ok` |
| `telegram.sendPhoto`   | Send a photo | `chatId`, `photoUrl`, `caption?`, `parseMode?`                                            | `messageId`, `ok` |

- `tenantId` is injected by the execution engine from `ExecutionContext`.
- `botToken` is loaded at execution time via
  `ctx.loadCredential<TelegramCredential>("telegram")`. If the tenant has no
  Telegram credential, the node fails with `CredentialNotFoundError` and a
  message that points the user at _Settings → Credentials_.
- `chatId` is a string. Telegram chat ids for supergroups/channels are 64-bit
  integers; pass them as strings (e.g. `"-1001234567890"`) to avoid JS number
  precision loss. Channel usernames work too (e.g. `"@my_channel"`).

Both handlers go through `withRateLimit("telegram", tenantId, …)`. The bucket
is **30 messages/sec/tenant**, matching the global per-bot send limit Telegram
publishes (different chats can get up to 30/sec; sending to the same chat is
~1/sec, which the bot itself rate-limits — we do not try to model that).

## One-time setup

### 1. Create the bot

1. Open Telegram, talk to [@BotFather](https://t.me/BotFather).
2. `/newbot` → choose a name and a unique username ending in `bot`.
3. BotFather replies with an HTTP API token of the form `123456789:AA…`.
   This is the value to store as the `botToken` credential.
4. Optional, but recommended:
   - `/setdescription`, `/setabouttext`, `/setuserpic` — surface to users.
   - `/setjoingroups` — disable if the bot only DMs users.
   - `/setprivacy` → `Disable` if the bot needs to read group messages
     (default is enabled, meaning the bot only sees commands).

### 2. Store the credential

Settings → Credentials → Add → **Telegram**, paste the token. The token is
encrypted at rest (AES-256-GCM); only the worker can decrypt it when a run
executes.

### 3. Find a `chatId`

Telegram doesn't expose chat ids in the UI, so use one of:

**For a 1-on-1 chat with a user**:

1. Have the user send any message to the bot first (Telegram bots can't DM
   users who haven't initiated contact).
2. Call `https://api.telegram.org/bot<TOKEN>/getUpdates` once — the response
   includes `result[].message.chat.id`. That number is the user's `chatId`.

**For a group or supergroup**:

1. Add the bot to the group.
2. Send any message in the group, then `GET /getUpdates`.
3. `chat.id` will be negative (groups) or start with `-100…` (supergroups).
   Pass it as a string: `"-1001234567890"`.

**For a public channel**:

- Add the bot to the channel as an admin (with `Post Messages` permission).
- Use the channel `@username` directly as `chatId`, e.g. `"@my_channel"`.

A small helper script:

```bash
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getUpdates" | jq '.result[].message.chat'
```

## Environment

```
UPSTASH_REDIS_REST_URL=...   # required for withRateLimit
UPSTASH_REDIS_REST_TOKEN=...
TELEGRAM_API_BASE=...        # optional, override the API host for tests/mocks
```

No webhook setup is required for _sending_ — only for receiving updates, which
this provider does not yet implement.

## Testing

`actions.test.ts` and `nodes.test.ts` mock `fetch` and `ctx.loadCredential` —
no real Telegram API calls. The tests also verify that the `botToken` never
leaks into the request body and that errors from the Telegram API have the
token redacted before being thrown.
