import type { FollowUpItem } from "@/lib/dashboard";

interface FollowUpTrackerProps {
  items: FollowUpItem[];
}

export function FollowUpTracker({ items }: FollowUpTrackerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">Waiting for a response (14+ days)</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-fg-subtle">Nothing overdue — nice.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-fg">
                  {item.company ?? "Unknown"} — {item.position ?? "Unknown role"}
                </span>
                <span className="text-accent-coral">{item.daysSinceUpdate}d</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-bg-elevated/50 p-3">
        <p className="text-xs text-fg-subtle">
          Upcoming interview dates from parsed Gmail threads aren&apos;t available yet —
          email parsing doesn&apos;t currently extract interview date/time.
        </p>
      </div>
    </div>
  );
}
