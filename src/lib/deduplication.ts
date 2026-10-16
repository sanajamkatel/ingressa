// Deterministic, local deduplication for Excel/CSV imports.
// Runs entirely client-side before anything is persisted — no AI involved.
// Matches on normalized (company, position), merges missing fields into
// existing records, and only adds genuinely new rows.

import { STATUS_RANK, type Application, type ApplicationStatus } from "./types";

function normalizeKey(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function buildMatchKey(company: string | null, position: string | null): string {
  return `${normalizeKey(company)}::${normalizeKey(position)}`;
}

const EMPTY_KEY = buildMatchKey(null, null);

const MUTABLE_FIELDS = [
  "company",
  "position",
  "location",
  "salary",
  "jobUrl",
  "dateApplied",
  "status",
  "source",
  "contactName",
  "contactEmail",
  "notes",
] as const satisfies readonly Exclude<keyof Application, "id" | "createdAt" | "updatedAt">[];

export interface DeduplicationStats {
  newCount: number;
  updatedCount: number;
  skippedCount: number;
}

export interface DeduplicationResult {
  finalApplications: Application[];
  stats: DeduplicationStats;
}

export interface DeduplicationOptions {
  // Excel/CSV re-imports should never clobber a status the user has already set by
  // hand, so this defaults off. The Gmail ingestion path opts in: a later email is
  // actual new information (an interview invite arriving after an applied-confirmation
  // row already exists) and should move the row forward, never backward. offer/rejected
  // share a rank (see STATUS_RANK) so whichever is reached first simply sticks.
  allowStatusProgression?: boolean;
  // See email-parser.ts's GENERIC_POSITION_PLACEHOLDER. When an imported row's position
  // is exactly this sentinel (title extraction found nothing at all — neither the body
  // nor the subject named one), match existing rows by company alone instead of
  // requiring the usual company+position match too. Without this, a single failed
  // title extraction creates a second, mostly-blank row for a company already being
  // tracked instead of filling in the one that exists. A real title is never at risk:
  // the fill-only merge rule below never overwrites a field that already has a value,
  // so a placeholder position can't clobber a real one already on the matched row.
  // If a company has multiple genuinely different open roles tracked as separate rows,
  // this arbitrarily picks one of them to merge into — an accepted tradeoff, since the
  // alternative (a blank, title-less row) is strictly worse.
  placeholderPosition?: string;
}

function isForwardStatusMove(
  from: ApplicationStatus | null,
  to: ApplicationStatus | null
): boolean {
  if (!to) return false;
  if (!from) return true;
  return STATUS_RANK[to] > STATUS_RANK[from];
}

/**
 * Merges freshly-imported rows into the existing application list.
 * - Exact (normalized company + position) match with new, non-null data → fills in the
 *   existing record's missing fields (never overwrites a field that already has a value,
 *   except status when allowStatusProgression permits a forward move and the user hasn't
 *   locked status in by hand via statusManuallySet).
 * - A placeholderPosition row with no exact match falls back to a company-only match
 *   (see DeduplicationOptions.placeholderPosition).
 * - Exact match with nothing new to add → left untouched.
 * - No match → appended as a new application.
 */
export function processImportDeduplication(
  existingApps: Application[],
  importedRows: Application[],
  options: DeduplicationOptions = {}
): DeduplicationResult {
  const existingByKey = new Map<string, Application>();
  const existingByCompany = new Map<string, Application>();

  for (const app of existingApps) {
    const key = buildMatchKey(app.company, app.position);
    if (key !== EMPTY_KEY) {
      existingByKey.set(key, app);
    }
    if (options.placeholderPosition) {
      const companyKey = normalizeKey(app.company);
      if (companyKey) existingByCompany.set(companyKey, app);
    }
  }

  const finalApplications = [...existingApps];
  const stats: DeduplicationStats = { newCount: 0, updatedCount: 0, skippedCount: 0 };

  for (const row of importedRows) {
    const key = buildMatchKey(row.company, row.position);
    let existing = key !== EMPTY_KEY ? existingByKey.get(key) : undefined;

    if (!existing && options.placeholderPosition && row.position === options.placeholderPosition) {
      existing = existingByCompany.get(normalizeKey(row.company));
    }

    if (existing) {
      let hasChanges = false;

      for (const field of MUTABLE_FIELDS) {
        if (existing[field] === null && row[field] !== null) {
          // Same field, same shape, on two objects of the same type — TypeScript can't
          // correlate the value type across a generic `keyof` loop here.
          existing[field] = row[field] as never;
          hasChanges = true;
        }
      }

      // Only reached when existing.status is already non-null (the loop above already
      // handled the null case) — a forward move past an existing status. Skipped
      // entirely once the user has set status by hand: a manual edit always wins over
      // whatever a later email implies, forward-moving or not.
      if (
        options.allowStatusProgression &&
        !existing.statusManuallySet &&
        isForwardStatusMove(existing.status, row.status)
      ) {
        existing.status = row.status;
        hasChanges = true;
      }

      if (hasChanges) {
        existing.updatedAt = new Date().toISOString();
        stats.updatedCount++;
      } else {
        stats.skippedCount++;
      }
    } else {
      finalApplications.push(row);
      if (key !== EMPTY_KEY) existingByKey.set(key, row);
      if (options.placeholderPosition) {
        const companyKey = normalizeKey(row.company);
        if (companyKey) existingByCompany.set(companyKey, row);
      }
      stats.newCount++;
    }
  }

  return { finalApplications, stats };
}
