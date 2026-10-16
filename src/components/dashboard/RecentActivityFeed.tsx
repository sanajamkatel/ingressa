import { formatRelativeTime } from "@/lib/format-relative-time";
import type { RecentActivityItem } from "@/lib/dashboard";

interface RecentActivityFeedProps {
  items: RecentActivityItem[];
}

export function RecentActivityFeed({ items }: RecentActivityFeedProps) {
  if (items.length === 0) {
    return <p className="text-sm text-fg-subtle">No activity yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <span
            className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
              item.kind === "new" ? "bg-accent-emerald" : "bg-brand"
            }`}
          />
          <div className="flex-1">
            <p className="text-sm text-fg">
              {item.kind === "new" ? "New application" : "Updated"}
              {item.company ? ` — ${item.company}` : ""}
              {item.position ? ` (${item.position})` : ""}
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">
              {item.source === "gmail" ? "via Gmail sync" : "via Excel import"} ·{" "}
              {formatRelativeTime(item.timestamp)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
