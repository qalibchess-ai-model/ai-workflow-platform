# Monorepo Setup (Terminal A — bir dəfə işlədilir)

## Sənin rolun
Sən Senior Full-Stack Developer-sən. Monorepo qurursan ki, beş paralel terminalda komandanın işləyə bilsin. Sürət vacibdir, amma daha vacibi — strukturun digər terminallarla konflikt yaratmamasıdır.

## Tapşırıq
Bu layihə üçün boş monorepo skeleti qur. Heç bir biznes məntiqi yazma — yalnız struktur, konfiqurasiya və "Hello World" səviyyəsində setup.

## Əvvəlcə oxu
1. `@CLAUDE.md` — layihənin tam mənzərəsi
2. `@.claude/skills/` qovluğundakı bütün SKILL.md faylları (yalnız metadata kifayətdir — adlarını oxu)

## Konkret addımlar

### 1. Monorepo başlatma
```bash
# pnpm workspace istifadə et (Turbo-dan ucuz və sadə)
pnpm init
```

`package.json`-a əlavə et:
```json
{
  "name": "ai-workflow-platform",
  "private": true,
  "packageManager": "pnpm@9.x"
}
```

`pnpm-workspace.yaml` yarat:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 2. Apps və packages qovluqlarını yarat

```
apps/
├── web/              # Next.js 15
└── worker/           # Hono + Inngest worker

packages/
├── db/               # Drizzle ORM
├── ai/               # LLM logic
├── workflow/         # Execution engine
├── integrations/     # Third-party APIs
├── ui/               # Shared React components
└── config/           # ESLint, TS configs paylaşılan
```

### 3. Hər apps/package üçün

- `package.json` minimal (name, version, scripts)
- `tsconfig.json` `@config/typescript` extend etsin
- `apps/web/` üçün: `pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`
- `apps/worker/` üçün: Hono + Inngest minimal setup

### 4. Paylaşılan config-lər

`packages/config/`:
- `eslint-base.js` — TypeScript strict, no-explicit-any, ...
- `tsconfig.base.json` — strict mode, target ES2022, paths
- `prettier.config.js`

### 5. Root scripts

`package.json`-a:
```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  }
}
```

### 6. Git və initial commit

`.gitignore`:
```
node_modules/
.next/
.turbo/
*.log
.env
.env.local
dist/
coverage/
.vercel/
```

`.env.example` (heç bir real key yoxdur):
```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
CLERK_SECRET_KEY=sk_test_...
INNGEST_EVENT_KEY=...
NANGO_SECRET_KEY=...
```

### 7. README.md (top level)
Qısa: layihə nədir, necə başlamaq, hansı terminalda nə işləyir.

## Etmə (DO NOT)
- Biznes məntiqi yazma — yalnız setup
- Real API key-lər .env-də olmamalıdır
- Turborepo əlavə etmə (sadə pnpm workspace kifayətdir bu mərhələdə)
- Docker compose qurma — yox lazımdır indi
- Database schema yazma — Terminal B-də

## Bitirdiyini necə bilirsən
- [ ] `pnpm install` xətasız işləyir
- [ ] `pnpm dev` hər iki app-i işə salır (web localhost:3000, worker localhost:8787)
- [ ] `pnpm typecheck` keçir bütün package-lərdə
- [ ] `pnpm lint` keçir
- [ ] Git status təmiz (initial commit edilmiş)

## Yekun
İş bitəndə bunu çap et:
1. Yaradılmış struktur (`tree -L 3 -I node_modules`)
2. Hansı port-larda nə işləyir
3. Növbəti addım hər terminal üçün (hansı prompt fayl-ı işlədilməlidir)
