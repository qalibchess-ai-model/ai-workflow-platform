# Claude Code ilə Layihə Yol Xəritəsi

> Bu sənəd sənin əsas referansındır. Sən komandanı idarə edən product owner-sən — Claude Code instansları sənin developer-lərindir.

## Strateji baxış

Sən beş paralel Claude Code instansı işlədəcəksən, hər biri ayrı terminal-da. Bu yanaşmanın üstünlükləri:

1. **Sürət** — bir nəfərin işlədiyindən 4-5 dəfə tez gedirsən
2. **İzolyasiya** — bir terminalın səhvi digərini bloklamır
3. **Klassifikasiya** — hər terminal bir sahənin "mütəxəssisi" olur
4. **Token qənaəti** — hər terminal yalnız öz konteksini saxlayır

Bu, real-world software development-də senior developer-in 4-5 junior developer-i koordinasiya etməsinə bənzəyir.

## Setup (bir dəfə işləyir)

### Addım 1: Lokal mühit
- Node.js 20+ quraşdır
- pnpm 9+ quraşdır: `npm i -g pnpm`
- Git və GitHub CLI quraşdır
- Claude Code quraşdır: `npm i -g @anthropic-ai/claude-code`

### Addım 2: Layihə fayllarını qoy
Bu sənədlə bərabər gələn fayllar:
```
ai-workflow-platform/
├── CLAUDE.md                      # Layihənin əsas yaddaşı
├── .claude/
│   └── skills/                    # 5 custom skill
│       ├── workflow-engine/
│       ├── ai-generation/
│       ├── frontend-ui/
│       ├── integrations/
│       └── testing/
├── prompts/                       # Hər tapşırıq üçün hazır prompt
│   ├── README.md
│   ├── 00-monorepo-setup.md
│   ├── 01-frontend-init.md
│   ├── 02-engine-init.md
│   ├── 03-ai-init.md
│   ├── 04-integrations-init.md
│   └── 05-testing-init.md
└── docs/
    └── roadmap.md                 # Bu fayl
```

### Addım 3: GitHub repo
- Boş repo yarat
- Yuxarıdakı strukturu push et
- Branch protection qur (`main` üçün PR review tələb)

### Addım 4: Hesab açılışları (paralel et)
- [ ] Vercel hesabı (frontend hosting)
- [ ] Neon hesabı (PostgreSQL)
- [ ] Clerk hesabı (auth)
- [ ] Inngest hesabı (workflow engine)
- [ ] Anthropic Console (API key)
- [ ] Langfuse hesabı (observability) və ya self-host
- [ ] Nango hesabı (inteqrasiyalar)
- [ ] Upstash hesabı (Redis)
- [ ] Sentry hesabı (xətalar)
- [ ] PostHog hesabı (analytics)

Bütün API key-ləri 1Password və ya oxşar password manager-də saxla.

## İcra fazası

### Faza 1: İlkin setup (1-ci gün)

**Yalnız Terminal A**:
1. `cd ai-workflow-platform && claude`
2. Prompt: "prompts/00-monorepo-setup.md fayl-ını oxu və işlə"
3. Claude monorepo skeletini quracaq
4. Bitəndə git commit + push

**Müddət**: 30-60 dəqiqə

### Faza 2: Paralel init (1-2-ci gün)

5 terminal aç:

```bash
# Terminal A
cd ai-workflow-platform && claude
# Prompt: "prompts/01-frontend-init.md fayl-ını oxu və işlə"

# Terminal B (yeni terminal)
cd ai-workflow-platform && git pull && claude
# Prompt: "prompts/02-engine-init.md fayl-ını oxu və işlə"

# Terminal C
cd ai-workflow-platform && git pull && claude
# Prompt: "prompts/03-ai-init.md fayl-ını oxu və işlə"

# Terminal D
cd ai-workflow-platform && git pull && claude
# Prompt: "prompts/04-integrations-init.md fayl-ını oxu və işlə"

# Terminal E
cd ai-workflow-platform && git pull && claude
# Prompt: "prompts/05-testing-init.md fayl-ını oxu və işlə"
```

**Vacib**: hər terminal öz feature branch-ında işləsin:
```
feat/frontend-init
feat/engine-init
feat/ai-init
feat/integrations-init
feat/testing-init
```

PR-ları ardıcıl merge et — testing init birinci, sonra digərləri.

**Müddət**: 2-4 saat hər terminal (paralel olduğu üçün toplam 4 saat)

### Faza 3: Real funksionallıq (3-7-ci gün)

Setup bitəndən sonra, hər terminal öz növbəti prompt-una keçir:

| Terminal | Növbəti prompt-lar |
|----------|-------------------|
| A | a1-workflow-editor → a2-dashboard-pages → a3-prompt-input |
| B | b1-execution-engine → b2-state-management → b3-node-handlers |
| C | c1-prompt-to-workflow → c2-validation-layer → c3-prompt-versioning |
| D | d1-gmail-integration → d2-slack-integration → d3-mcp-client |
| E | e1-ci-pipeline → e2-monitoring → e3-deployment |

Bu prompt-ları lazım olduqda sənin üçün hazırlayacağam. İndi yalnız init prompt-ları kifayətdir.

## Hər gün workflow-un

### Səhər (15 dəq)
1. Hər terminal-da `git pull`
2. Dünənki commit-ləri review et
3. Bu gün hər terminal-da nə işlənəcək — bunu yaz

