export type NavKey = "dashboard" | "applications" | "settings";

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "applications", label: "Applications", href: "/applications" },
  { key: "settings", label: "Settings", href: "/settings" },
];

export const NAV_ACCENTS: Record<NavKey, { text: string; bg: string }> = {
  dashboard: { text: "text-nav-home", bg: "bg-nav-home" },
  applications: { text: "text-nav-applications", bg: "bg-nav-applications" },
  settings: { text: "text-nav-settings", bg: "bg-nav-settings" },
};

export const SITE = {
  name: "Ingressa",
  tagline: "Your job search, finally in motion.",
  description:
    "Ingressa organizes every job application you send, automatically — so the dashboard stays current without a spreadsheet.",
};
