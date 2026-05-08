import IORedis from "ioredis";
import { env } from "@saju/shared/env";

let cached: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!cached) {
    cached = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return cached;
}
