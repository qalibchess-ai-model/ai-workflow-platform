import Link from "next/link";
import { ArrowRight, Sparkles, Workflow, Zap } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Təbii dildə yaz",
    desc: "Bir cümlə yaz, AI workflow-u qurub vizual redaktorda göstərsin.",
  },
  {
    icon: Workflow,
    title: "Vizual redaktor",
    desc: "React Flow ilə node-ları çək, params-ları dəyiş.",
  },
  {
    icon: Zap,
    title: "Inngest-də icra",
    desc: "Durable workflow engine — retry, state, schedule hamısı daxili.",
  },
];

export default function Home(): React.JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.15), transparent 50%), radial-gradient(circle at 80% 60%, hsl(var(--primary) / 0.08), transparent 45%)",
        }}
      />

      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Workflow className="size-4" strokeWidth={2.5} />
          </div>
          <span className="font-semibold tracking-tight">Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <SignedIn>
            <Button asChild size="sm">
              <Link href="/dashboard">
                Dashboard
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </SignedIn>
          <SignedOut>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Daxil ol</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Başla</Link>
            </Button>
          </SignedOut>
        </div>
      </nav>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center stagger">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          AI-powered workflow automation
        </div>

        <h1 className="mt-6 text-[clamp(40px,6vw,64px)] font-semibold leading-[1.05] tracking-tight">
          Workflow-u <span className="text-primary">danış</span>,
          <br />
          biz qururuq.
        </h1>

        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Təbii dildə təsvir verin, AI strukturlaşdırılmış workflow qursun, Inngest-də icra olunsun.
          Heç bir kod yazmadan avtomatlaşdırma.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <SignedIn>
            <Button asChild size="lg">
              <Link href="/dashboard">
                Dashboard-a keç
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </SignedIn>
          <SignedOut>
            <Button asChild size="lg">
              <Link href="/sign-up">
                Pulsuz başla
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/sign-in">Daxil ol</Link>
            </Button>
          </SignedOut>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1100px] gap-4 px-6 pb-24 stagger md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-lg border border-border-subtle bg-surface p-6 transition-colors hover:border-border"
          >
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4.5" />
            </div>
            <h3 className="mt-4 text-h3 font-semibold">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
