import { generateProfileReading } from "@saju/ai";
import { getDb, schema } from "@saju/db";
import { eq, sql } from "drizzle-orm";
import type { Job } from "bullmq";

export type AiProfileReadingData = {
  userId: string;
  readingId: string;
  version: string;
};

export async function handleProfileReading(
  job: Job<AiProfileReadingData>,
): Promise<void> {
  const { userId, readingId } = job.data;
  const db = getDb();

  await db
    .update(schema.personalReadings)
    .set({ status: "generating", updatedAt: sql`now()` })
    .where(eq(schema.personalReadings.id, readingId));

  const chart = await db.query.sajuCharts.findFirst({
    where: { userId },
  });
  if (!chart) {
    await db
      .update(schema.personalReadings)
      .set({
        status: "failed",
        errorMessage: "saju chart not found",
        updatedAt: sql`now()`,
      })
      .where(eq(schema.personalReadings.id, readingId));
    throw new Error(`saju chart not found for user ${userId}`);
  }

  try {
    const result = await generateProfileReading(chart.compactReading);
    await db
      .update(schema.personalReadings)
      .set({
        status: "completed",
        sections: result.sections,
        rawResponse: result.rawResponse,
        model: result.model,
        promptTokens: result.promptTokens?.toString() ?? null,
        completionTokens: result.completionTokens?.toString() ?? null,
        completedAt: new Date(),
        updatedAt: sql`now()`,
      })
      .where(eq(schema.personalReadings.id, readingId));
    console.log(`[worker] profile-reading completed: reading=${readingId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.personalReadings)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: sql`now()`,
      })
      .where(eq(schema.personalReadings.id, readingId));
    throw err;
  }
}
