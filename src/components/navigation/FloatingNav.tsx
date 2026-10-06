"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SITE } from "@/lib/constants";
import { NavItem } from "./NavItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function FloatingNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between px-4 pt-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2" aria-label={`${SITE.name} home`}>
        <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
        <span className="text-[15px] font-semibold tracking-[0.12em] text-fg">
          {SITE.name.toUpperCase()}
        </span>
      </Link>

      <ThemeToggle />

      <div className="mt-2 flex w-full justify-center sm:contents">
        <nav
          aria-label="Primary"
          className="flex items-center divide-x divide-border/60 rounded-full border border-border bg-bg-elevated/80 px-1 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_12px_24px_rgb(var(--shadow-color)/0.08)] backdrop-blur-md sm:absolute sm:left-1/2 sm:top-4 sm:-translate-x-1/2"
        >
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.key} item={item} isActive={pathname === item.href} />
          ))}
        </nav>
      </div>
    </header>
  );
}
