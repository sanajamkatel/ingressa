// Decides which rows from an import need a `createMany` vs. an individual `update`
// vs. nothing at all, so the caller never writes a row that didn't actually change.

import {
  processImportDeduplication,
  type DeduplicationOptions,
  type DeduplicationStats,
} from "./deduplication";
import type { Application } from "./types";

export interface ImportPlan {
  newRecords: Application[];
  changedRecords: Application[];
  stats: DeduplicationStats;
}

/**
 * processImportDeduplication mutates matched entries of `existingApps` in place
 * (bumping updatedAt only when a field actually changed) and appends brand-new rows
 * to the tail of finalApplications. Snapshotting updatedAt beforehand lets us split
 * "new" vs. "actually changed" vs. "untouched" afterward without altering that
 * pure merge function.
 */
export function planImportWrites(
  existingApps: Application[],
  importedRows: Application[],
  options: DeduplicationOptions = {}
): ImportPlan {
  const existingCount = existingApps.length;
  const updatedAtBefore = existingApps.map((app) => app.updatedAt);

  const { finalApplications, stats } = processImportDeduplication(
    existingApps,
    importedRows,
    options
  );

  const newRecords = finalApplications.slice(existingCount);
  const changedRecords = existingApps.filter((app, i) => app.updatedAt !== updatedAtBefore[i]);

  return { newRecords, changedRecords, stats };
}
