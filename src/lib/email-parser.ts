// Parses a raw job-application email into an Application-shaped record. Claude does
// structured extraction via forced tool use; if the email includes a job posting URL
// and Claude couldn't find salary/location in the email body itself, enrichJobData()
// fills those two fields in by reading the posting's Schema.org JobPosting JSON-LD
// (far more reliable than scraping rendered HTML, and avoids guessing from prose).
//
// Failure handling is split deliberately: a failed Claude extraction throws, because a
// caller processing a batch of emails needs to know this one produced no data at all
// (to log/retry/skip it) rather than silently getting back an empty record. Enrichment
// is the opposite — fetching a URL pulled out of an email can fail in a dozen ways
// (network error, timeout, 403/Cloudflare, no JSON-LD, malformed JSON, a blocked
// internal address) and every one of them degrades to null, never throws, so one
// unreachable job posting can't block the rest of the pipeline.

import Anthropic from "@anthropic-ai/sdk";
import { lookup } from "node:dns/promises";
import { importRowSchema, APPLICATION_STATUSES } from "./application-schema";
import { ATS_SENDER_DOMAINS } from "./email-filter";
import type { Application } from "./types";

// Org-wide (not workspace-scoped) API keys require anthropic-workspace-id on every
// request. Workspace-scoped keys (the normal case) don't need this — only set
// ANTHROPIC_WORKSPACE_ID if Anthropic's API rejects requests with "API key is not
// scoped to a workspace".
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ...(process.env.ANTHROPIC_WORKSPACE_ID && {
    defaultHeaders: { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID },
  }),
});

// The current generation model, not the "3.5" family — see note to the user.
const EXTRACTION_MODEL = process.env.ANTHROPIC_EMAIL_MODEL || "claude-sonnet-5";

const FETCH_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 2_000_000;

export interface InboundEmail {
  subject: string;
  from: string;
  body: string;
}

export interface EnrichedJobData {
  salary: string | null;
  location: string | null;
}

// ---- Claude extraction ------------------------------------------------------

type ExtractedStatus = (typeof APPLICATION_STATUSES)[number];

interface ExtractedFields {
  company: string | null;
  position: string | null;
  status: ExtractedStatus | null;
  jobUrl: string | null;
  location: string | null;
  salary: string | null;
  contactEmail: string | null;
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "extract_application_details",
  description:
    "Extract structured job application details from an email. Use null for anything not clearly stated in the email — never guess or infer beyond what's written.",
  input_schema: {
    type: "object",
    properties: {
      company: {
        type: ["string", "null"],
        description:
          "Hiring company name. If not stated plainly in the body, fall back in this " +
          "order: (1) the sender's display name in the From header (e.g. \"M3USA " +
          "Careers\" -> \"M3USA\"), (2) the sender's domain name (e.g. " +
          "recruiting@stripe.com -> \"Stripe\" — ignore generic ATS domains like " +
          "greenhouse.io, lever.co, myworkdayjobs.com, which identify the platform, " +
          "not the employer), (3) the subject line. Null only if none of these name a " +
          "company.",
      },
      position: {
        type: ["string", "null"],
        description:
          "Job title applied for, as stated in the body. If not in the body, check the " +
          "subject line for patterns like \"Application for [Title]\", \"[Title] - " +
          "[Company]\", or \"Thank you for applying to [Title]\". Null if no title " +
          "appears anywhere in the email.",
      },
      status: {
        type: ["string", "null"],
        enum: [...APPLICATION_STATUSES, null],
        description:
          "saved = job bookmarked, not yet applied. applied = submission/receipt confirmation. " +
          "oa = online assessment, coding test, or technical-screen invite. " +
          "interview = phone/video interview scheduling or invite. " +
          "final_round = onsite, final-round, or 'last step' language. " +
          "offer = an offer was extended. rejected = rejection / not moving forward. " +
          "Use null if the email's intent is ambiguous.",
      },
      jobUrl: { type: ["string", "null"], description: "Direct link to the job posting, if present." },
      location: { type: ["string", "null"], description: "Job location exactly as stated in the email." },
      salary: { type: ["string", "null"], description: "Salary/compensation exactly as stated in the email." },
      contactEmail: { type: ["string", "null"], description: "Recruiter/HR contact email address, if present." },
    },
    required: ["company", "position", "status", "jobUrl", "location", "salary", "contactEmail"],
  },
};

