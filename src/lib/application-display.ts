import type { ApplicationSource, ApplicationStatus } from "./types";

export const STATUS_META: Record<ApplicationStatus, { label: string; text: string; bg: string }> = {
  saved: { label: "Saved", text: "text-fg-muted", bg: "bg-fg-muted/10" },
  applied: { label: "Applied", text: "text-brand", bg: "bg-brand/10" },
  oa: { label: "OA", text: "text-nav-tracker", bg: "bg-nav-tracker/10" },
  interview: { label: "Interview", text: "text-nav-settings", bg: "bg-nav-settings/10" },
  final_round: { label: "Final Round", text: "text-nav-applications", bg: "bg-nav-applications/10" },
  offer: { label: "Offer", text: "text-accent-emerald", bg: "bg-accent-emerald/10" },
  rejected: { label: "Rejected", text: "text-accent-coral", bg: "bg-accent-coral/10" },
};

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  linkedin: "LinkedIn",
  handshake: "Handshake",
  indeed: "Indeed",
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
  company_website: "Company Website",
  referral: "Referral",
  other: "Other",
};
