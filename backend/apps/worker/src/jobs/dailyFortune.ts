import { generateDailyFortune } from "@saju/ai";
import { getDb, schema } from "@saju/db";
import { computeTodayGanzhi } from "@saju/saju";
import { eq, sql } from "drizzle-orm";
import type { Job } from "bullmq";

export type AiDailyFortuneData = {
  userId: string;
  forDate: string;
};

export async function handleDailyFortune(
  job: Job<AiDailyFortuneData>,
): Promise<void> {
  const { userId, forDate } = job.data;
  const db = getDb();

  const fortune = await db.query.dailyFortunes.findFirst({
    where: { userId, forDate },
  });
  if (!fortune) {
    throw new Error(`daily fortune row not found user=${userId} date=${forDate}`);
  }
  if (fortune.status === "completed") {
    console.log(`[worker] daily-fortune already completed: ${fortune.id}`);
    return;
  }

  await db
    .update(schema.dailyFortunes)
    .set({ status: "generating", updatedAt: sql`now()` })
    .where(eq(schema.dailyFortunes.id, fortune.id));

  const [chart, input] = await Promise.all([
    db.query.sajuCharts.findFirst({ where: { userId } }),
    db.query.sajuInputs.findFirst({ where: { userId } }),
  ]);
  if (!chart || !input) {
    await failFortune(fortune.id, "saju chart or input not found");
    throw new Error(`chart/input not found for user ${userId}`);
  }

  const todayGanzhi = computeTodayGanzhi({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    calendarType: input.calendarType,
    gender: input.gender,
    forDate,
  });

  try {
    const result = await generateDailyFortune(
      chart.compactReading,
      forDate,
      todayGanzhi,
    );
    await db
      .update(schema.dailyFortunes)
      .set({
        status: "completed",
        score: result.score,
        sections: result.sections,
        rawResponse: result.rawResponse,
        model: result.model,
        completedAt: new Date(),
        updatedAt: sql`now()`,
      })
      .where(eq(schema.dailyFortunes.id, fortune.id));
    console.log(
      `[worker] daily-fortune completed: user=${userId} date=${forDate} score=${result.score}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failFortune(fortune.id, message);
    throw err;
  }
}

async function failFortune(fortuneId: string, message: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.dailyFortunes)
    .set({
      status: "failed",
      errorMessage: message,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.dailyFortunes.id, fortuneId));
}