function buildPrompt(email: InboundEmail): string {
  return [
    "Extract job application details from this email using the extract_application_details tool.",
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    "",
    email.body,
  ].join("\n");
}

async function extractWithClaude(email: InboundEmail): Promise<ExtractedFields> {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1024,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "extract_application_details" },
    messages: [{ role: "user", content: buildPrompt(email) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    throw new Error("Claude did not return a structured extraction for this email.");
  }

  return toolUse.input as ExtractedFields;
}

// ---- SSRF guard --------------------------------------------------------------
// jobUrl comes from inside an email — untrusted by definition. Fetching it server-side
// without restriction would let a crafted email point enrichJobData at an internal
// address (e.g. a cloud metadata endpoint at 169.254.169.254). This resolves the
// hostname first and rejects anything in a private/loopback/link-local range before
// ever issuing the real request. It does not defend against DNS rebinding between the
// check and the fetch (that needs a DNS-pinned HTTP agent) — out of scope here, but
// worth knowing if this is ever hardened further.

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true; // malformed -> treat as unsafe
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // shared address space
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  return false;
}

export function isPrivateIp(ip: string): boolean {
  return ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  const { address } = await lookup(url.hostname);
  if (isPrivateIp(address)) {
    throw new Error(`Refusing to fetch an internal/private address: ${address}`);
  }
}

// ---- JSON-LD JobPosting parsing ----------------------------------------------
// Pure, network-free, and the actual point of doing this instead of HTML scraping:
// Schema.org JobPosting markup is a stable structured contract most job boards emit
// for SEO, so reading it is far less fragile than parsing rendered markup.

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, JsonValue>;

function isJsonObject(value: JsonValue): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function findJobPostings(node: JsonValue, out: JsonObject[] = []): JsonObject[] {
  if (Array.isArray(node)) {
    for (const item of node) findJobPostings(item, out);
  } else if (isJsonObject(node)) {
    const type = node["@type"];
    const isJobPosting = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
    if (isJobPosting) out.push(node);
    if ("@graph" in node) findJobPostings(node["@graph"], out);
  }
  return out;
}

