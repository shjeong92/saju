import "@saju/shared/env";
import { Queue, Worker, type Job } from "bullmq";
import { getRedisConnection } from "./redis.ts";
import {
  handleProfileReading,
  type AiProfileReadingData,
} from "./jobs/profileReading.ts";
import {
  handleCompatibility,
  type AiCompatibilityData,
} from "./jobs/compatibility.ts";
import {
  handleDailyFortune,
  type AiDailyFortuneData,
} from "./jobs/dailyFortune.ts";
import {
  handleMatchCurate,
  type MatchCurateData,
} from "./jobs/matchCurate.ts";
import {
  ensureDailyFortuneScheduler,
  handleDailyFortuneTick,
  type CronTickData,
  type CronTickJobName,
} from "./jobs/cronTick.ts";
import { closePublisher } from "./pubsub.ts";

type AiJobName = "profile-reading" | "compatibility" | "daily-fortune";
type AiJobData = AiProfileReadingData | AiCompatibilityData | AiDailyFortuneData;
type MatchJobName = "curate";

const aiQueueForChaining = new Queue<AiJobData, void, AiJobName>("ai", {
  connection: getRedisConnection(),
});

const cronQueue = new Queue<CronTickData, void, CronTickJobName>("cron", {
  connection: getRedisConnection(),
});

const aiWorker = new Worker<AiJobData, void, AiJobName>(
  "ai",
  async (job) => {
    console.log(`[worker:ai] processing job ${job.name} id=${job.id}`);
    if (job.name === "profile-reading") {
      await handleProfileReading(job as Job<AiProfileReadingData>);
      return;
    }
    if (job.name === "compatibility") {
      await handleCompatibility(job as Job<AiCompatibilityData>);
      return;
    }
    if (job.name === "daily-fortune") {
      await handleDailyFortune(job as Job<AiDailyFortuneData>);
      return;
    }
    console.warn(`[worker:ai] unknown job name: ${job.name}`);
  },
  {
    connection: getRedisConnection(),
    concurrency: 4,
  },
);

const matchWorker = new Worker<MatchCurateData, void, MatchJobName>(
  "match",
  async (job) => {
    console.log(`[worker:match] processing job ${job.name} id=${job.id}`);
    if (job.name === "curate") {
      await handleMatchCurate(job, async (data, jobId) => {
        await aiQueueForChaining.add("compatibility", data, {
          jobId,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { age: 7 * 24 * 3600 },
        });
      });
      return;
    }
    console.warn(`[worker:match] unknown job name: ${job.name}`);
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  },
);

const cronWorker = new Worker<CronTickData, void, CronTickJobName>(
  "cron",
  async (job) => {
    console.log(`[worker:cron] processing job ${job.name} id=${job.id}`);
    if (job.name === "daily-fortune-tick") {
      await handleDailyFortuneTick(job, async (data, jobId) => {
        await aiQueueForChaining.add("daily-fortune", data, {
          jobId,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { age: 7 * 24 * 3600 },
        });
      });
      return;
    }
    console.warn(`[worker:cron] unknown job name: ${job.name}`);
  },
  {
    connection: getRedisConnection(),
    concurrency: 1,
  },
);

await ensureDailyFortuneScheduler(cronQueue);

for (const w of [aiWorker, matchWorker, cronWorker]) {
  w.on("completed", (job) => {
    console.log(`[worker] completed job=${job.id} name=${job.name}`);
  });
  w.on("failed", (job, err) => {
    console.error(
      `[worker] failed job=${job?.id} name=${job?.name} attempts=${job?.attemptsMade} err=${err.message}`,
    );
  });
}

console.log("[worker] ready, queues=ai,match,cron");

const shutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, closing...`);
  await Promise.all([aiWorker.close(), matchWorker.close(), cronWorker.close()]);
  await Promise.all([aiQueueForChaining.close(), cronQueue.close()]);
  await closePublisher();
  await getRedisConnection().quit();
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
