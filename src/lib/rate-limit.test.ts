import { afterEach, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit against a real Redis connection", () => {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
  });
  const key = "ratelimit:test:checkRateLimit";

  afterEach(async () => {
    await client.del(key);
  });

  it("allows requests under the limit", async () => {
    expect(await checkRateLimit(client, key, 3, 60)).toBe(true);
    expect(await checkRateLimit(client, key, 3, 60)).toBe(true);
    expect(await checkRateLimit(client, key, 3, 60)).toBe(true);
  });

  it("blocks requests once the limit is exceeded", async () => {
    await checkRateLimit(client, key, 2, 60);
    await checkRateLimit(client, key, 2, 60);
    expect(await checkRateLimit(client, key, 2, 60)).toBe(false);
  });

  it("uses independent counters per key", async () => {
    const otherKey = "ratelimit:test:other";
    await checkRateLimit(client, key, 1, 60);
    expect(await checkRateLimit(client, otherKey, 1, 60)).toBe(true);
    await client.del(otherKey);
  });
});

describe("checkRateLimit degrades gracefully when Redis is unreachable", () => {
  const unreachableClient = new Redis("redis://127.0.0.1:1", {
    maxRetriesPerRequest: 1,
    connectTimeout: 300,
    lazyConnect: true,
  });

  it("fails open (allows the request) instead of throwing", async () => {
    await expect(
      checkRateLimit(unreachableClient, "ratelimit:test:down", 1, 60)
    ).resolves.toBe(true);
  });
});
