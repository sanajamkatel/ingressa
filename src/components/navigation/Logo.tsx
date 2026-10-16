import type { SVGProps } from "react";

/**
 * Three lines — standing for the scattered sources Ingressa pulls from (inbox,
 * spreadsheet, manual entry) — converge into a single confirmed mark. Literal
 * representation of what the product does: many inputs, one tracked record.
 */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 5l8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 19l8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16.5" cy="12" r="5.5" fill="currentColor" />
      <path
        d="M14 12.2l1.7 1.7 3-3.4"
        stroke="var(--bg-elevated)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
