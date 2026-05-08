import "@saju/shared/env";
import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "./redis.ts";
import {
  handleProfileReading,
  type AiProfileReadingData,
} from "./jobs/profileReading.ts";

type AiJobName = "profile-reading" | "compatibility" | "daily-fortune";

type AiJobData = AiProfileReadingData | Record<string, unknown>;

const worker = new Worker<AiJobData, void, AiJobName>(
  "ai",
  async (job) => {
    console.log(`[worker] processing job ${job.name} id=${job.id}`);
    if (job.name === "profile-reading") {
      await handleProfileReading(job as Job<AiProfileReadingData>);
      return;
    }
    console.warn(`[worker] unknown job name: ${job.name}`);
  },
  {
    connection: getRedisConnection(),
    concurrency: 4,
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] completed job=${job.id} name=${job.name}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[worker] failed job=${job?.id} name=${job?.name} attempts=${job?.attemptsMade} err=${err.message}`,
  );
});

console.log("[worker] ready, queue=ai");

const shutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, closing...`);
  await worker.close();
  await getRedisConnection().quit();
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
