import { SignIn } from "@clerk/nextjs";

export default function SignInPage(): React.JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.12), transparent 55%)",
        }}
      />
      <div className="animate-fade-up">
        <SignIn
          appearance={{
            elements: {
              card: "border border-border-subtle shadow-lg bg-surface",
            },
          }}
        />
      </div>
    </main>
  );
}
