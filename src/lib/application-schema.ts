// Runtime validation for untrusted import payloads. Server Actions are reachable via
// any POST request with the right encoded body, not just from this app's own UI — so
// the shape coming off the wire can't be trusted just because the TS type says Application.

import { z } from "zod";

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "oa",
  "interview",
  "final_round",
  "offer",
  "rejected",
] as const;

export const APPLICATION_SOURCES = [
  "linkedin",
  "handshake",
  "indeed",
  "greenhouse",
  "lever",
  "workday",
  "company_website",
  "referral",
  "other",
] as const;

const shortText = z.string().trim().max(500).nullable();
const longText = z.string().trim().max(5000).nullable();

// jobUrl is rendered directly as a clickable <a href> in ApplicationsTable — anything
// other than http(s) (e.g. a "javascript:" URI) must never reach the DB, since it would
// execute in the page when clicked. Sanitize to null rather than rejecting the whole
// import over one bad cell; messy-but-harmless text (not a URL at all) is dropped too.
const jobUrlField = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((value) => (value && /^https?:\/\//i.test(value) ? value : null));

export const importRowSchema = z.object({
  id: z.string().min(1).max(100),
  company: shortText,
  position: shortText,
  location: shortText,
  salary: shortText,
  jobUrl: jobUrlField,
  dateApplied: shortText,
  status: z.enum(APPLICATION_STATUSES).nullable(),
  // Never legitimately true for a freshly-parsed row (Excel import or Gmail
  // extraction) — only a manual edit through updateApplication sets this.
  statusManuallySet: z.boolean().default(false),
  source: z.enum(APPLICATION_SOURCES).nullable(),
  contactName: shortText,
  contactEmail: shortText,
  notes: longText,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const importRowsSchema = z.array(importRowSchema).max(5000);

// Fields a user can edit directly from the table — everything except id/timestamps,
// which the server (not the client) owns.
export const updateApplicationSchema = z.object({
  company: shortText,
  position: shortText,
  location: shortText,
  salary: shortText,
  jobUrl: jobUrlField,
  dateApplied: shortText,
  status: z.enum(APPLICATION_STATUSES).nullable(),
  source: z.enum(APPLICATION_SOURCES).nullable(),
  contactName: shortText,
  contactEmail: shortText,
  notes: longText,
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
