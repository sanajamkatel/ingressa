import { Button } from "@/components/ui/Button";
import { ConvergencePreview } from "./ConvergencePreview";
import { RotatingHeadline } from "./RotatingHeadline";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden px-6 pt-28 pb-16 sm:px-8 sm:pt-32">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs text-fg-muted">
            <span className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" aria-hidden="true" />
            Ingressa v1.0 — live tracking active
          </div>

          <RotatingHeadline />

          <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-muted">
            Ingressa automatically extracts confirmation emails, imports
            spreadsheets, and maintains a clean ledger of all your
            applications.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button href="/applications" variant="primary">
              Import Applications
            </Button>
            <Button href="#dashboard-preview" variant="secondary">
              Explore Dashboard
            </Button>
          </div>
        </div>

        <ConvergencePreview />
      </div>
    </section>
  );
}
