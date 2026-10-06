const NODES = [
  { label: "Excel", color: "bg-accent-emerald", style: { top: "4%", left: "50%" } },
  { label: "Email", color: "bg-accent-coral", style: { top: "50%", left: "96%" } },
  { label: "Job card", color: "bg-brand", style: { top: "96%", left: "50%" } },
  { label: "Analytics", color: "bg-accent-emerald", style: { top: "50%", left: "4%" } },
];

export function ConvergencePreview() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-md rounded-[28px] border border-border bg-bg-elevated/60"
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="orbit-rotate relative h-[72%] w-[72%]">
          {NODES.map((node) => (
            <span
              key={node.label}
              className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${node.color}`}
              style={node.style}
            />
          ))}
        </div>

        <span className="absolute h-3.5 w-3.5 rounded-full bg-fg" />
      </div>

      <p className="absolute bottom-5 left-5 right-5 text-xs font-medium text-fg-subtle">
        Interactive visualization — arriving in the next build.
      </p>
    </div>
  );
}
