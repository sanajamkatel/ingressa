const COLUMN_WIDTHS = ["w-24", "w-32", "w-20", "w-16", "w-20", "w-20", "w-24", "w-28", "w-24", "w-28"];

export default function ApplicationsLoading() {
  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-md bg-bg-elevated" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-bg-elevated" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-full bg-bg-elevated" />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-elevated">
                {COLUMN_WIDTHS.map((width, i) => (
                  <th key={i} className="px-5 py-3">
                    <div className={`h-3 ${width} animate-pulse rounded bg-border-strong`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, row) => (
                <tr key={row} className="border-b border-border last:border-0">
                  {COLUMN_WIDTHS.map((width, col) => (
                    <td key={col} className="px-5 py-4">
                      <div
                        className={`h-3 ${width} animate-pulse rounded bg-bg-elevated`}
                        style={{ animationDelay: `${(row * COLUMN_WIDTHS.length + col) * 20}ms` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
