"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

interface SyncResponse {
  newApplications: number;
  updatedApplications: number;
  skippedDuplicates: number;
  error?: string;
}

function formatSyncSummary(result: SyncResponse): string {
  const parts: string[] = [];
  if (result.newApplications > 0) parts.push(`${result.newApplications} new`);
  if (result.updatedApplications > 0) parts.push(`${result.updatedApplications} updated`);

  if (parts.length === 0) return "Gmail sync complete — nothing new found.";
  return `Gmail sync: ${parts.join(", ")}.`;
}

export function SyncGmailButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync/gmail", { method: "POST" });
      const data: SyncResponse = await response.json();

      if (!response.ok) {
        setToastMessage(data.error ?? "Gmail sync failed. Try again.");
        return;
      }

      setToastMessage(formatSyncSummary(data));
      // The Server Component on this route already re-fetches from Prisma on every
      // render — the gap is Next.js's client-side Router Cache serving the previous
      // RSC payload on a soft navigation. router.refresh() invalidates that cache for
      // the current route and re-runs the server render in place, without losing
      // client-side state (unlike a full reload).
      router.refresh();
    } catch {
      setToastMessage("Gmail sync failed. Check your connection and try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? "Syncing…" : "Sync Gmail"}
      </Button>
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </>
  );
}
