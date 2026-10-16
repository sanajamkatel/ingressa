// Fetches candidate application-related emails from a user's Gmail mailbox. Takes an
// already-obtained OAuth access token (retrieval is the API route's job, since that's
// tied to Clerk's connected-accounts API) and returns plain GmailCandidate objects —
// no Prisma, no Claude, nothing else — so ingestGmailCandidates() stays the single
// place that owns filtering/dedup/persistence.

import { google, gmail_v1 } from "googleapis";
import type { GmailCandidate } from "./email-ingestion";

// Deliberately wide net: Gmail's own search runs before the local regex filter in
// email-filter.ts ever sees a message, so any term missing here is invisible to the
// rest of the pipeline no matter how permissive that filter is. No `subject:` scoping
// either — a confirmation email's subject is often just the company/role name, with
// the actual confirmation language ("we've received your application...") in the body.
// This cast-wide/filter-narrow split mirrors email-filter.ts's own INCLUDE_PATTERNS —
// keep the two lists roughly in sync.
const SEARCH_QUERY =
  '(application OR applying OR interview OR offer OR "status update" OR "next steps" OR ' +
  'congratulations OR assessment OR "coding challenge" OR "technical screen" OR ' +
  'rejected OR "not moving forward" OR "other candidates") -from:me';
const MAX_RESULTS = 20;

export interface GmailFetchResult {
  candidates: GmailCandidate[];
  historyId: string | null;
}

function createGmailClient(accessToken: string): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    const plainPart = payload.parts.find((part) => part.mimeType === "text/plain");
    if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data);

    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

function getHeader(message: gmail_v1.Schema$Message, name: string): string {
  const header = message.payload?.headers?.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? "";
}

/**
 * Gmail's `after:` search operator takes a plain YYYY/MM/DD calendar date, not a
 * timestamp — this renders that date as of America/Chicago local time, so "the day the
 * user signed up" means the same calendar day regardless of what time zone the server
 * or Gmail's own backend happens to be evaluating in.
 */
export function formatChicagoDateForGmailQuery(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")}`;
}

/**
 * Resolves the set of candidate message IDs to fetch.
 *
 * - If a historyId cursor exists, uses the incremental history.list delta API — pulls
 *   strictly new messages since the last sync, with no time-zone-dependent date logic
 *   involved at all.
 * - Otherwise (first sync ever, or a historyId that's expired — Gmail only retains
 *   roughly a week of history, so startHistoryId can 404) falls back to a query-based
 *   scan bounded by `after:<signup date, in America/Chicago>` — never an unbounded scan
 *   of the user's entire mailbox history.
 */
async function resolveCandidateMessageIds(
  gmail: gmail_v1.Gmail,
  historyId: string | null,
  signupDate: Date
): Promise<{ messageIds: string[]; newHistoryId: string | null }> {
  if (historyId) {
    try {
      const history = await gmail.users.history.list({
        userId: "me",
        startHistoryId: historyId,
        historyTypes: ["messageAdded"],
      });

      const ids = new Set<string>();
      for (const record of history.data.history ?? []) {
        for (const added of record.messagesAdded ?? []) {
          if (added.message?.id) ids.add(added.message.id);
        }
      }

      return { messageIds: [...ids], newHistoryId: history.data.historyId ?? historyId };
    } catch {
      // startHistoryId expired or otherwise invalid — fall through to a bounded scan.
    }
  }

  const query = `${SEARCH_QUERY} after:${formatChicagoDateForGmailQuery(signupDate)}`;

  const [list, profile] = await Promise.all([
    gmail.users.messages.list({ userId: "me", q: query, maxResults: MAX_RESULTS }),
    gmail.users.getProfile({ userId: "me" }),
  ]);

  const messageIds = (list.data.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => Boolean(id));

  return { messageIds, newHistoryId: profile.data.historyId ?? null };
}

export async function fetchGmailCandidates(
  accessToken: string,
  historyId: string | null,
  signupDate: Date
): Promise<GmailFetchResult> {
  const gmail = createGmailClient(accessToken);
  const { messageIds, newHistoryId } = await resolveCandidateMessageIds(gmail, historyId, signupDate);

  const candidates: GmailCandidate[] = [];
  for (const id of messageIds) {
    try {
      const { data: message } = await gmail.users.messages.get({ userId: "me", id, format: "full" });
      const body = extractBody(message.payload) || message.snippet || "";
      candidates.push({
        gmailMessageId: id,
        subject: getHeader(message, "Subject"),
        from: getHeader(message, "From"),
        snippet: message.snippet ?? "",
        body,
      });
    } catch {
      // One unreadable/deleted message shouldn't block the rest of the batch.
    }
  }

  return { candidates, historyId: newHistoryId };
}
