import * as XLSX from "xlsx";
import type { Application, ApplicationSource, ApplicationStatus } from "./types";

type MappableField =
  | "company"
  | "position"
  | "location"
  | "salary"
  | "jobUrl"
  | "dateApplied"
  | "status"
  | "source"
  | "contactName"
  | "contactEmail"
  | "notes";

const FIELD_ALIASES: Record<MappableField, string[]> = {
  company: ["company", "company name", "employer", "organization"],
  position: ["position", "role", "job title", "title"],
  location: ["location", "city", "office"],
  salary: ["salary", "pay", "compensation", "base salary"],
  jobUrl: ["job url", "url", "link", "posting link", "job link"],
  dateApplied: ["date applied", "applied date", "application date", "date"],
  status: ["status", "application status", "stage"],
  source: ["source", "platform", "found via", "applied via"],
  contactName: ["contact name", "contact", "recruiter", "referrer"],
  contactEmail: ["contact email", "recruiter email", "email"],
  notes: ["notes", "comments", "comment"],
};

const STATUS_ALIASES: Record<ApplicationStatus, string[]> = {
  saved: ["saved", "wishlist", "interested", "planning to apply"],
  applied: ["applied", "submitted"],
  oa: ["oa", "online assessment", "assessment", "test", "coding challenge"],
  interview: ["interview", "interviewing", "phone screen", "screen", "screening"],
  final_round: ["final round", "onsite", "final", "onsite interview"],
  offer: ["offer", "offered", "accepted"],
  rejected: ["rejected", "declined", "closed", "no", "ghosted"],
};

const SOURCE_ALIASES: Record<ApplicationSource, string[]> = {
  linkedin: ["linkedin"],
  handshake: ["handshake"],
  indeed: ["indeed"],
  greenhouse: ["greenhouse"],
  lever: ["lever"],
  workday: ["workday"],
  company_website: ["company website", "website", "company site", "career site", "careers page"],
  referral: ["referral", "referred"],
  other: ["other"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveFieldMap(headers: string[]): Partial<Record<MappableField, string>> {
  const normalizedToOriginal = new Map(headers.map((h) => [normalizeHeader(h), h]));
  const map: Partial<Record<MappableField, string>> = {};

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [MappableField, string[]][]) {
    for (const alias of aliases) {
      const original = normalizedToOriginal.get(alias);
      if (original) {
        map[field] = original;
        break;
      }
    }
  }

  return map;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      return date.toISOString().slice(0, 10);
    }
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    // Preserve the original cell text rather than discarding or guessing a date.
    return value.trim();
  }

  return null;
}

function normalizeStatus(value: unknown): ApplicationStatus | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  for (const [status, aliases] of Object.entries(STATUS_ALIASES) as [ApplicationStatus, string[]][]) {
    if (aliases.includes(normalized)) return status;
  }
  // Present but unrecognized — we can't confidently map it, so leave it unset
  // rather than guessing.
  return null;
}

function normalizeSource(value: unknown): ApplicationSource | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  for (const [source, aliases] of Object.entries(SOURCE_ALIASES) as [ApplicationSource, string[]][]) {
    if (aliases.includes(normalized)) return source;
  }
  return null;
}

function toNullableString(value: unknown): string | null {
  const str = String(value ?? "").trim();
  return str.length > 0 ? str : null;
}

export interface ParseResult {
  applications: Application[];
  rowCount: number;
}

export async function parseApplicationsFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("This file doesn't contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    throw new Error("No rows were found in this file.");
  }

  const headers = Object.keys(rows[0]);
  const fieldMap = resolveFieldMap(headers);

  const companyHeader = fieldMap.company;
  const positionHeader = fieldMap.position;

  if (!companyHeader || !positionHeader) {
    throw new Error(
      "This doesn't look like a job application tracker — we couldn't find Company and Position columns. Please upload your application tracker spreadsheet."
    );
  }

  // Spreadsheets are frequently formatted (or were previously populated) well past
  // the last real row of data — skip rows where both Company and Position are
  // blank instead of counting them as applications.
  const dataRows = rows.filter((row) => {
    const companyValue = toNullableString(row[companyHeader]);
    const positionValue = toNullableString(row[positionHeader]);
    return companyValue !== null || positionValue !== null;
  });

  if (dataRows.length === 0) {
    throw new Error(
      "No application rows were found in this file. Please upload your job application tracker."
    );
  }

  const now = new Date().toISOString();

  const applications: Application[] = dataRows.map((row) => {
    const get = (field: MappableField): unknown => {
      const header = fieldMap[field];
      return header ? row[header] : undefined;
    };

    return {
      id: crypto.randomUUID(),
      company: toNullableString(get("company")),
      position: toNullableString(get("position")),
      location: toNullableString(get("location")),
      salary: toNullableString(get("salary")),
      jobUrl: toNullableString(get("jobUrl")),
      dateApplied: normalizeDate(get("dateApplied")),
      status: normalizeStatus(get("status")),
      statusManuallySet: false,
      source: normalizeSource(get("source")),
      contactName: toNullableString(get("contactName")),
      contactEmail: toNullableString(get("contactEmail")),
      notes: toNullableString(get("notes")),
      createdAt: now,
      updatedAt: now,
    };
  });

  return { applications, rowCount: applications.length };
}
