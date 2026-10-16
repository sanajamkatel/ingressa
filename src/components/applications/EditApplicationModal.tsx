"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { updateApplication } from "@/lib/applications-actions";
import { STATUS_META, SOURCE_LABELS } from "@/lib/application-display";
import type { Application, ApplicationStatus, ApplicationSource } from "@/lib/types";

const STATUS_OPTIONS = Object.keys(STATUS_META) as ApplicationStatus[];
const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS) as ApplicationSource[];

interface FormState {
  id: string;
  company: string;
  position: string;
  location: string;
  salary: string;
  dateApplied: string;
  status: ApplicationStatus | "";
  source: ApplicationSource | "";
  contactName: string;
  contactEmail: string;
  jobUrl: string;
  notes: string;
}

function toFormState(app: Application): FormState {
  return {
    id: app.id,
    company: app.company ?? "",
    position: app.position ?? "",
    location: app.location ?? "",
    salary: app.salary ?? "",
    dateApplied: app.dateApplied ?? "",
    status: app.status ?? "",
    source: app.source ?? "",
    contactName: app.contactName ?? "",
    contactEmail: app.contactEmail ?? "",
    jobUrl: app.jobUrl ?? "",
    notes: app.notes ?? "",
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-fg-muted">
      {label}
      {children}
    </label>
  );
}

interface EditApplicationModalProps {
  application: Application | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditApplicationModal({ application, onClose, onSaved }: EditApplicationModalProps) {
  const [form, setForm] = useState<FormState | null>(application ? toFormState(application) : null);
  const [openForId, setOpenForId] = useState<string | null>(application?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync local form state whenever a different (or newly opened) application comes in.
  if (application && application.id !== openForId) {
    setForm(toFormState(application));
    setOpenForId(application.id);
    setError(null);
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!application || !form) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateApplication(application.id, {
        company: nullableText(form.company),
        position: nullableText(form.position),
        location: nullableText(form.location),
        salary: nullableText(form.salary),
        jobUrl: nullableText(form.jobUrl),
        dateApplied: nullableText(form.dateApplied),
        status: form.status === "" ? null : form.status,
        source: form.source === "" ? null : form.source,
        contactName: nullableText(form.contactName),
        contactEmail: nullableText(form.contactEmail),
        notes: nullableText(form.notes),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={application !== null} onClose={onClose} maxWidthClassName="max-w-xl">
      {form && (
        <>
          <h2 className="text-lg font-semibold text-fg">Edit application</h2>

          <div className="mt-4 grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            <Field label="Company">
              <input
                className={inputClass}
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
              />
            </Field>
            <Field label="Position">
              <input
                className={inputClass}
                value={form.position}
                onChange={(e) => update("position", e.target.value)}
              />
            </Field>
            <Field label="Location">
              <input
                className={inputClass}
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </Field>
            <Field label="Salary">
              <input
                className={inputClass}
                value={form.salary}
                onChange={(e) => update("salary", e.target.value)}
              />
            </Field>
            <Field label="Date applied">
              <input
                className={inputClass}
                value={form.dateApplied}
                onChange={(e) => update("dateApplied", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => update("status", e.target.value as ApplicationStatus | "")}
              >
                <option value="">—</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select
                className={inputClass}
                value={form.source}
                onChange={(e) => update("source", e.target.value as ApplicationSource | "")}
              >
                <option value="">—</option>
                {SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>
                    {SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Job URL">
              <input
                className={inputClass}
                value={form.jobUrl}
                onChange={(e) => update("jobUrl", e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Contact name">
              <input
                className={inputClass}
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
              />
            </Field>
            <Field label="Contact email">
              <input
                className={inputClass}
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-accent-coral">{error}</p>}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
