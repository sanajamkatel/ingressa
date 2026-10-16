// Simple fixed-window rate limiter on top of the existing Redis instance — no new
// service or dependency. Fails open (allows the request) if Redis is unreachable,
// consistent with how the rest of this app treats Redis as a performance layer, not a
// hard dependency: a down cache should degrade the app, never break it.

import type Redis from "ioredis";

export async function checkRateLimit(
  client: Redis,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    return count <= limit;
  } catch {
    return true;
  }
}