### İş zamanı
1. Hər terminala "növbəti prompt-u işlə" deyirsən
2. Claude işləyir — sən digər terminala keçirsən
3. Bir terminal sual verirsə — cavabla, davam etsin
4. Bir terminal block olubsa — context-i təmizlə (`/clear`) və ya yeni session

### Axşam (15 dəq)
1. Bütün terminallarda `pnpm test`, `pnpm typecheck`
2. Yaşıl olanları commit + push + PR
3. PR-ları review et və merge et

## Klassifikasiya strategiyası

Hər terminal **fərqli rəng/icon** ilə işarələnsin, qarışmasın:

- Terminal A — Frontend → 🎨 Mavi
- Terminal B — Engine → ⚙️ Yaşıl
- Terminal C — AI → 🧠 Bənövşəyi
- Terminal D — Integrations → 🔌 Narıncı
- Terminal E — DevOps → 🛠️ Qırmızı

Terminal app-də (iTerm2, Warp, və s.) hər terminala xüsusi profil ver — rəng və ad. Beləliklə hansı terminalda olduğunu bir nəzərdə görürsən.

## Token qənaət strategiyaları

### 1. Skill-lərə güvən
Hər prompt-da konkret skill istinad olunub. Claude Code skill-i yalnız bir dəfə oxuyur, sonra cache-də saxlayır. Detallı izahları skill-də yaz, prompt-da qısa "skill-i istifadə et" de.

### 2. CLAUDE.md-ni yenilə
Layihə inkişaf etdikcə yeni qaydalar yarana bilər. Onları `CLAUDE.md`-yə əlavə et — hər terminal avtomatik oxuyacaq.

### 3. Plan mode
Kompleks tapşırıqlarda Claude-dan əvvəlcə plan istə:
```
Plan mode-a keç. Bu tapşırıq üçün addım-addım plan yaz, kod yazma.
```

Plan razılaşdıqdan sonra:
```
İndi planı icra et.
```

Bu, yanlış istiqamətə getmənin qarşısını alır.

### 4. Compact context
Uzun sessiyalarda:
```
/compact
```
Claude öz konteksini sıxır, vacib məlumatı saxlayır, qalanları atır.

### 5. Yeni session aç
Yeni feature-ə başlayanda yeni session aç — köhnə kontekst lazım deyilsə. CLAUDE.md və skill-lər avtomatik yenidən yüklənəcək.

### 6. @file referansları
"auth.ts faylına bax" əvəzinə "`@apps/web/lib/auth.ts` fayl-ını oxu" yaz. Bu daha effektivdir.

## Prompt yazma qaydaları (sən özün prompt yazanda)

### Pis prompt:
```
Login səhifəsini düzəlt.
```

### Yaxşı prompt:
```
@apps/web/app/(auth)/sign-in/page.tsx faylında Clerk-in SignIn komponentini
istifadə et. Stil shadcn/ui-yə uyğun olsun. Dark mode dəstəyi vacibdir.
Test üçün `e2e/auth.spec.ts` yarat. frontend-ui skill-i izlə.
```

Fərq:
- Konkret fayl yolu
- Hansı kitabxana
- Hansı stil
- Hansı test
- Hansı skill

## Risklər və azaltma

### Risk 1: Terminallar arası konflikt
**Səbəb**: İki terminal eyni faylda işləsə.
**Azaltma**: Hər terminalın "öz" qovluğu var (apps/, packages/). Cross-cutting dəyişikliklər (CLAUDE.md, root configs) yalnız bir terminalda et.

### Risk 2: Claude yanlış istiqamətə gedir
**Səbəb**: Prompt qeyri-dəqiq və ya yanlış kontekst.
**Azaltma**: Plan mode istifadə et. Şübhəli görünəndə dayandır, sual ver: "Niyə bunu belə edirsən?"

### Risk 3: Token israfı
**Səbəb**: Hər prompt-da uzun izahlar.
**Azaltma**: Skill-lərə güvən. CLAUDE.md-i optimallaşdır. Köhnə chat-ləri compact et.

### Risk 4: Test debt
**Səbəb**: "Sonra yazaram" deyə testlər atlanır.
**Azaltma**: Hər prompt-da test tələbi var. Skip etmə.

### Risk 5: Sənin yorulman
**Səbəb**: 5 terminal idarə etmək yorucudur.
**Azaltma**: Gündə 4-6 saat işlə, daha çox yox. Hər saat 5 dəq fasilə. Pomodoro texnikası.

## Uğur ölçüsü

İlk həftə sonu sahib olmalısan:
- [ ] İşləyən monorepo
- [ ] Frontend skeleti (login, dashboard, boş workflow editor)
- [ ] Workflow engine işləyir (noop node-u execute edir)
- [ ] AI generation foundation hazır
- [ ] Bir test inteqrasiya (noop)
- [ ] CI yaşıl
- [ ] İlk PR-lar merge edilib

İkinci həftə sonu:
- [ ] Prompt-dan workflow generation işləyir end-to-end
- [ ] Real bir inteqrasiya (Gmail və ya Slack)
- [ ] Workflow editor-də manual düzəliş etmək olur
- [ ] İlk müştəri demo göstərə bilərsən

Üçüncü-dördüncü həftə:
- [ ] 3-5 inteqrasiya
- [ ] Production deployment
- [ ] İlk 3-5 pilot istifadəçi

## Yardım lazım olanda

Bu sənəddə hər şey yoxdursa, mənə qayıt. Konkret bir prompt yazılması, debugging, və ya strateji məsələdə kömək edə bilərəm.

Hazırsan? Birinci addım — bu faylları layihə qovluğuna kopyala, GitHub-a push et, sonra Terminal A-da başla.
