"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, Workflow as WorkflowIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workflows/new", label: "Yeni workflow", icon: Plus },
];

export function Sidebar(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border-subtle bg-surface md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-border-subtle px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <WorkflowIcon className="size-4" strokeWidth={2.5} />
        </div>
        <span className="font-semibold tracking-tight">Flow</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium",
                "transition-colors duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-hover hover:text-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
                />
              )}
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-subtle px-5 py-3 text-[11px] text-muted-foreground">
        v0.1 · prerelease
      </div>
    </aside>
  );
}
