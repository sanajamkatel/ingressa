import Redis from "ioredis";

const globalForRedis = global as unknown as { redis: Redis | null };

const getRedisClient = (): Redis | null => {
  // If no REDIS_URL is set in environment, don't attempt connecting to localhost during builds
  if (!process.env.REDIS_URL) {
    return null;
  }

  return (
    globalForRedis.redis ||
    new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,         // Prevents connecting automatically upon instantiation
      enableOfflineQueue: false,  // Prevents commands from queuing up when disconnected
    })
  );
};

export const redis = getRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}