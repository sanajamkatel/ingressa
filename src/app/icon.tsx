import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same mark as src/components/navigation/Logo.tsx, same viewBox/paths — ImageResponse
// renders server-side with no DOM/CSS cascade, so currentColor/var(--bg-elevated) are
// swapped for the equivalent literal hex values (brand purple, white).
export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 5l8 6" stroke="#5b4fe8" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 12h8" stroke="#5b4fe8" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 19l8-6" stroke="#5b4fe8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16.5" cy="12" r="5.5" fill="#5b4fe8" />
        <path
          d="M14 12.2l1.7 1.7 3-3.4"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    { ...size }
  );
}
