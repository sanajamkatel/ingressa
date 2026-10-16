interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border-strong bg-bg-elevated/70 backdrop-blur-md p-5">
      <p className="text-sm text-fg-subtle">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-fg">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-fg-muted">{sublabel}</p>}
    </div>
  );
}
