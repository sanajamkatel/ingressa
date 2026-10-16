"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ApplicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Failed to load applications:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 pb-20 pt-28 text-center sm:pt-32">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        Couldn&apos;t load your applications
      </h1>
      <p className="mt-2 max-w-sm text-fg-muted">
        Something went wrong while fetching your tracker. This is usually temporary.
      </p>
      <div className="mt-8">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
