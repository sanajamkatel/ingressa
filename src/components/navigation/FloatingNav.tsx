"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { NAV_ITEMS, SITE } from "@/lib/constants";
import { Logo } from "./Logo";
import { NavItem } from "./NavItem";
import { useUnsavedImport } from "./UnsavedImportContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { pendingCount } = useUnsavedImport();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const handleNavigate = (href: string, event: MouseEvent) => {
    if (pendingCount > 0 && href !== pathname) {
      event.preventDefault();
      setPendingHref(href);
    }
  };

  const confirmLeave = () => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between border-b border-border bg-bg-elevated px-4 py-4 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_12px_24px_rgb(var(--shadow-color)/0.08)] sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2"
        aria-label={`${SITE.name} home`}
        onClick={(event) => handleNavigate("/", event)}
      >
        <Logo className="h-6 w-6 text-brand" aria-hidden="true" />
        <span className="text-[15px] font-semibold tracking-[0.12em] text-fg">
          {SITE.name.toUpperCase()}
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <Show when="signed-in">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "h-9 w-9" } }} />
        </Show>
        <Show when="signed-out">
          <Button href="/sign-in" variant="secondary" className="px-4 py-2 text-sm">
            Sign In
          </Button>
        </Show>
        <ThemeToggle />
      </div>

      <div className="mt-2 flex w-full justify-center sm:contents">
        <nav
          aria-label="Primary"
          className="flex items-center divide-x divide-border/60 px-1 sm:absolute sm:left-1/2 sm:top-4 sm:-translate-x-1/2"
        >
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              isActive={pathname === item.href}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>
      </div>

      <Modal isOpen={pendingHref !== null} onClose={() => setPendingHref(null)}>
        <h2 className="text-lg font-semibold text-fg">Leave without importing?</h2>
        <p className="mt-2 text-sm text-fg-muted">
          You have {pendingCount} application{pendingCount === 1 ? "" : "s"} ready to import.
          If you leave now, they won&apos;t be saved.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="primary" onClick={() => setPendingHref(null)}>
            Stay and Import
          </Button>
          <Button variant="ghost" onClick={confirmLeave}>
            Leave Anyway
          </Button>
        </div>
      </Modal>
    </header>
  );
}
