import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchGmailCandidates } from "@/lib/gmail";
import { ingestGmailCandidates, getSyncHistoryId, setSyncHistoryId } from "@/lib/email-ingestion";
import { checkRateLimit } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

export async function runGmailSync() {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, status: 401, error: "Unauthorized" };
  }

  // Each sync costs real Gmail API quota + a Claude call per candidate email —
  // worth limiting independently of the import rate limit above.
  const allowed = await checkRateLimit(redis, `ratelimit:gmail-sync:${userId}`, 5, 300);
  if (!allowed) {
    return {
      success: false,
      status: 429,
      error: "You're syncing too frequently. Wait a few minutes and try again.",
    };
  }

  const client = await clerkClient();
  const tokenResponse = await client.users.getUserOauthAccessToken(userId, "google");

  const accessToken = tokenResponse.data[0]?.token;
  if (!accessToken) {
    return {
      success: false,
      status: 400,
      error: "Google OAuth token not found. Please sign in with Google.",
    };
  }

  // No stored cursor -> this is the first sync for this user, so the query-based
  // fallback inside fetchGmailCandidates needs a lower bound. Without one it would
  // scan the user's entire mailbox history instead of just what's arrived since they
  // signed up. Once a historyId exists, this signup date is never consulted again —
  // every later sync is a pure delta via Gmail's history API.
  const storedHistoryId = await getSyncHistoryId(userId);
  const user = await client.users.getUser(userId);
  const signupDate = new Date(user.createdAt);

  const { candidates, historyId } = await fetchGmailCandidates(
    accessToken,
    storedHistoryId,
    signupDate
  );

  // TEMP DEBUG — remove once the Gmail-filter false-negative issue is fully resolved.
  console.log(
    `[GMAIL_SYNC_DEBUG] fetched ${candidates.length} candidate email(s) from Gmail:`,
    candidates.map((c) => ({
      subject: c.subject,
      from: c.from,
      gmailMessageId: c.gmailMessageId,
      snippet: c.snippet.slice(0, 200),
    }))
  );

  const result = await ingestGmailCandidates(userId, candidates);

  // Only advance the cursor when it's safe to — if every extraction in this batch
  // failed (e.g. a billing/auth outage), advancing anyway would permanently drop those
  // messages from every future delta sync, since Gmail's history.list never re-returns
  // something older than the stored cursor. Leaving the cursor where it was means the
  // next sync retries this same batch from scratch.
  if (historyId && result.safeToAdvanceCursor) {
    await setSyncHistoryId(userId, historyId);
  }

  return {
    success: true,
    status: 200,
    candidateCount: result.candidateCount,
    newApplications: result.stats.newCount,
    updatedApplications: result.stats.updatedCount,
    skippedDuplicates: result.stats.skippedCount,
    skippedByFilter: result.skippedByFilter,
    skippedAlreadyProcessed: result.skippedAlreadyProcessed,
    extractionFailures: result.extractionFailures,
  };
}