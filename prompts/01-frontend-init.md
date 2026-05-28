# Terminal A — Frontend Init

## Sənin rolun
Sən Senior Frontend Engineer-sən. Next.js 15, React Flow və shadcn/ui ilə yüksək keyfiyyətli UI qurursan. Hər komponent accessible, performant və type-safe olmalıdır.

## Tapşırıq
`apps/web/` daxilində frontend infrastructure-i qur. Heç bir mürəkkəb biznes UI yazma — yalnız əsas layout, auth integration, və ilk dashboard skeleti.

## Əvvəlcə oxu
1. `@CLAUDE.md`
2. `@.claude/skills/frontend-ui/SKILL.md` (TAM oxu — bu sənin işləyəcəyin sahənin qaydalarıdır)

## Konkret addımlar

### 1. Dependencies
```bash
cd apps/web
pnpm add @clerk/nextjs @xyflow/react @tanstack/react-query
pnpm add lucide-react clsx tailwind-merge class-variance-authority
pnpm add react-hook-form @hookform/resolvers zod
pnpm add -D @types/node
```

### 2. shadcn/ui setup
```bash
npx shadcn@latest init -d
npx shadcn@latest add button card dialog form input label textarea
npx shadcn@latest add dropdown-menu avatar separator skeleton toast
npx shadcn@latest add command sheet tabs
```

### 3. Clerk auth integration

`middleware.ts` (root):
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/dashboard(.*)", "/api/workflows(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

`app/layout.tsx`-ni Clerk Provider ilə wrap et.

### 4. Layout strukturu

```
app/
├── (auth)/                    # Public route group
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── (dashboard)/               # Protected route group
│   ├── layout.tsx             # Sidebar + topbar
│   ├── dashboard/
│   │   └── page.tsx           # Workflow list
│   ├── workflows/
│   │   ├── new/page.tsx       # New workflow (prompt input)
│   │   └── [id]/page.tsx      # Workflow editor
│   ├── runs/
│   │   └── page.tsx           # Execution history
│   ├── integrations/
│   │   └── page.tsx           # Connected services
│   └── settings/page.tsx
├── layout.tsx                 # Root with ClerkProvider
└── page.tsx                   # Landing
```

### 5. Komponent strukturu

```
components/
├── ui/                        # shadcn (auto-generated)
├── layout/
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   └── workspace-switcher.tsx
├── workflow/
│   ├── workflow-editor.tsx    # Sonra Terminal A2-də doldur
│   └── nodes/                 # Boş qovluq indi
└── shared/
    └── empty-state.tsx
```

Indi sadə placeholder-lar yarat — "Coming soon" mətni ilə. Real funksionallıq sonrakı prompt-larda gələcək.

### 6. Theme və dark mode

```bash
pnpm add next-themes
```

`components/theme-provider.tsx` yarat və `app/layout.tsx`-də istifadə et.

### 7. Utility lib-lər

`lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`lib/fetcher.ts` — TanStack Query üçün generic fetcher.

### 8. Test edək

```bash
pnpm dev
```

- [ ] `/` landing göstərilir
- [ ] `/sign-in` Clerk auth UI göstərilir
- [ ] Login sonrası `/dashboard` açılır
- [ ] Sidebar göstərilir, navigation işləyir
- [ ] Dark mode toggle işləyir
- [ ] `pnpm typecheck` keçir
- [ ] `pnpm lint` keçir

## Etmə (DO NOT)
- React Flow node-larını indi qurma — A1 prompt-da
- Real data fetching yazma — placeholder mətnlər
- API route-lar yazma (yalnız frontend bu mərhələdə)
- Dashboard-da kompleks tarcrü qrafiklər — sadə list kifayətdir
- Tailwind config-i təkər kimi yenidən kəşf etmə — shadcn-ə güvən

## Yaddaş üçün

Hər komponent yaradanda öz-özündən soruş:
1. Bu Server Component ola bilərmi? (default: bəli)
2. `"use client"` HƏQİQƏTƏN lazımdırmı?
3. shadcn-də artıq bu komponent varmı?
4. Type-safe-dir? (no `any`)
5. Dark mode dəstəkləyirmi?

## Yekun
Bitəndə git commit, push, sonra `a1-workflow-editor.md` prompt-una keç.
