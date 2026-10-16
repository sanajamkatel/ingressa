export type ApplicationStatus =
  | "saved"
  | "applied"
  | "oa"
  | "interview"
  | "final_round"
  | "offer"
  | "rejected";

// Pipeline order for detecting forward progress (e.g. a later email moving a row from
// "applied" to "interview"). offer/rejected share the top rank since both are terminal
// outcomes reached from the same prior stages, not stages of each other.
export const STATUS_RANK: Record<ApplicationStatus, number> = {
  saved: 0,
  applied: 1,
  oa: 2,
  interview: 3,
  final_round: 4,
  offer: 5,
  rejected: 5,
};

export type ApplicationSource =
  | "linkedin"
  | "handshake"
  | "indeed"
  | "greenhouse"
  | "lever"
  | "workday"
  | "company_website"
  | "referral"
  | "other";

export interface Application {
  id: string;
  company: string | null;
  position: string | null;
  location: string | null;
  salary: string | null;
  jobUrl: string | null;
  dateApplied: string | null; // ISO date (yyyy-mm-dd), or the raw cell text if unparseable
  status: ApplicationStatus | null;
  // True once a user has set status by hand — guards against Gmail sync overwriting it.
  // See deduplication.ts's allowStatusProgression handling.
  statusManuallySet: boolean;
  source: ApplicationSource | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}
