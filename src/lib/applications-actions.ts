"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { redis } from "./redis";
import { getCachedApplications, setCachedApplications, invalidateCache } from "./applications-cache";
import { invalidateDashboardCache } from "./dashboard";
import { checkRateLimit } from "./rate-limit";
import { planImportWrites, type ImportPlan } from "./import-planning";
import { importRowsSchema, updateApplicationSchema } from "./application-schema";
import type { Application, ApplicationSource, ApplicationStatus } from "./types";

type ApplicationRow = {
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
};

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    location: row.location,
    salary: row.salary,
    jobUrl: row.jobUrl,
    dateApplied: row.dateApplied,
    status: row.status as ApplicationStatus | null,
    statusManuallySet: row.statusManuallySet,
    source: row.source as ApplicationSource | null,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDbFields(app: Application) {
  return {
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
  };
}

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export async function getApplications(): Promise<Application[]> {
  const userId = await requireUserId();

  const cached = await getCachedApplications(redis, userId);
  if (cached) return cached;

  const rows = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const applications = rows.map(toApplication);

  await setCachedApplications(redis, userId, applications);
  return applications;
}

export async function importApplications(
  rows: Application[]
): Promise<{ stats: ImportPlan["stats"] }> {
  const userId = await requireUserId();

  const allowed = await checkRateLimit(redis, `ratelimit:import:${userId}`, 10, 300);
  if (!allowed) {
    throw new Error("You're importing too frequently. Wait a few minutes and try again.");
  }

  const parsedRows = importRowsSchema.safeParse(rows);
  if (!parsedRows.success) {
    throw new Error("Import data is malformed — please re-upload your file.");
  }

  const existingRows = await prisma.application.findMany({ where: { userId } });
  const existing = existingRows.map(toApplication);

  const { newRecords, changedRecords, stats } = planImportWrites(existing, parsedRows.data);

  const operations = [];

  if (newRecords.length > 0) {
    operations.push(
      prisma.application.createMany({
        data: newRecords.map((app) => ({ id: app.id, userId, ...toDbFields(app) })),
      })
    );
  }

  for (const app of changedRecords) {
    operations.push(
      prisma.application.update({ where: { id: app.id, userId }, data: toDbFields(app) })
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
    await invalidateCache(redis, userId);
    await invalidateDashboardCache(redis, userId);
  }

  return { stats };
}

export async function updateApplication(
  id: string,
  fields: Record<string, unknown>
): Promise<Application> {
  const userId = await requireUserId();

  const parsed = updateApplicationSchema.safeParse(fields);
  if (!parsed.success) {
    throw new Error("Invalid application data — please check the fields and try again.");
  }

  const row = await prisma.application.update({
    where: { id, userId },
    // A manual edit always sends the full status field (never a partial patch), so this
    // is the one place that's allowed to flip statusManuallySet: setting a real status
    // locks it against Gmail sync overwrites; clearing it back to null (the user's own
    // "unset" action) reopens it to automatic sync updates.
    data: { ...parsed.data, statusManuallySet: parsed.data.status !== null },
  });

  await invalidateCache(redis, userId);
  await invalidateDashboardCache(redis, userId);

  return toApplication(row);
}

export async function deleteApplication(id: string): Promise<void> {
  const userId = await requireUserId();

  await prisma.application.delete({ where: { id, userId } });

  await invalidateCache(redis, userId);
  await invalidateDashboardCache(redis, userId);
}

export async function clearApplications(): Promise<void> {
  const userId = await requireUserId();
  await prisma.application.deleteMany({ where: { userId } });
  await invalidateCache(redis, userId);
  await invalidateDashboardCache(redis, userId);
}
