# AI Workflow Automation Platform

## Layihə haqqında

Bu, şirkətlərin təbii dildə təsvir verərək workflow avtomatlaşdırması qurmalarına imkan verən SaaS platformasıdır. İstifadəçi prompt yazır → AI strukturlaşdırılmış workflow yaradır → vizual redaktorda göstərilir → Inngest engine-də icra olunur.

## Texniki Stack (qəti seçilib, dəyişdirmə)

- **Frontend**: Next.js 15 (App Router) + React Flow (xyflow) + shadcn/ui + Tailwind
- **Backend**: Next.js API routes + Hono (uzun əməliyyatlar üçün ayrı service)
- **Dil**: TypeScript (strict mode, hər yerdə)
- **Workflow Engine**: Inngest
- **LLM**: Claude Sonnet 4.6 (əsas), Claude Haiku 4.5 (ucuz əməliyyatlar)
- **Database**: PostgreSQL (Neon) + pgvector
- **Cache/Queue**: Upstash Redis
- **Auth**: Clerk (multi-tenant)
- **Integrations**: Nango + MCP
- **Sandbox**: E2B (custom kod icrası)
- **Observability**: Langfuse (LLM trace), Sentry (xətalar), PostHog (analytics)
- **Storage**: Cloudflare R2
- **Hosting**: Vercel (frontend) + Railway (backend services)
- **Billing**: Stripe

## Layihə strukturu

```
ai-workflow-platform/
├── apps/
│   ├── web/              # Next.js frontend tətbiqi
│   └── worker/           # Inngest worker service (Hono)
├── packages/
│   ├── db/               # Drizzle ORM schema və migration-lar
│   ├── ai/               # LLM clientləri, prompt-lar, generation məntiqi
│   ├── workflow/         # Workflow execution və validation
│   ├── integrations/     # Nango wrappers, MCP clients
│   └── ui/               # Paylaşılan komponentlər
├── docs/                 # Texniki sənədlər
├── prompts/              # Claude Code üçün hazır prompt-lar
└── .claude/
    ├── skills/           # Custom skills (token qənaəti üçün)
    └── settings.json     # Claude Code konfiqurasiyası
```

## Vacib qaydalar

### Kod üslubu
- **TypeScript strict mode** məcburidir — `any` istifadə etmə
- **Zod** ilə bütün external məlumatları validate et (API responses, LLM outputs, user inputs)
- **Server Components default** — `"use client"` yalnız zəruri olduqda
- **Error handling**: heç bir `try-catch` boş qoyma, hər xəta Sentry-yə göndərilməli
- **Async hər yerdə** — `Promise<T>` qaytar, `void` async function-lardan qaç

### Fayl organization
- Hər fayl maksimum 300 sətr — keçirsə, bölünmə vaxtıdır
- Hər fayl bir əsas məsuliyyət (single responsibility)
- Import sırası: external → internal packages → local relative
- Index file-lardan istifadə et (`index.ts` ilə re-export)

### LLM çağırışları
- **HEÇ VAXT** birbaşa `fetch("api.anthropic.com")` yazma — `@/packages/ai/client` istifadə et
- Hər LLM çağırışı Langfuse-da izlənməlidir (decorator avtomatik edir)
- Bütün prompt-lar `packages/ai/prompts/` qovluğunda versiyalanır
- Structured output üçün tool calling istifadə et, JSON parsing yox
- Temperature default = 0.2 (deterministic), creative işlər üçün açıq qeyd et

### Database
- **Drizzle ORM** — raw SQL yalnız mürəkkəb query-lər üçün
- Hər migration-da rollback yolu olmalıdır
- Production database-də heç vaxt birbaşa dəyişiklik etmə
- Row-level security (RLS) tenant izolyasiyası üçün məcburidir

### Test strategiyası
- **Vitest** unit testlər üçün
- **Playwright** E2E testlər üçün (yalnız kritik flow-lar)
- LLM çağırışları test-də mock olunmalıdır
- Hər PR üçün test coverage 60%+ (kritik path-lər üçün 90%+)

## Skills istifadəsi

Layihənin müxtəlif hissələri üçün custom skill-lər `.claude/skills/` qovluğundadır:

- **workflow-engine** — Inngest function-ları, retry məntiqi, state management
- **ai-generation** — Prompt-dan workflow JSON generation, validation
- **frontend-ui** — React Flow node-ları, shadcn komponentlər
- **integrations** — Nango/MCP istifadəsi, OAuth flows
- **testing** — Test pattern-ləri, mock strategiyaları

Claude Code bunları lazım olduqda avtomatik oxuyacaq. Sən birbaşa "skill istifadə et" deyə bilərsən və ya işin xarakterinə görə Claude özü seçəcək.

## Workflow paralel terminallarda

Bu layihə paralel olaraq müxtəlif terminallarda işlənir. Hər terminal bir konkret sahəyə fokuslanır:

1. **Terminal A** — Frontend & UI
2. **Terminal B** — Workflow Engine & Backend
3. **Terminal C** — AI Generation Layer
4. **Terminal D** — Integrations & MCP
5. **Terminal E** — Testing & DevOps

Hər terminalda işə başlayanda Claude Code əvvəlcə bu fayl + uyğun skill-i oxumalıdır. Git commit-lər tez və kiçik olmalıdır (feature branch-ları paralel terminallar arasında konflikti azaltsın).

## Token qənaəti prinsipləri

- Skills istifadə et — uzun izahatları təkrar yazma
- `docs/` qovluğundakı sənədlərə istinad et, içəriyini context-ə yapışdırma
- "Bu layihə nədir" sualını verməyə ehtiyac yoxdur — bu fayl artıq oxunub
- Sual ver, fərziyyə qurma — yanlış istiqamətə getmək daha çox token yandırır
- Çoxlu fayl yaratmaq əvəzinə əvvəlcə struktur müzakirə et

## Vacib komandalar

```bash
# Development
pnpm dev              # Frontend + worker birlikdə
pnpm db:migrate       # Drizzle migration-ları işə sal
pnpm db:studio        # Database UI

# Testing
pnpm test             # Unit testlər
pnpm test:e2e         # Playwright E2E

# Production
pnpm build            # Build production
pnpm typecheck        # TypeScript yoxlanışı
pnpm lint             # ESLint + Prettier
```

## Sənəd istinadları

- `docs/architecture.md` — Sistemin yüksək səviyyəli arxitekturası
- `docs/workflow-schema.md` — Workflow JSON sxeması
- `docs/prompt-engineering.md` — LLM prompt-larının yazılma qaydaları
- `docs/integration-guide.md` — Yeni inteqrasiya əlavə etmə qaydası
- `prompts/` — Hər terminal üçün hazır prompt-lar
