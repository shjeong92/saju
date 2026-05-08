import { getDb, schema } from "@saju/db";
import type { Job, Queue } from "bullmq";
import { sql } from "drizzle-orm";
import type { AiDailyFortuneData } from "./dailyFortune.ts";

export type CronTickJobName = "daily-fortune-tick";

export type CronTickData = Record<string, never>;

export type EnqueueDailyFortuneFn = (
  data: AiDailyFortuneData,
  jobId: string,
) => Promise<void>;

function todayInSeoul(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export async function handleDailyFortuneTick(
  job: Job<CronTickData>,
  enqueueDailyFortune: EnqueueDailyFortuneFn,
): Promise<void> {
  const db = getDb();
  const today = todayInSeoul();

  const eligibleUsers = await db
    .select({ userId: schema.users.id })
    .from(schema.users)
    .innerJoin(schema.sajuCharts, sql`${schema.users.id} = ${schema.sajuCharts.userId}`)
    .innerJoin(schema.userProfiles, sql`${schema.users.id} = ${schema.userProfiles.userId}`);

  console.log(
    `[worker:cron] daily-fortune-tick job=${job.id} date=${today} users=${eligibleUsers.length}`,
  );

  let inserted = 0;
  for (const { userId } of eligibleUsers) {
    const inserted2 = await db
      .insert(schema.dailyFortunes)
      .values({ userId, forDate: today, status: "pending" })
      .onConflictDoNothing({
        target: [schema.dailyFortunes.userId, schema.dailyFortunes.forDate],
      })
      .returning({ id: schema.dailyFortunes.id });
    if (inserted2.length === 0) continue;

    await enqueueDailyFortune(
      { userId: userId as AiDailyFortuneData["userId"], forDate: today },
      `daily-fortune:${userId}:${today}`,
    );
    inserted += 1;
  }

  console.log(
    `[worker:cron] daily-fortune-tick enqueued ${inserted}/${eligibleUsers.length} jobs`,
  );
}

export async function ensureDailyFortuneScheduler(
  cronQueue: Queue<CronTickData, void, CronTickJobName>,
): Promise<void> {
  await cronQueue.upsertJobScheduler(
    "daily-fortune-tick",
    { pattern: "0 4 * * *", tz: "Asia/Seoul" },
    {
      name: "daily-fortune-tick",
      data: {} as CronTickData,
      opts: {
        attempts: 1,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    },
  );
  console.log("[worker:cron] daily-fortune-tick scheduled at 04:00 KST");
}
