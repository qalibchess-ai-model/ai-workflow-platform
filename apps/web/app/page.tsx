import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function Home(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">AI Workflow Platform</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Təbii dildə təsvir verin, AI struktur workflow qursun, Inngest-də icra olunsun.
        </p>
      </div>
      <div className="flex gap-3">
        <SignedIn>
          <Button asChild size="lg">
            <Link href="/dashboard">Dashboard-a keç</Link>
          </Button>
        </SignedIn>
        <SignedOut>
          <Button asChild size="lg">
            <Link href="/sign-in">Daxil ol</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-up">Qeydiyyat</Link>
          </Button>
        </SignedOut>
      </div>
    </main>
  );
}
