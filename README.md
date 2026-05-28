# AI Workflow Platform

Şirkətlərin təbii dildə təsvir verərək workflow avtomatlaşdırması qurmalarına imkan verən SaaS platforma. Prompt → AI strukturlaşdırılmış workflow yaradır → React Flow redaktorda göstərilir → Inngest engine-də icra olunur.

## Stack

- **Frontend**: Next.js 15 (App Router) + React Flow + shadcn/ui + Tailwind
- **Backend**: Hono (worker) + Inngest
- **DB**: PostgreSQL (Neon) + pgvector via Drizzle
- **LLM**: Claude Sonnet/Haiku 4.x
- **Auth**: Clerk · **Integrations**: Nango + MCP · **Sandbox**: E2B
- **Hosting**: Vercel (web) + Railway (worker)

Tam detallar üçün [`CLAUDE.md`](./CLAUDE.md) və [`docs/`](./docs/) qovluğuna bax.

## Başlamaq

```bash
# 1. Asılılıqlar
pnpm install

# 2. Env
cp .env.example .env.local
# .env.local-ı real key-lərlə doldur

# 3. Hər iki app-i paralel işə sal
pnpm dev
#   - web    → http://localhost:3000
#   - worker → http://localhost:8787
```

## Komandalar

| Komanda            | Nə edir                            |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Bütün workspace-ləri paralel       |
| `pnpm build`       | Hər package üçün build             |
| `pnpm typecheck`   | TypeScript yoxlanışı (hamısı)      |
| `pnpm lint`        | ESLint                             |
| `pnpm test`        | Vitest unit testlər                |
| `pnpm format`      | Prettier (yazır)                   |

## Monorepo strukturu

```
apps/
  web/              # Next.js 15 frontend
  worker/           # Hono + Inngest worker
packages/
  config/           # Paylaşılan tsconfig / eslint / prettier
  db/               # Drizzle ORM (boş skelet)
  ai/               # LLM clients & prompts (boş skelet)
  workflow/         # Execution engine (boş skelet)
  integrations/     # Nango + MCP (boş skelet)
  ui/               # Paylaşılan React komponentlər (boş skelet)
```

## Paralel terminal iş bölgüsü

Hər terminal `prompts/` qovluğundakı uyğun prompt-u oxuyaraq başlayır:

| Terminal | Sahə                    | Prompt                                  |
| -------- | ----------------------- | --------------------------------------- |
| A        | Frontend & UI           | `prompts/01-frontend-init.md`           |
| B        | Workflow Engine + DB    | `prompts/02-engine-init.md`             |
| C        | AI Generation Layer     | `prompts/03-ai-init.md`                 |
| D        | Integrations & MCP      | `prompts/04-integrations-init.md`       |
| E        | Testing & DevOps        | `prompts/05-testing-init.md`            |

İlkin monorepo setup (bu fayl): `prompts/00-monorepo-setup.md` — bir dəfə işlədilir, artıq tamamdır.

## Skills

`.claude/skills/` qovluğunda hər sahə üçün ixtisaslaşmış skill mövcuddur — Claude Code lazım olduqda avtomatik oxuyur:

- `workflow-engine` · `ai-generation` · `frontend-ui` · `integrations` · `testing`
