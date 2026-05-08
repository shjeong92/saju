import { FlowProducer, Queue } from "bullmq";
import type { UserId } from "@saju/shared/types";
import { getRedisConnection } from "./connection.ts";

export const QUEUE_NAMES = {
  ai: "ai",
} as const;

export type AiJobName =
  | "profile-reading"
  | "compatibility"
  | "daily-fortune";

export type AiProfileReadingData = {
  userId: UserId;
  readingId: string;
  version: string;
};

export type AiCompatibilityData = {
  matchId: string;
  reportId: string;
};

export type AiDailyFortuneData = {
  userId: UserId;
  forDate: string;
};

export type AiJobData =
  | AiProfileReadingData
  | AiCompatibilityData
  | AiDailyFortuneData;

let cachedAiQueue: Queue<AiJobData, void, AiJobName> | null = null;
let cachedFlow: FlowProducer | null = null;

export function getAiQueue(): Queue<AiJobData, void, AiJobName> {
  if (!cachedAiQueue) {
    cachedAiQueue = new Queue<AiJobData, void, AiJobName>(QUEUE_NAMES.ai, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
  }
  return cachedAiQueue;
}

export function getFlowProducer(): FlowProducer {
  if (!cachedFlow) {
    cachedFlow = new FlowProducer({ connection: getRedisConnection() });
  }
  return cachedFlow;
}

export function profileReadingJobId(uid: UserId, version: string): string {
  return `profile-reading:${uid}:${version}`;
}
