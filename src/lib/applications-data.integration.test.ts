// Integration tests against a real Postgres database (the one in DATABASE_URL).
// These exercise the exact same Prisma queries the server actions in
// applications-actions.ts use, at the data layer directly — Clerk's auth() can't run
// outside a real Next.js request, so the Clerk-wrapped exports themselves can't be
// called from a plain test. What matters most for data-integrity risk (e.g. a
// forgotten `where: { userId }` filter leaking another user's rows) lives entirely in
// these Prisma queries, so testing at this layer still covers the real risk.

import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { planImportWrites } from "./import-planning";
import type { Application } from "./types";

const USER_A = "user_integration_test_a";
const USER_B = "user_integration_test_b";

function toApplication(row: {
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
}): Application {
  return {
    ...row,
    status: row.status as Application["status"],
    source: row.source as Application["source"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function makeImportRow(overrides: Partial<Application> = {}): Application {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    company: null,
    position: null,
    location: null,
    salary: null,
    jobUrl: null,
    dateApplied: null,
    status: null,
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

/** Mirrors importApplications' real write logic exactly, without the Clerk auth wrapper. */
async function runImport(userId: string, rows: Application[]) {
  const existingRows = await prisma.application.findMany({ where: { userId } });
  const existing = existingRows.map(toApplication);

  const { newRecords, changedRecords, stats } = planImportWrites(existing, rows);

  const operations = [];
  if (newRecords.length > 0) {
    operations.push(
      prisma.application.createMany({
        data: newRecords.map((app) => ({
          id: app.id,
          userId,
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
        })),
      })
    );
  }
  for (const app of changedRecords) {
    operations.push(
      prisma.application.update({
        where: { id: app.id, userId },
        data: { location: app.location, salary: app.salary },
      })
    );
  }
  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return stats;
}

describe("Application data layer (real Postgres)", () => {
  afterEach(async () => {
    await prisma.application.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
  });

  it("supports a full create/edit/delete round trip", async () => {
    const now = new Date().toISOString();
    const created = await prisma.application.create({
      data: { id: crypto.randomUUID(), userId: USER_A, company: "Acme", position: "Engineer", createdAt: now, updatedAt: now },
    });

    const afterCreate = await prisma.application.findUnique({ where: { id: created.id } });
    expect(afterCreate?.company).toBe("Acme");

    await prisma.application.update({
      where: { id: created.id, userId: USER_A },
      data: { company: "Acme Corp" },
    });
    const afterEdit = await prisma.application.findUnique({ where: { id: created.id } });
    expect(afterEdit?.company).toBe("Acme Corp");

    await prisma.application.delete({ where: { id: created.id, userId: USER_A } });
    const afterDelete = await prisma.application.findUnique({ where: { id: created.id } });
    expect(afterDelete).toBeNull();
  });

  it("does not create duplicates when the same file is imported twice", async () => {
    const rows = [
      makeImportRow({ company: "Acme", position: "Engineer" }),
      makeImportRow({ company: "Globex", position: "Designer" }),
    ];

    const firstImport = await runImport(USER_A, rows);
    expect(firstImport).toEqual({ newCount: 2, updatedCount: 0, skippedCount: 0 });

    // Re-importing the exact same file (fresh ids, since each parse run generates new
    // ones client-side) must match on company+position and skip, not duplicate.
    const secondImport = await runImport(USER_A, [
      makeImportRow({ company: "Acme", position: "Engineer" }),
      makeImportRow({ company: "Globex", position: "Designer" }),
    ]);
    expect(secondImport).toEqual({ newCount: 0, updatedCount: 0, skippedCount: 2 });

    const allRows = await prisma.application.findMany({ where: { userId: USER_A } });
    expect(allRows).toHaveLength(2);
  });

  it("only returns a user's own applications, never another user's", async () => {
    const now = new Date().toISOString();
    await prisma.application.create({
      data: { id: crypto.randomUUID(), userId: USER_A, company: "Acme", position: "A's job", createdAt: now, updatedAt: now },
    });
    await prisma.application.create({
      data: { id: crypto.randomUUID(), userId: USER_B, company: "Globex", position: "B's job", createdAt: now, updatedAt: now },
    });

    const userARows = await prisma.application.findMany({ where: { userId: USER_A } });
    const userBRows = await prisma.application.findMany({ where: { userId: USER_B } });

    expect(userARows).toHaveLength(1);
    expect(userARows[0].position).toBe("A's job");
    expect(userBRows).toHaveLength(1);
    expect(userBRows[0].position).toBe("B's job");
  });

  it("refuses to update a row that belongs to a different user", async () => {
    const now = new Date().toISOString();
    const row = await prisma.application.create({
      data: { id: crypto.randomUUID(), userId: USER_A, company: "Acme", position: "Engineer", createdAt: now, updatedAt: now },
    });

    // Same pattern as importApplications' per-record update: id + userId together.
    // If userId doesn't match the row's real owner, Prisma must reject it (P2025)
    // rather than silently updating someone else's data.
    await expect(
      prisma.application.update({
        where: { id: row.id, userId: USER_B },
        data: { company: "Hijacked" },
      })
    ).rejects.toMatchObject({ code: "P2025" });

    const unchanged = await prisma.application.findUnique({ where: { id: row.id } });
    expect(unchanged?.company).toBe("Acme");
  });

  it("refuses to delete a row that belongs to a different user", async () => {
    const now = new Date().toISOString();
    const row = await prisma.application.create({
      data: { id: crypto.randomUUID(), userId: USER_A, company: "Acme", position: "Engineer", createdAt: now, updatedAt: now },
    });

    // Same id + userId pattern as deleteApplication.
    await expect(
      prisma.application.delete({ where: { id: row.id, userId: USER_B } })
    ).rejects.toMatchObject({ code: "P2025" });

    const stillThere = await prisma.application.findUnique({ where: { id: row.id } });
    expect(stillThere).not.toBeNull();
  });

  it("updates only the fields provided, scoped to the correct owner", async () => {
    const now = new Date().toISOString();
    const row = await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_A,
        company: "Acme",
        position: "Engineer",
        location: "Austin",
        createdAt: now,
        updatedAt: now,
      },
    });

    const updated = await prisma.application.update({
      where: { id: row.id, userId: USER_A },
      data: { status: "interview", location: "Remote" },
    });

    expect(updated.status).toBe("interview");
    expect(updated.location).toBe("Remote");
    expect(updated.company).toBe("Acme"); // untouched field preserved
  });

  it("marks statusManuallySet when a manual edit sets a status (mirrors updateApplication)", async () => {
    const now = new Date().toISOString();
    const row = await prisma.application.create({
      data: { id: crypto.randomUUID(), userId: USER_A, company: "Acme", position: "Engineer", createdAt: now, updatedAt: now },
    });

    // Same data shape updateApplication builds: the full parsed field set plus the
    // derived statusManuallySet flag.
    const updated = await prisma.application.update({
      where: { id: row.id, userId: USER_A },
      data: { status: "interview", statusManuallySet: true },
    });

    expect(updated.status).toBe("interview");
    expect(updated.statusManuallySet).toBe(true);
  });

  it("clears statusManuallySet when a manual edit clears status back to null", async () => {
    const now = new Date().toISOString();
    const row = await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_A,
        company: "Acme",
        position: "Engineer",
        status: "interview",
        statusManuallySet: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    const updated = await prisma.application.update({
      where: { id: row.id, userId: USER_A },
      data: { status: null, statusManuallySet: false },
    });

    expect(updated.status).toBeNull();
    expect(updated.statusManuallySet).toBe(false);
  });
});
