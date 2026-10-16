// Orchestrates turning a batch of candidate Gmail messages into Application rows.
// Deliberately does NOT fetch anything from Gmail itself (that's gmail.ts's job, which
// calls into this with already-fetched candidates) — keeping Gmail-fetching out of this
// module is what makes all of it testable against a real Postgres database without any
// Google Cloud credentials. Runs: cheap regex pre-filter -> skip already-processed
// messages -> Claude extraction -> same company/position dedup the Excel import path
// uses, but with status progression enabled (a later email can move a row forward,
// e.g. applied -> interview, where Excel re-imports never overwrite an existing status)
// -> optimized DB writes.

import { prisma } from "./prisma";
import { redis } from "./redis";
import { invalidateCache } from "./applications-cache";
import { invalidateDashboardCache } from "./dashboard";
import { parseApplicationEmail, GENERIC_POSITION_PLACEHOLDER, type InboundEmail } from "./email-parser";
import { shouldProcessEmail } from "./email-filter";
import { planImportWrites } from "./import-planning";
import type { Application, ApplicationSource, ApplicationStatus } from "./types";

export interface GmailCandidate extends InboundEmail {
  gmailMessageId: string;
  snippet: string;
}

export interface IngestionResult {
  candidateCount: number;
  skippedByFilter: number;
  skippedAlreadyProcessed: number;
  extractionFailures: number;
  stats: { newCount: number; updatedCount: number; skippedCount: number };
  // False only when every email that reached extraction failed (e.g. a billing/auth
  // outage affecting the whole batch, not just one bad email). gmail-sync.ts uses this
  // to decide whether to advance the stored historyId cursor — advancing past a batch
  // that completely failed would permanently drop those messages from every future
  // delta sync (Gmail's history.list never re-returns something older than the cursor).
  // True whenever nothing was attempted or at least one extraction succeeded, since
  // there's nothing to lose by moving the cursor forward in either case.
  safeToAdvanceCursor: boolean;
}

