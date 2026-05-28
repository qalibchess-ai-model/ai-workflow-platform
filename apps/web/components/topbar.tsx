import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar(): React.JSX.Element {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border-subtle bg-background px-6">
      <OrganizationSwitcher
        hidePersonal
        afterSelectOrganizationUrl="/dashboard"
        afterCreateOrganizationUrl="/dashboard"
        appearance={{
          elements: {
            organizationSwitcherTrigger:
              "rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-[13px] hover:bg-hover transition-colors",
          },
        }}
      />
      <ThemeToggle />
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "size-8 ring-1 ring-border-subtle",
          },
        }}
      />
    </header>
  );
}
