"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_META, SOURCE_LABELS } from "@/lib/application-display";
import { deleteApplication } from "@/lib/applications-actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { EditApplicationModal } from "@/components/applications/EditApplicationModal";
import type { Application } from "@/lib/types";

interface ApplicationsTableProps {
  applications: Application[];
  /** Only true for the real, persisted /applications list — not the import preview,
   * where rows don't exist in the database yet and can't be edited/deleted. */
  editable?: boolean;
}

const EMPTY = <span className="text-fg-subtle">—</span>;

export function ApplicationsTable({ applications, editable = false }: ApplicationsTableProps) {
  const router = useRouter();
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [deletingApplication, setDeletingApplication] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSaved = () => {
    setEditingApplication(null);
    setToastMessage("Application updated.");
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!deletingApplication) return;
    setIsDeleting(true);
    try {
      await deleteApplication(deletingApplication.id);
      setDeletingApplication(null);
      setToastMessage("Application deleted.");
      router.refresh();
    } catch {
      setToastMessage("Couldn't delete that application. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-elevated">
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Company</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Position</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Location</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Salary</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Date Applied</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Status</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Source</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Contact</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Job URL</th>
            <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Notes</th>
            {editable && (
              <th className="whitespace-nowrap px-5 py-3 font-medium text-fg-subtle">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const status = application.status ? STATUS_META[application.status] : null;
            return (
              <tr key={application.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-5 py-3 font-medium text-fg">
                  {application.company ?? EMPTY}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-fg-muted">
                  {application.position ?? EMPTY}
                </td>
                <td className="px-5 py-3 text-fg-muted">{application.location ?? EMPTY}</td>
                <td className="px-5 py-3 text-fg-muted">{application.salary ?? EMPTY}</td>
                <td className="px-5 py-3 text-fg-muted">{application.dateApplied ?? EMPTY}</td>
                <td className="px-5 py-3">
                  {status ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                  ) : (
                    EMPTY
                  )}
                </td>
                <td className="px-5 py-3 text-fg-muted">
                  {application.source ? SOURCE_LABELS[application.source] : EMPTY}
                </td>
                <td className="px-5 py-3 text-fg-muted">
                  {application.contactName || application.contactEmail ? (
                    <div>
                      {application.contactName && <div>{application.contactName}</div>}
                      {application.contactEmail && (
                        <div className="text-xs text-fg-subtle">{application.contactEmail}</div>
                      )}
                    </div>
                  ) : (
                    EMPTY
                  )}
                </td>
                <td className="max-w-[160px] px-5 py-3">
                  {application.jobUrl ? (
                    <a
                      href={application.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-brand hover:underline"
                      title={application.jobUrl}
                    >
                      {application.jobUrl}
                    </a>
                  ) : (
                    EMPTY
                  )}
                </td>
                <td className="max-w-[200px] px-5 py-3 text-fg-muted">
                  {application.notes ? (
                    <span className="block truncate" title={application.notes}>
                      {application.notes}
                    </span>
                  ) : (
                    EMPTY
                  )}
                </td>
                {editable && (
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingApplication(application)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingApplication(application)}
                        className="text-xs font-medium text-accent-coral hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {editable && (
        <>
          <EditApplicationModal
            application={editingApplication}
            onClose={() => setEditingApplication(null)}
            onSaved={handleSaved}
          />

          <Modal isOpen={deletingApplication !== null} onClose={() => setDeletingApplication(null)}>
            <h2 className="text-lg font-semibold text-fg">Delete this application?</h2>
            <p className="mt-2 text-sm text-fg-muted">
              {deletingApplication?.company ?? "This application"} —{" "}
              {deletingApplication?.position ?? "Untitled role"} will be permanently removed. This
              can&apos;t be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeletingApplication(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </Modal>

          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        </>
      )}
    </div>
  );
}
