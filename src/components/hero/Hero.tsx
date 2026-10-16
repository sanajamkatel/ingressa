import { Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { RotatingHeadline } from "./RotatingHeadline";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-16 text-center sm:px-8 sm:pt-32">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <RotatingHeadline />

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
          Ingressa automatically extracts confirmation emails, imports
          spreadsheets, and maintains a clean ledger of all your
          applications.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Show when="signed-in">
            <Button href="/applications" variant="primary">
              Get Started
            </Button>
          </Show>
          <Show when="signed-out">
            <Button href="/sign-up" variant="primary">
              Get Started
            </Button>
          </Show>
          <Button href="/dashboard" variant="secondary">
            Explore Dashboard
          </Button>
        </div>
      </div>
    </section>
  );
}
