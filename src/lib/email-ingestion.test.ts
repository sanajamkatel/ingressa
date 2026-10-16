// Integration tests against real Postgres, with parseApplicationEmail mocked so these
// never call the real Anthropic API — same boundary kept everywhere else in this
// project (Clerk-gated code and now Claude-gated code both get mocked/manual-tested,
// not faked end-to-end in an automated suite).

import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "./prisma";
import { ingestGmailCandidates, getSyncHistoryId, setSyncHistoryId, type GmailCandidate } from "./email-ingestion";
import { parseApplicationEmail } from "./email-parser";
import type { Application } from "./types";

vi.mock("./email-parser", () => ({
  parseApplicationEmail: vi.fn(),
  GENERIC_POSITION_PLACEHOLDER: "Software Engineer / General Application",
}));

const USER_ID = "user_email_ingestion_test";

function makeCandidate(overrides: Partial<GmailCandidate> = {}): GmailCandidate {
  return {
    gmailMessageId: `msg-${Math.random().toString(36).slice(2)}`,
    subject: "Your application has been received",
    from: "recruiting@acme.com",
    snippet: "Thank you for applying to the Software Engineer role.",
    body: "Thank you for applying to the Software Engineer role at Acme.",
    ...overrides,
  };
}

function makeApplication(overrides: Partial<Application> = {}): Application {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    company: "Acme",
    position: "Software Engineer",
    location: null,
    salary: null,
    jobUrl: null,
    dateApplied: null,
    status: "applied",
    statusManuallySet: false,
    source: null,
    contactName: null,
    contactEmail: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("ingestGmailCandidates", () => {
  afterEach(async () => {
    await prisma.application.deleteMany({ where: { userId: USER_ID } });
    await prisma.emailSyncState.deleteMany({ where: { userId: USER_ID } });
    vi.clearAllMocks();
  });

  it("creates a new Application row from a candidate and records its gmailMessageId", async () => {
    const candidate = makeCandidate();
    (parseApplicationEmail as Mock).mockResolvedValueOnce(makeApplication());

    const result = await ingestGmailCandidates(USER_ID, [candidate]);

    expect(result.stats.newCount).toBe(1);
    expect(result.skippedByFilter).toBe(0);
    expect(result.skippedAlreadyProcessed).toBe(0);

    const rows = await prisma.application.findMany({ where: { userId: USER_ID } });
    expect(rows).toHaveLength(1);
    expect(rows[0].gmailMessageId).toBe(candidate.gmailMessageId);
    expect(rows[0].company).toBe("Acme");
  });

  it("filters out a candidate that doesn't pass the regex pre-filter, without calling Claude", async () => {
    const candidate = makeCandidate({
      subject: "This week in tech",
      from: "newsletter@techcrunch.com",
      snippet: "Top stories this week.",
    });

    const result = await ingestGmailCandidates(USER_ID, [candidate]);

    expect(result.skippedByFilter).toBe(1);
    expect(parseApplicationEmail).not.toHaveBeenCalled();
    expect(result.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 0 });
  });

  it("skips a message whose gmailMessageId was already processed, without calling Claude again", async () => {
    const candidate = makeCandidate({ gmailMessageId: "msg-already-done" });
    const now = new Date().toISOString();
    await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_ID,
        gmailMessageId: "msg-already-done",
        company: "Acme",
        position: "Software Engineer",
        createdAt: now,
        updatedAt: now,
      },
    });

    const result = await ingestGmailCandidates(USER_ID, [candidate]);

    expect(result.skippedAlreadyProcessed).toBe(1);
    expect(parseApplicationEmail).not.toHaveBeenCalled();
  });

  it("merges into an existing application by company+position instead of duplicating", async () => {
    const now = new Date().toISOString();
    await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_ID,
        company: "Acme",
        position: "Software Engineer",
        location: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    const candidate = makeCandidate({ gmailMessageId: "msg-merge" });
    (parseApplicationEmail as Mock).mockResolvedValueOnce(
      makeApplication({ location: "Austin, TX" })
    );

    const result = await ingestGmailCandidates(USER_ID, [candidate]);

    expect(result.stats).toEqual({ newCount: 0, updatedCount: 1, skippedCount: 0 });

    const rows = await prisma.application.findMany({ where: { userId: USER_ID } });
    expect(rows).toHaveLength(1);
    expect(rows[0].location).toBe("Austin, TX");
  });

  it("moves an existing row's status forward when a later email implies progress", async () => {
    const now = new Date().toISOString();
    await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_ID,
        company: "Acme",
        position: "Software Engineer",
        status: "applied",
        createdAt: now,
        updatedAt: now,
      },
    });

    const candidate = makeCandidate({
      gmailMessageId: "msg-interview-invite",
      subject: "Interview invitation",
    });
    (parseApplicationEmail as Mock).mockResolvedValueOnce(
      makeApplication({ status: "interview" })
    );

    const result = await ingestGmailCandidates(USER_ID, [candidate]);

    expect(result.stats).toEqual({ newCount: 0, updatedCount: 1, skippedCount: 0 });

    const rows = await prisma.application.findMany({ where: { userId: USER_ID } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("interview");
  });

  it("does not regress an existing row's status when a stale/out-of-order email arrives", async () => {
    const now = new Date().toISOString();
    await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_ID,
        company: "Acme",
        position: "Software Engineer",
        status: "interview",
        createdAt: now,
        updatedAt: now,
      },
    });

    const candidate = makeCandidate({ gmailMessageId: "msg-stale-confirmation" });
    (parseApplicationEmail as Mock).mockResolvedValueOnce(
      makeApplication({ status: "applied" })
    );

    const result = await ingestGmailCandidates(USER_ID, [candidate]);

    expect(result.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 1 });

    const rows = await prisma.application.findMany({ where: { userId: USER_ID } });
    expect(rows[0].status).toBe("interview");
  });

  it("never overwrites status once a user has set it by hand, even on a forward-looking email", async () => {
    const now = new Date().toISOString();
    await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_ID,
        company: "Acme",
        position: "Software Engineer",
        status: "applied",
        statusManuallySet: true, // the user corrected/confirmed this via EditApplicationModal
        createdAt: now,
        updatedAt: now,
      },
    });

    const candidate = makeCandidate({ gmailMessageId: "msg-interview-invite-2" });
    (parseApplicationEmail as Mock).mockResolvedValueOnce(
      makeApplication({ status: "interview" })
    );

    const result = await ingestGmailCandidates(USER_ID, [candidate]);

    expect(result.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 1 });

    const rows = await prisma.application.findMany({ where: { userId: USER_ID } });
    expect(rows[0].status).toBe("applied");
    expect(rows[0].statusManuallySet).toBe(true);
  });

  it("counts an extraction failure without blocking the rest of the batch", async () => {
    const good = makeCandidate({ gmailMessageId: "msg-good" });
    const bad = makeCandidate({ gmailMessageId: "msg-bad" });

    (parseApplicationEmail as Mock).mockImplementation((email: GmailCandidate) => {
      if (email.gmailMessageId === "msg-bad") {
        return Promise.reject(new Error("Claude did not return a structured extraction."));
      }
      return Promise.resolve(makeApplication({ company: "GoodCo" }));
    });

    const result = await ingestGmailCandidates(USER_ID, [good, bad]);

    expect(result.extractionFailures).toBe(1);
    expect(result.stats.newCount).toBe(1);
    expect(result.safeToAdvanceCursor).toBe(true); // at least one succeeded

    const rows = await prisma.application.findMany({ where: { userId: USER_ID } });
    expect(rows).toHaveLength(1);
    expect(rows[0].company).toBe("GoodCo");
  });

  it("never calls Claude at all when every candidate is filtered out", async () => {
    const candidates = [
      makeCandidate({ from: "digest@careersite.com", subject: "Weekly digest", snippet: "" }),
      makeCandidate({ from: "jobalerts-noreply@linkedin.com", subject: "New jobs for you", snippet: "" }),
    ];

    const result = await ingestGmailCandidates(USER_ID, candidates);

    expect(result.skippedByFilter).toBe(2);
    expect(parseApplicationEmail).not.toHaveBeenCalled();
    expect(result.safeToAdvanceCursor).toBe(true); // nothing attempted, nothing lost
  });

  it("flags the cursor unsafe to advance when every extraction in the batch fails", async () => {
    const candidates = [
      makeCandidate({ gmailMessageId: "msg-outage-1" }),
      makeCandidate({ gmailMessageId: "msg-outage-2" }),
    ];

    (parseApplicationEmail as Mock).mockRejectedValue(
      new Error("credit balance too low")
    );

    const result = await ingestGmailCandidates(USER_ID, candidates);

    expect(result.extractionFailures).toBe(2);
    expect(result.stats).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 0 });
    expect(result.safeToAdvanceCursor).toBe(false);

    const rows = await prisma.application.findMany({ where: { userId: USER_ID } });
    expect(rows).toHaveLength(0);
  });
});

describe("email sync cursor", () => {
  afterEach(async () => {
    await prisma.emailSyncState.deleteMany({ where: { userId: USER_ID } });
  });

  it("returns null when no cursor has been stored yet", async () => {
    await expect(getSyncHistoryId(USER_ID)).resolves.toBeNull();
  });

  it("round-trips a stored historyId", async () => {
    await setSyncHistoryId(USER_ID, "12345");
    await expect(getSyncHistoryId(USER_ID)).resolves.toBe("12345");
  });

  it("overwrites an existing cursor on a later sync", async () => {
    await setSyncHistoryId(USER_ID, "111");
    await setSyncHistoryId(USER_ID, "222");
    await expect(getSyncHistoryId(USER_ID)).resolves.toBe("222");
  });
});
