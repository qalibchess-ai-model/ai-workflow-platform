# Claude Code Prompts Library

Bu qovluq hər paralel terminal üçün hazırlanmış prompt-ları saxlayır. Hər prompt **bir konkret tapşırığa** fokuslanır və **token qənaət edilmiş şəkildə** yazılıb.

## İstifadə qaydası

### Paralel terminallar strategiyası

5 ayrı terminal aç və hər birinə Claude Code-u işə sal. Hər terminal bir konkret sahəyə fokuslanır:

| Terminal | Adı | Sahə | İlk prompt |
|----------|-----|------|------------|
| **A** | Frontend | UI, React Flow, dashboard | `01-frontend-init.md` |
| **B** | Workflow Engine | Inngest, backend, execution | `02-engine-init.md` |
| **C** | AI Generation | LLM, prompts, validation | `03-ai-init.md` |
| **D** | Integrations | Nango, MCP, OAuth | `04-integrations-init.md` |
| **E** | Testing & DevOps | Test infrastructure, CI/CD | `05-testing-init.md` |

### Hər terminalda ilk addım

```
@CLAUDE.md fayl-ı və @.claude/skills/<uyğun-skill>/SKILL.md fayl-ı oxu.
Sonra `prompts/<terminal-nömrəsi>-<task>.md` fayl-ını oxu və işə başla.
```

## Prompt yazma prinsipləri (Senior Prompt Engineer notları)

Bu prompt-lar bu prinsiplərə əsasən yazılıb:

### 1. Kontekst sərhədləri aydındır
Hər prompt-da:
- **Sən kimsən** (role)
- **Sənin tapşırığın nədir** (task)
- **Hansı kontekst var** (constraints, files to read)
- **Nəticə nə olmalıdır** (success criteria)

### 2. Yox-action-ları aydındır
"Bunu et" qədər vacib olan "bunu etmə"dir. Hər prompt-da DON'T bölməsi var.

### 3. Konkret addımlar
Vague "bunu işlə" əvəzinə nömrələnmiş checklist. Claude Code bu checklist-i izləyəcək.

### 4. Self-verification
Hər prompt sonunda Claude-dan öz işini yoxlamasını istəyirik. Bu, ikinci roundtrip-i azaldır.

### 5. Skill-lərə referans
Detallı izahı SKILL.md fayllarına buraxırıq. Prompt-da yalnız "uyğun skill-i istifadə et" deyirik.

## Prompt-lar siyahısı

### Setup mərhələsi (bir dəfə işlədilir)
- `00-monorepo-setup.md` — Layihə skeletini yarat (Terminal A-da işlə)

### Terminal A: Frontend
- `01-frontend-init.md` — Next.js + shadcn setup
- `a1-workflow-editor.md` — React Flow editor komponenti
- `a2-dashboard-pages.md` — Dashboard səhifələri
- `a3-prompt-input.md` — Prompt-dan workflow yaratma UI

### Terminal B: Workflow Engine
- `02-engine-init.md` — Inngest setup, worker service
- `b1-execution-engine.md` — Core execution loop
- `b2-state-management.md` — State persistence
- `b3-node-handlers.md` — Built-in node handler-lər

### Terminal C: AI Generation
- `03-ai-init.md` — Anthropic SDK, Langfuse setup
- `c1-prompt-to-workflow.md` — Əsas generation logic
- `c2-validation-layer.md` — Output validation və self-correction
- `c3-prompt-versioning.md` — Prompt versioning sistemi

### Terminal D: Integrations
- `04-integrations-init.md` — Nango setup, OAuth
- `d1-gmail-integration.md` — İlk inteqrasiya (referans)
- `d2-slack-integration.md` — İkinci inteqrasiya
- `d3-mcp-client.md` — MCP client implementation

### Terminal E: Testing & DevOps
- `05-testing-init.md` — Vitest, Playwright setup
- `e1-ci-pipeline.md` — GitHub Actions
- `e2-monitoring.md` — Sentry, Langfuse, PostHog
- `e3-deployment.md` — Vercel + Railway deployment

## Workflow nümunəsi

```
Bazar ertəsi səhəri:
1. 5 terminal aç
2. Hər birində: claude code
3. Terminal A-da: "00-monorepo-setup.md işlə" (15-30 dəq)
4. Setup hazır olanda git commit + push
5. Digər terminallar pull edib öz setup prompt-larını işləyir paralel
6. Hər prompt bitəndən sonra PR aç, review et, merge
7. Növbəti prompt-a keç
```

## Token qənaəti taktikaları

1. **Skill-ləri istifadə et** — Claude Code skill-i avtomatik oxuyur, hər dəfə izah yazma
2. **Konkret fayl referansları** — "auth-u düzəlt" əvəzinə "app/api/auth/route.ts düzəlt"
3. **Kiçik PR-lar** — bir prompt bir feature, sonra cleanup
4. **`@file` syntax** — context-ə fayl əlavə et, Claude oxusun, sonra prompt
5. **Plan mode** — kompleks tapşırıqlarda əvvəlcə plan istə, sonra execute
6. **Compact konteksti** — uzun sessiyalarda `/compact` istifadə et
