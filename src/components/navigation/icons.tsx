import type { SVGProps } from "react";
import type { NavKey } from "@/lib/constants";

type IconProps = SVGProps<SVGSVGElement>;

const BASE_PROPS = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M3.5 8.5 10 3l6.5 5.5" />
      <path d="M5 7.5V16a1 1 0 0 0 1 1h3v-4.5a1 1 0 0 1 1-1v0a1 1 0 0 1 1 1V17h3a1 1 0 0 0 1-1V7.5" />
    </svg>
  );
}

function ApplicationsIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <rect x="3" y="7" width="14" height="9.5" rx="1.8" />
      <path d="M7.25 7V5.8A1.8 1.8 0 0 1 9.05 4h1.9a1.8 1.8 0 0 1 1.8 1.8V7" />
      <path d="M3 11h14" />
    </svg>
  );
}

function SettingsIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.6 5.6l1.4 1.4M13 13l1.4 1.4M5.6 14.4 7 13M13 7l1.4-1.4" />
    </svg>
  );
}

export const NAV_ICONS: Record<NavKey, (props: IconProps) => React.JSX.Element> = {
  dashboard: HomeIcon,
  applications: ApplicationsIcon,
  settings: SettingsIcon,
};
