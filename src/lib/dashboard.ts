// Aggregates a user's Application rows into dashboard-ready stats: KPI cards, the
// stage funnel, a recent-activity feed, and a follow-up ("waiting too long") list.
// Cached in Redis the same way getApplications() is — same cache-aside pattern, same
// DI'd client param so it stays testable against a dead Redis without touching the
// real instance. Must be invalidated at every write site that touches Application rows
// (import, clear, Gmail ingest), same as the applications-list cache.

import type Redis from "ioredis";
import { prisma } from "./prisma";
import { redis } from "./redis";

const CACHE_TTL_SECONDS = 300;
const FOLLOW_UP_THRESHOLD_DAYS = 14;
const RECENT_ACTIVITY_LIMIT = 8;
// A row counts as "new" rather than "updated" if createdAt and updatedAt are within
// this window — Prisma's @updatedAt always stamps both on insert, so they're never
// bit-for-bit equal, but a freshly created row's gap is milliseconds, not a real edit.
const NEW_VS_UPDATED_THRESHOLD_MS = 2000;

// The funnel only covers known, reached stages. "saved" (bookmarked, not yet applied)
// and a null status (present but unclassified) are real rows but not yet part of the
// pipeline, so they're excluded from totalApplications and every rate calculated from it.
const REAL_APPLICATION_STATUSES = [
  "applied",
  "oa",
  "interview",
  "final_round",
  "offer",
  "rejected",
] as const;

export interface DashboardFunnel {
  applied: number;
  screening: number;
  interviewing: number;
  offer: number;
  rejected: number;
}

export interface RecentActivityItem {
  id: string;
  company: string | null;
  position: string | null;
  kind: "new" | "updated";
  source: "gmail" | "import";
  timestamp: string;
}

export interface FollowUpItem {
  id: string;
  company: string | null;
  position: string | null;
  daysSinceUpdate: number;
}

export interface DashboardStats {
  totalApplications: number;
  totalApplicationsThisMonth: number;
  activeInterviews: number;
  responseRate: number;
  offersReceived: number;
  funnel: DashboardFunnel;
  recentActivity: RecentActivityItem[];
  followUps: FollowUpItem[];
}

function cacheKey(userId: string): string {
  return `dashboard:${userId}`;
}

export async function getCachedDashboardStats(
  client: Redis,
  userId: string
): Promise<DashboardStats | null> {
  try {
    const cached = await client.get(cacheKey(userId));
    return cached ? (JSON.parse(cached) as DashboardStats) : null;
  } catch {
    return null;
  }
}

export async function setCachedDashboardStats(
  client: Redis,
  userId: string,
  stats: DashboardStats
): Promise<void> {
  try {
    await client.set(cacheKey(userId), JSON.stringify(stats), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Cache unavailable — Postgres remains the source of truth.
  }
}

export async function invalidateDashboardCache(client: Redis, userId: string): Promise<void> {
  try {
    await client.del(cacheKey(userId));
  } catch {
    // Cache unavailable — nothing to invalidate.
  }
}

async function computeDashboardStats(userId: string): Promise<DashboardStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date(Date.now() - FOLLOW_UP_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const [statusCounts, totalThisMonth, recentRows, followUpRows] = await Promise.all([
    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.application.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
        status: { in: [...REAL_APPLICATION_STATUSES] },
      },
    }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        company: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        gmailMessageId: true,
      },
    }),
    prisma.application.findMany({
      where: { userId, status: "applied", updatedAt: { lte: fourteenDaysAgo } },
      orderBy: { updatedAt: "asc" },
      select: { id: true, company: true, position: true, updatedAt: true },
    }),
  ]);

  const countFor = (status: string): number =>
    statusCounts.find((row) => row.status === status)?._count._all ?? 0;

  const applied = countFor("applied");
  const screening = countFor("oa");
  const interviewing = countFor("interview") + countFor("final_round");
  const offer = countFor("offer");
  const rejected = countFor("rejected");

  const totalApplications = applied + screening + interviewing + offer + rejected;

  // Formula as specified: (Interviews + Rejections) / Total. Note this doesn't count
  // an offer as "a response" in the numerator — implemented literally as given.
  const responseRate =
    totalApplications === 0
      ? 0
      : Math.round(((interviewing + rejected) / totalApplications) * 100);

  const now = Date.now();

  const recentActivity: RecentActivityItem[] = recentRows.map((row) => {
    const isNew = row.updatedAt.getTime() - row.createdAt.getTime() < NEW_VS_UPDATED_THRESHOLD_MS;
    return {
      id: row.id,
      company: row.company,
      position: row.position,
      kind: isNew ? "new" : "updated",
      source: row.gmailMessageId ? "gmail" : "import",
      timestamp: row.updatedAt.toISOString(),
    };
  });

  const followUps: FollowUpItem[] = followUpRows.map((row) => ({
    id: row.id,
    company: row.company,
    position: row.position,
    daysSinceUpdate: Math.floor((now - row.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
  }));

  return {
    totalApplications,
    totalApplicationsThisMonth: totalThisMonth,
    activeInterviews: interviewing,
    responseRate,
    offersReceived: offer,
    funnel: { applied, screening, interviewing, offer, rejected },
    recentActivity,
    followUps,
  };
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const cached = await getCachedDashboardStats(redis, userId);
  if (cached) return cached;

  const stats = await computeDashboardStats(userId);
  await setCachedDashboardStats(redis, userId, stats);
  return stats;
}
