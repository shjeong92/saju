import IORedis, { type Redis } from "ioredis";
import { env } from "@saju/shared/env";

let cached: Redis | null = null;

function getPublisher(): Redis {
  if (!cached) {
    cached = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return cached;
}

export async function publishReadingReady(
  userId: string,
  readingId: string,
): Promise<void> {
  await getPublisher().publish(
    `user:${userId}:reading-ready`,
    JSON.stringify({ readingId }),
  );
}

export async function publishReportReady(
  matchId: string,
  reportId: string,
): Promise<void> {
  await getPublisher().publish(
    `match:${matchId}:report-ready`,
    JSON.stringify({ reportId }),
  );
}

export async function closePublisher(): Promise<void> {
  if (cached) {
    await cached.quit();
    cached = null;
  }
}
