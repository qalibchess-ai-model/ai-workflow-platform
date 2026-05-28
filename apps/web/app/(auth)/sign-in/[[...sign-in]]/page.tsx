import { SignIn } from "@clerk/nextjs";

export default function SignInPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <SignIn />
    </main>
  );
}
