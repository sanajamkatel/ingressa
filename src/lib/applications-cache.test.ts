import { afterAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { getCachedApplications, setCachedApplications, invalidateCache } from "./applications-cache";
import type { Application } from "./types";

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: "id-1",
    company: "Acme",
    position: "Engineer",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("applications-cache against a real Redis connection", () => {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
  });
  const userId = "user_cache_test_live";

  afterAll(async () => {
    await invalidateCache(client, userId);
    client.disconnect();
  });

  it("returns null on a cache miss", async () => {
    await invalidateCache(client, userId);
    const result = await getCachedApplications(client, userId);
    expect(result).toBeNull();
  });

  it("returns the same data after it's been set (cache hit)", async () => {
    const apps = [makeApp({ company: "Acme" }), makeApp({ id: "id-2", company: "Globex" })];
    await setCachedApplications(client, userId, apps);

    const result = await getCachedApplications(client, userId);
    expect(result).toEqual(apps);
  });

  it("returns null again after invalidation", async () => {
    await setCachedApplications(client, userId, [makeApp()]);
    await invalidateCache(client, userId);

    const result = await getCachedApplications(client, userId);
    expect(result).toBeNull();
  });
});

describe("applications-cache degrades gracefully when Redis is unreachable", () => {
  // Deliberately point at a port nothing is listening on, rather than touching the
  // real shared Redis instance, so this test doesn't require taking anything down.
  const unreachableClient = new Redis("redis://127.0.0.1:1", {
    maxRetriesPerRequest: 1,
    connectTimeout: 300,
    lazyConnect: true,
  });
  const userId = "user_cache_test_down";

  afterAll(() => {
    unreachableClient.disconnect();
  });

  it("getCachedApplications resolves to null instead of throwing", async () => {
    await expect(getCachedApplications(unreachableClient, userId)).resolves.toBeNull();
  });

  it("setCachedApplications resolves without throwing", async () => {
    await expect(
      setCachedApplications(unreachableClient, userId, [makeApp()])
    ).resolves.toBeUndefined();
  });

  it("invalidateCache resolves without throwing", async () => {
    await expect(invalidateCache(unreachableClient, userId)).resolves.toBeUndefined();
  });
});