// Some job board engines HTML-entity-encode the script payload itself (e.g. `&quot;`
// instead of `"`), which otherwise breaks JSON.parse with a syntax error before we
// even get to look at the content.
function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function extractJobPostings(html: string): JsonObject[] {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  const postings: JsonObject[] = [];
  for (const match of blocks) {
    try {
      const parsed = JSON.parse(unescapeHtml(match[1])) as JsonValue;
      findJobPostings(parsed, postings);
    } catch {
      // One malformed JSON-LD block on the page shouldn't block the others.
    }
  }
  return postings;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount}`;
  }
}

export function formatSalary(posting: JsonObject): string | null {
  const baseSalary = posting.baseSalary;
  if (!isJsonObject(baseSalary)) return null;

  const currency = typeof baseSalary.currency === "string" ? baseSalary.currency : "USD";
  const value = baseSalary.value;
  if (!isJsonObject(value)) return null;

  const unitText = typeof value.unitText === "string" ? `/${value.unitText.toLowerCase()}` : "";

  if (typeof value.value === "number") {
    return `${formatCurrency(value.value, currency)}${unitText}`;
  }
  if (typeof value.minValue === "number" && typeof value.maxValue === "number") {
    return `${formatCurrency(value.minValue, currency)}–${formatCurrency(value.maxValue, currency)}${unitText}`;
  }
  return null;
}

export function formatLocation(posting: JsonObject): string | null {
  let jobLocation = posting.jobLocation;
  if (Array.isArray(jobLocation)) jobLocation = jobLocation[0];
  if (!isJsonObject(jobLocation)) return null;

  const address = jobLocation.address;
  if (!isJsonObject(address)) return null;

  const locality = typeof address.addressLocality === "string" ? address.addressLocality : null;
  const region = typeof address.addressRegion === "string" ? address.addressRegion : null;
  const country = typeof address.addressCountry === "string" ? address.addressCountry : null;

  if (locality && region) return `${locality}, ${region}`;
  if (locality) return locality;
  if (region) return region;
  if (country) return country;
  return null;
}

// ---- enrichJobData ------------------------------------------------------------

export async function enrichJobData(jobUrl: string): Promise<EnrichedJobData> {
  const fallback: EnrichedJobData = { salary: null, location: null };

  let url: URL;
  try {
    url = new URL(jobUrl);
  } catch {
    return fallback;
  }

  try {
    await assertPublicUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; IngressaBot/1.0)" },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return fallback;

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) return fallback;

    const html = (await response.text()).slice(0, MAX_RESPONSE_BYTES);
    const postings = extractJobPostings(html);
    if (postings.length === 0) return fallback;

    const [posting] = postings;
    return {
      salary: formatSalary(posting),
      location: formatLocation(posting),
    };
  } catch {
    // Network error, timeout, blocked internal address, non-2xx, malformed JSON-LD —
    // every failure mode here degrades to null, never throws or blocks the pipeline.
    return fallback;
  }
}

// ---- Job URL fallback (regex over the raw body) --------------------------------
// Claude's own jobUrl extraction sees the full body (including raw HTML markup — see
// gmail.ts's extractBody, which falls back to the HTML part when there's no text/plain
// part) and usually finds the link fine. This is a deterministic backstop for the
// cases where it doesn't: ATS confirmation emails often contain several links (logo,
// "view your profile", unsubscribe, social) and Claude can decline to guess which one
// is "the" job posting. Scanning for a URL on a known ATS domain is unambiguous.

const URL_PATTERN = /https?:\/\/[^\s"'<>)]+/gi;

export function extractAtsUrlFromBody(body: string): string | null {
  const matches = body.match(URL_PATTERN) ?? [];
  for (const raw of matches) {
    const trimmed = raw.replace(/[.,;:!?]+$/, ""); // strip trailing sentence punctuation
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      continue; // trailing HTML/markup leaked into the match — not a real URL
    }
    const host = url.hostname.toLowerCase();
    if (ATS_SENDER_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return url.toString();
    }
  }
  return null;
}

// ---- Position title fallback (regex over the subject line) --------------------
// Claude is already instructed (see the `position` field description above) to check
// the subject line when the body doesn't name a title. This is a deterministic backstop
// for the common subject shapes it still misses in practice. Deliberately narrow — only
// the patterns actually seen in testing — rather than a general subject-line parser.

export const GENERIC_POSITION_PLACEHOLDER = "Software Engineer / General Application";

function cleanExtractedTitle(raw: string): string {
  return raw
    .replace(/\s+(?:has\s+been|was)\s+(?:received|submitted|recorded)\b.*$/i, "")
    .trim();
}

const SUBJECT_TITLE_PATTERNS = [
  // "Your application to <Company> for <Title>"
  /\bapplication\s+to\s+.+?\s+for\s+(.+)$/i,
  // "Thank you for applying to <Title> at <Company>"
  /\bapplying\s+to\s+(.+?)\s+at\s+.+$/i,
  // "Your application for <Company> - <Title>" (title follows the dash)
  /\bapplication\s+for\s+.+?[-–—]\s*(.+)$/i,
];

export function extractPositionFromSubject(subject: string): string | null {
  for (const pattern of SUBJECT_TITLE_PATTERNS) {
    const match = subject.match(pattern);
    const captured = match?.[1];
    if (captured) {
      const title = cleanExtractedTitle(captured).slice(0, 200);
      if (title.length > 0) return title;
    }
  }
  return null;
}

// ---- Orchestration --------------------------------------------------------------

export async function parseApplicationEmail(email: InboundEmail): Promise<Application> {
  const extracted = await extractWithClaude(email);

  let location = extracted.location;
  let salary = extracted.salary;
  const jobUrl = extracted.jobUrl ?? extractAtsUrlFromBody(email.body);

  // Only fill genuine gaps — never overwrite something Claude already read from the
  // email itself, consistent with how import deduplication treats existing data.
  if (jobUrl && (!location || !salary)) {
    const enrichment = await enrichJobData(jobUrl);
    location = location ?? enrichment.location;
    salary = salary ?? enrichment.salary;
  }

  const position =
    extracted.position ?? extractPositionFromSubject(email.subject) ?? GENERIC_POSITION_PLACEHOLDER;

  const now = new Date().toISOString();

  const candidate = {
    id: crypto.randomUUID(),
    company: extracted.company,
    position,
    location,
    salary,
    jobUrl,
    dateApplied: null,
    status: extracted.status,
    source: null,
    contactName: null,
    contactEmail: extracted.contactEmail,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  // Same Zod schema the Excel/CSV import path uses — including the jobUrl scheme
  // sanitization, so a malicious "javascript:" link in an email can't reach the DB
  // here either.
  return importRowSchema.parse(candidate);
}
