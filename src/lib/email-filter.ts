// Cheap, local, network-free triage run before an email is ever handed to Claude.
// A Claude call plus a possible job-posting enrichment fetch is the slowest and most
// expensive step in the ingestion pipeline — most inbox traffic (job-alert digests,
// newsletters, unrelated mail) should never reach it.

export interface EmailFilterInput {
  subject: string;
  from: string;
  snippet: string;
}

// Known senders that send job-related *marketing*, not application-status updates —
// job-alert digests, "new jobs for you" newsletters, etc. These would otherwise match
// the keyword list below (they often contain the word "application" or "interview" in
// a promotional sense) but are never a real status update worth parsing. Checked first,
// ahead of everything else — not even an ATS domain match below overrides this.
const EXCLUDED_SENDER_PATTERNS = [
  /no-reply@job-alerts\./i,
  /jobs-noreply@/i,
  /^alerts@/i,
  /jobalerts-noreply@/i,
  /newsletter/i,
  /digest/i,
  /^marketing@/i,
];

// Content that marks an email as job-related *marketing* even when the sender's domain
// looks legitimate (e.g. an ATS platform's own "jobs recommended for you" digest, sent
// from the same domain it uses for real status emails). Checked before the ATS domain
// whitelist below, so a trusted domain can't bypass this.
const NEGATIVE_CONTENT_PATTERNS = [
  /job\s+alert/i,
  /recommended\s+jobs?/i,
  /jobs?\s+matching\s+your\s+search/i,
  /new\s+jobs?\s+for\s+you/i,
  /weekly\s+digest/i,
  /unsubscribe\s+from\s+job/i,
];

// Transactional ATS platforms that only ever email a candidate about their own
// application — there's no "marketing digest" mode to worry about the way there is with
// LinkedIn/Indeed, so any email from one of these domains skips the keyword check below
// entirely (still subject to the negative-content guard above). Exported because
// email-parser.ts reuses the same domain list to recognize a job-posting link inside
// the email body — one list, two uses (sender trust here, URL recognition there).
export const ATS_SENDER_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "workday.com",
  "ashbyhq.com",
  "icims.com",
  "smartrecruiters.com",
  "jobvite.com",
  "bamboohr.com",
  "workable.com",
  "successfactors.com",
  "taleo.net",
];

// High-confidence phrases real application-status emails use, as flexible regexes
// rather than exact substrings — ATS platforms phrase the same event differently
// ("Your application to Acme has been received" vs. "We received your application").
// The bounded word-gap (up to 6 words between anchor terms) keeps this from matching
// across unrelated, distant text while still tolerating realistic phrasing variation.
// Deliberately conservative — a false negative (skipping a real status email) just
// means it's missed this sync; a false positive means paying for a Claude call on junk
// mail.
const GAP = String.raw`(?:\W+\w+){0,6}?`;
const INCLUDE_PATTERNS = [
  new RegExp(`application${GAP}\\W+received`, "i"),
  new RegExp(`received${GAP}\\W+application`, "i"),
  new RegExp(`thank\\s+you${GAP}\\W+(?:applying|interest)`, "i"),
  new RegExp(`application${GAP}\\W+submitted`, "i"),
  // Bare "application for <role>" / "your application" — no confirmation word at all,
  // e.g. Y Combinator's Work at a Startup: "Your application for Margin - Software
  // Engineer (new grad)". Addressing the candidate's own application directly like
  // this is a strong signal on its own; generic job-board marketing phrases things
  // differently ("submit your application today", "new jobs for you").
  /\bapplication\s+for\b/i,
  /\byour\s+application\b/i,
  /interview/i,
  /online\s+assessment/i,
  /coding\s+challenge/i,
  /technical\s+screen/i,
  /next\s+steps/i,
  /\boffer\b/i,
  /congratulations/i,
  /regret\s+to\s+inform/i,
  /not\s+moving\s+forward/i,
  /other\s+candidates/i,
  /status\s+update/i,
  /application\s+status/i,
];

function senderDomain(from: string): string {
  const match = from.match(/@([a-z0-9.-]+)/i);
  return match ? match[1].toLowerCase() : "";
}

export function shouldProcessEmail(email: EmailFilterInput): boolean {
  const from = email.from.toLowerCase();
  if (EXCLUDED_SENDER_PATTERNS.some((pattern) => pattern.test(from))) {
    return false;
  }

  const haystack = `${email.subject} ${email.snippet}`;

  if (NEGATIVE_CONTENT_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return false;
  }

  const domain = senderDomain(from);
  if (ATS_SENDER_DOMAINS.some((atsDomain) => domain === atsDomain || domain.endsWith(`.${atsDomain}`))) {
    return true;
  }

  return INCLUDE_PATTERNS.some((pattern) => pattern.test(haystack));
}
