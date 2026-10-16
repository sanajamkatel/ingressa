"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { getApplications, clearApplications } from "@/lib/applications-actions";

export default function SettingsPage() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    getApplications().then((applications) => setCount(applications.length));
  }, []);

  const handleConfirmClear = async () => {
    await clearApplications();
    setIsConfirmOpen(false);
    setCount(0);
    setToastMessage("Tracker successfully cleared.");
    setTimeout(() => router.push("/applications"), 1200);
  };

  return (
    <main className="min-h-screen px-6 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Settings</h1>
        <p className="mt-2 text-fg-muted">Manage your Ingressa data.</p>

        <div className="mt-10 rounded-2xl border border-accent-coral/50 bg-accent-coral-soft/60 backdrop-blur-md p-6">
          <h2 className="text-lg font-semibold text-fg">Danger Zone</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {count === null
              ? "Loading…"
              : `You currently have ${count} tracked application${count === 1 ? "" : "s"}.`}
          </p>
          <div className="mt-5">
            <Button
              variant="danger"
              onClick={() => setIsConfirmOpen(true)}
              disabled={count === null || count === 0}
            >
              Clear Tracker
            </Button>
          </div>
        </div>
      </Container>

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <h2 className="text-lg font-semibold text-fg">
          Are you sure you want to clear your tracker?
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          This will permanently delete all {count ?? 0} tracked application
          {count === 1 ? "" : "s"}. This action cannot be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => setIsConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmClear}>
            Yes, Delete Everything
          </Button>
        </div>
      </Modal>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </main>
  );
}