type ApplicationRow = {
  id: string;
  company: string | null;
  position: string | null;
  location: string | null;
  salary: string | null;
  jobUrl: string | null;
  dateApplied: string | null;
  status: string | null;
  statusManuallySet: boolean;
  source: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    location: row.location,
    salary: row.salary,
    jobUrl: row.jobUrl,
    dateApplied: row.dateApplied,
    status: row.status as ApplicationStatus | null,
    statusManuallySet: row.statusManuallySet,
    source: row.source as ApplicationSource | null,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Deliberately omits statusManuallySet — a sync-driven write must never touch that flag.
// New rows get Prisma's column default (false); existing rows keep whatever a prior
// manual edit set it to, since Prisma's update() only writes the fields given here.
function toDbFields(app: Application) {
  return {
    company: app.company,
    position: app.position,
    location: app.location,
    salary: app.salary,
    jobUrl: app.jobUrl,
    dateApplied: app.dateApplied,
    status: app.status,
    source: app.source,
    contactName: app.contactName,
    contactEmail: app.contactEmail,
    notes: app.notes,
  };
}

/**
 * Processes a batch of candidate Gmail messages for one user. Every email that fails
 * Claude extraction is skipped, not thrown — one bad email in a batch of 20 shouldn't
 * block the other 19.
 *
 * Known limitation: gmailMessageId is only recorded on brand-new Application rows. If
 * an email instead merges into an *existing* row (company+position already tracked via
 * Excel import or an earlier email), that row's gmailMessageId is left as-is. That
 * message's content is still safely merged in — it just isn't marked "processed" on a
 * specific row, so a future sync could re-send it to Claude. Given the merge is a no-op
 * the second time (planImportWrites recognizes nothing new to add), the cost is a wasted
 * API call, not a correctness bug. Closing this fully would need a separate
 * message-id-to-application join table rather than a single column.
 */
export async function ingestGmailCandidates(
  userId: string,
  candidates: GmailCandidate[]
): Promise<IngestionResult> {
  let skippedByFilter = 0;
  let extractionFailures = 0;

  const passedFilter = candidates.filter((candidate) => {
    const passed = shouldProcessEmail(candidate);
    // TEMP DEBUG — remove once the M3USA no-row-created issue is diagnosed.
    console.log(`[GMAIL_SYNC_DEBUG] filter ${passed ? "PASSED" : "REJECTED"}: "${candidate.subject}"`);
    if (passed) return true;
    skippedByFilter++;
    return false;
  });

  if (passedFilter.length === 0) {
    return {
      candidateCount: candidates.length,
      skippedByFilter,
      skippedAlreadyProcessed: 0,
      extractionFailures: 0,
      stats: { newCount: 0, updatedCount: 0, skippedCount: 0 },
      safeToAdvanceCursor: true,
    };
  }

  const alreadyProcessed = await prisma.application.findMany({
    where: { userId, gmailMessageId: { in: passedFilter.map((c) => c.gmailMessageId) } },
    select: { gmailMessageId: true },
  });
  const processedIds = new Set(alreadyProcessed.map((row) => row.gmailMessageId));

  const toExtract = passedFilter.filter((c) => !processedIds.has(c.gmailMessageId));
  const skippedAlreadyProcessed = passedFilter.length - toExtract.length;

  const extracted: Array<{ application: Application; gmailMessageId: string }> = [];
  for (const candidate of toExtract) {
    try {
      const application = await parseApplicationEmail(candidate);
      // TEMP DEBUG — remove once the M3USA no-row-created issue is diagnosed.
      console.log(
        `[GMAIL_SYNC_DEBUG] extracted from "${candidate.subject}":`,
        { company: application.company, position: application.position, status: application.status }
      );
      extracted.push({ application, gmailMessageId: candidate.gmailMessageId });
    } catch (err) {
      console.log(`[GMAIL_SYNC_DEBUG] extraction FAILED for "${candidate.subject}":`, err);
      extractionFailures++;
    }
  }

  // At least one success, or nothing was attempted at all (toExtract was empty) —
  // either way there's nothing to lose by advancing. False only when every attempted
  // extraction failed.
  const safeToAdvanceCursor = toExtract.length === 0 || extractionFailures < toExtract.length;

  if (extracted.length === 0) {
    return {
      candidateCount: candidates.length,
      skippedByFilter,
      skippedAlreadyProcessed,
      extractionFailures,
      stats: { newCount: 0, updatedCount: 0, skippedCount: 0 },
      safeToAdvanceCursor,
    };
  }

  const existingRows = await prisma.application.findMany({ where: { userId } });
  const existing = existingRows.map(toApplication);

  const gmailMessageIdByAppId = new Map(extracted.map((e) => [e.application.id, e.gmailMessageId]));
  const { newRecords, changedRecords, stats } = planImportWrites(
    existing,
    extracted.map((e) => e.application),
    { allowStatusProgression: true, placeholderPosition: GENERIC_POSITION_PLACEHOLDER }
  );

  // TEMP DEBUG — remove once the M3USA no-row-created issue is diagnosed.
  console.log(
    `[GMAIL_SYNC_DEBUG] merge result against ${existing.length} existing row(s):`,
    { newCount: stats.newCount, updatedCount: stats.updatedCount, skippedCount: stats.skippedCount }
  );

  const operations = [];

  if (newRecords.length > 0) {
    operations.push(
      prisma.application.createMany({
        data: newRecords.map((app) => ({
          id: app.id,
          userId,
          gmailMessageId: gmailMessageIdByAppId.get(app.id) ?? null,
          ...toDbFields(app),
        })),
      })
    );
  }

  for (const app of changedRecords) {
    operations.push(
      prisma.application.update({ where: { id: app.id, userId }, data: toDbFields(app) })
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
    await invalidateCache(redis, userId);
    await invalidateDashboardCache(redis, userId);
  }

  return {
    candidateCount: candidates.length,
    skippedByFilter,
    skippedAlreadyProcessed,
    extractionFailures,
    stats,
    safeToAdvanceCursor: true, // reached only when extracted.length > 0
  };
}

// ---- Sync cursor (EmailSyncState) -------------------------------------------------
// Minimal read/write for the historyId cursor. Nothing calls Gmail's history.list yet
// (that's the deferred OAuth/webhook layer) — this just gives that future layer
// somewhere to persist and resume from.

export async function getSyncHistoryId(userId: string): Promise<string | null> {
  const state = await prisma.emailSyncState.findUnique({ where: { userId } });
  return state?.historyId ?? null;
}

export async function setSyncHistoryId(userId: string, historyId: string): Promise<void> {
  await prisma.emailSyncState.upsert({
    where: { userId },
    create: { userId, historyId },
    update: { historyId },
  });
}
