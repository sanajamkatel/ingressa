// Cache-aside helpers for the Application list, keyed per user. Takes the Redis client
// as a parameter (rather than importing the singleton directly) so the resilience
// behavior — reads/writes degrading silently to Postgres when Redis is unreachable —
// can be exercised in tests against a deliberately-unreachable client, without having
// to take the real shared Redis instance down.

import type Redis from "ioredis";
import type { Application } from "./types";

const CACHE_TTL_SECONDS = 300;

export function cacheKey(userId: string): string {
  return `applications:${userId}`;
}

export async function getCachedApplications(
  client: Redis,
  userId: string
): Promise<Application[] | null> {
  try {
    const cached = await client.get(cacheKey(userId));
    return cached ? (JSON.parse(cached) as Application[]) : null;
  } catch {
    return null;
  }
}

export async function setCachedApplications(
  client: Redis,
  userId: string,
  applications: Application[]
): Promise<void> {
  try {
    await client.set(cacheKey(userId), JSON.stringify(applications), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Cache unavailable — Postgres remains the source of truth.
  }
}

export async function invalidateCache(client: Redis, userId: string): Promise<void> {
  try {
    await client.del(cacheKey(userId));
  } catch {
    // Cache unavailable — nothing to invalidate.
  }
}
