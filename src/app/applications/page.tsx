import { Button } from "@/components/ui/Button";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { SyncGmailButton } from "@/components/applications/SyncGmailButton";
import { getApplications } from "@/lib/applications-actions";
import { NAV_ICONS } from "@/components/navigation/icons";

const ApplicationsIcon = NAV_ICONS.applications;

export default async function ApplicationsPage() {
  const applications = await getApplications();

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      {applications.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
            <ApplicationsIcon className="h-6 w-6 text-brand" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-fg">
            No applications yet
          </h1>
          <p className="mt-2 text-fg-muted">Import your existing Excel tracker to get started.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/applications/import" variant="primary">
              Import Excel
            </Button>
            <SyncGmailButton />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-fg">Applications</h1>
              <p className="mt-1 text-fg-muted">
                {applications.length} application{applications.length === 1 ? "" : "s"} tracked
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SyncGmailButton />
              <Button href="/applications/import" variant="secondary">
                Import more
              </Button>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated/70 backdrop-blur-md">
            <ApplicationsTable applications={applications} editable />
          </div>
        </div>
      )}
    </main>
  );
}
