// Integration tests against real Postgres + Redis, same pattern as
// applications-data.integration.test.ts and applications-cache.test.ts.

import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { redis } from "./redis";
import { getDashboardStats, invalidateDashboardCache } from "./dashboard";

const USER_ID = "user_dashboard_test";

async function seed(rows: Array<{ company: string; position: string; status: string | null; createdAt?: Date; updatedAt?: Date; gmailMessageId?: string }>) {
  const now = new Date();
  for (const row of rows) {
    await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        userId: USER_ID,
        company: row.company,
        position: row.position,
        status: row.status,
        gmailMessageId: row.gmailMessageId ?? null,
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
      },
    });
  }
}

describe("getDashboardStats", () => {
  afterEach(async () => {
    await prisma.application.deleteMany({ where: { userId: USER_ID } });
    await invalidateDashboardCache(redis, USER_ID);
  });

  it("excludes 'saved' rows from totals and the funnel", async () => {
    await seed([
      { company: "A", position: "Eng", status: "applied" },
      { company: "B", position: "Eng", status: "saved" },
    ]);

    const stats = await getDashboardStats(USER_ID);
    expect(stats.totalApplications).toBe(1);
    expect(stats.funnel.applied).toBe(1);
  });

  it("combines interview and final_round into activeInterviews", async () => {
    await seed([
      { company: "A", position: "Eng", status: "interview" },
      { company: "B", position: "Eng", status: "final_round" },
    ]);

    const stats = await getDashboardStats(USER_ID);
    expect(stats.activeInterviews).toBe(2);
    expect(stats.funnel.interviewing).toBe(2);
  });

  it("computes response rate as (interviewing + rejected) / total", async () => {
    await seed([
      { company: "A", position: "Eng", status: "applied" },
      { company: "B", position: "Eng", status: "interview" },
      { company: "C", position: "Eng", status: "rejected" },
      { company: "D", position: "Eng", status: "offer" },
    ]);

    const stats = await getDashboardStats(USER_ID);
    // (1 interviewing + 1 rejected) / 4 total = 50%
    expect(stats.responseRate).toBe(50);
  });

  it("returns 0% response rate when there are no real applications yet", async () => {
    await seed([{ company: "A", position: "Eng", status: "saved" }]);

    const stats = await getDashboardStats(USER_ID);
    expect(stats.responseRate).toBe(0);
    expect(stats.totalApplications).toBe(0);
  });

  it("flags a row as new vs updated based on the createdAt/updatedAt gap", async () => {
    const created = new Date("2026-01-01T00:00:00.000Z");
    const updatedLater = new Date("2026-01-05T00:00:00.000Z");

    await seed([
      { company: "FreshCo", position: "Eng", status: "applied" }, // createdAt === updatedAt
      { company: "EditedCo", position: "Eng", status: "applied", createdAt: created, updatedAt: updatedLater },
    ]);

    const stats = await getDashboardStats(USER_ID);
    const fresh = stats.recentActivity.find((item) => item.company === "FreshCo");
    const edited = stats.recentActivity.find((item) => item.company === "EditedCo");

    expect(fresh?.kind).toBe("new");
    expect(edited?.kind).toBe("updated");
  });

  it("tags activity source based on gmailMessageId presence", async () => {
    await seed([
      { company: "GmailCo", position: "Eng", status: "applied", gmailMessageId: "msg-1" },
      { company: "ImportCo", position: "Eng", status: "applied" },
    ]);

    const stats = await getDashboardStats(USER_ID);
    const gmail = stats.recentActivity.find((item) => item.company === "GmailCo");
    const imported = stats.recentActivity.find((item) => item.company === "ImportCo");

    expect(gmail?.source).toBe("gmail");
    expect(imported?.source).toBe("import");
  });

  it("surfaces an 'applied' application waiting 14+ days as a follow-up, but not a fresh one", async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

    await seed([
      { company: "StaleCo", position: "Eng", status: "applied", createdAt: twentyDaysAgo, updatedAt: twentyDaysAgo },
      { company: "FreshCo", position: "Eng", status: "applied" },
    ]);

    const stats = await getDashboardStats(USER_ID);
    expect(stats.followUps).toHaveLength(1);
    expect(stats.followUps[0].company).toBe("StaleCo");
    expect(stats.followUps[0].daysSinceUpdate).toBeGreaterThanOrEqual(20);
  });

  it("does not surface a non-'applied' status as a follow-up even if stale", async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await seed([
      { company: "StaleInterview", position: "Eng", status: "interview", createdAt: twentyDaysAgo, updatedAt: twentyDaysAgo },
    ]);

    const stats = await getDashboardStats(USER_ID);
    expect(stats.followUps).toHaveLength(0);
  });

  it("serves cached stats on a second call without recomputing from stale-looking data changes", async () => {
    await seed([{ company: "A", position: "Eng", status: "applied" }]);

    const first = await getDashboardStats(USER_ID);
    expect(first.totalApplications).toBe(1);

    // Mutate the DB directly without invalidating the cache -- the next read should
    // still reflect the cached value, proving the cache-aside path is actually hit.
    await prisma.application.create({
      data: { id: crypto.randomUUID(), userId: USER_ID, company: "B", position: "Eng", status: "applied" },
    });

    const second = await getDashboardStats(USER_ID);
    expect(second.totalApplications).toBe(1);

    await invalidateDashboardCache(redis, USER_ID);
    const third = await getDashboardStats(USER_ID);
    expect(third.totalApplications).toBe(2);
  });
});
