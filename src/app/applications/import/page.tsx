"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { UploadDropzone } from "@/components/applications/UploadDropzone";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { parseApplicationsFile } from "@/lib/excel-parser";
import { importApplications } from "@/lib/applications-actions";
import { useUnsavedImport } from "@/components/navigation/UnsavedImportContext";
import type { Application } from "@/lib/types";
import type { DeduplicationStats } from "@/lib/deduplication";

type Step = "upload" | "preview";

function formatImportSummary(stats: DeduplicationStats): string {
  const parts: string[] = [];
  if (stats.newCount > 0) parts.push(`${stats.newCount} new`);
  if (stats.updatedCount > 0) parts.push(`${stats.updatedCount} updated`);
  if (stats.skippedCount > 0) {
    parts.push(`${stats.skippedCount} duplicate${stats.skippedCount === 1 ? "" : "s"} skipped`);
  }
  return parts.length > 0 ? `Imported: ${parts.join(", ")}.` : "Nothing new to import.";
}

export default function ImportPage() {
  const router = useRouter();
  const { setPendingCount } = useUnsavedImport();
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<Application[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Flag unimported, previewed rows so the nav can warn before navigating away.
  useEffect(() => {
    setPendingCount(step === "preview" ? parsed.length : 0);
    return () => setPendingCount(0);
  }, [step, parsed.length, setPendingCount]);

  const handleFile = async (file: File) => {
    setError(null);
    setIsParsing(true);
    try {
      const { applications } = await parseApplicationsFile(file);
      setParsed(applications);
      setFileName(file.name);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't read that file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    setError(null);
    setIsImporting(true);
    try {
      const { stats } = await importApplications(parsed);
      setPendingCount(0);
      setToastMessage(formatImportSummary(stats));
      setTimeout(() => router.push("/applications"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't import that file. Try again.");
      setIsImporting(false);
    }
  };

  return (
    <main className="min-h-screen px-6 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Container>
        {step === "upload" && (
          <div className="mx-auto max-w-xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              Bring your job search into Ingressa
            </h1>
            <p className="mt-4 text-lg text-fg-muted">
              Import your existing Excel tracker and we&apos;ll organize everything for you.
            </p>

            <div className="mt-10">
              <UploadDropzone onFileSelected={handleFile} disabled={isParsing} />
            </div>

            {isParsing && <p className="mt-4 text-sm text-fg-subtle">Reading your file…</p>}
            {error && <p className="mt-4 text-sm text-accent-coral">{error}</p>}
          </div>
        )}

        {step === "preview" && (
          <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Review your applications
            </h1>
            <p className="mt-2 text-fg-muted">
              Found {parsed.length} application{parsed.length === 1 ? "" : "s"} in {fileName}.
              Check that everything looks right before importing.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated/70 backdrop-blur-md">
              <ApplicationsTable applications={parsed} />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("upload");
                  setParsed([]);
                  setFileName("");
                }}
              >
                Back
              </Button>
              <Button variant="primary" onClick={handleImport} disabled={isImporting}>
                {isImporting
                  ? "Importing…"
                  : `Import ${parsed.length} application${parsed.length === 1 ? "" : "s"}`}
              </Button>
            </div>

            {error && <p className="mt-4 text-sm text-accent-coral">{error}</p>}
          </div>
        )}
      </Container>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </main>
  );
}
