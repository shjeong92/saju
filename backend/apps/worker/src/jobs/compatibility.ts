import { generateCompatibility } from "@saju/ai";
import { getDb, schema } from "@saju/db";
import { eq, sql } from "drizzle-orm";
import type { Job } from "bullmq";
import { publishReportReady } from "../pubsub.ts";

export type AiCompatibilityData = {
  matchId: string;
  reportId: string;
};

export async function handleCompatibility(
  job: Job<AiCompatibilityData>,
): Promise<void> {
  const { matchId, reportId } = job.data;
  const db = getDb();

  await db
    .update(schema.compatibilityReports)
    .set({ status: "generating", updatedAt: sql`now()` })
    .where(eq(schema.compatibilityReports.id, reportId));

  const match = await db.query.matches.findFirst({
    where: { id: matchId },
  });
  if (!match) {
    await failReport(reportId, `match not found: ${matchId}`);
    throw new Error(`match not found: ${matchId}`);
  }

  const [chartA, chartB] = await Promise.all([
    db.query.sajuCharts.findFirst({ where: { userId: match.userAId } }),
    db.query.sajuCharts.findFirst({ where: { userId: match.userBId } }),
  ]);

  if (!chartA || !chartB) {
    await failReport(reportId, "saju chart missing for one of users");
    throw new Error(`chart missing for match=${matchId}`);
  }

  try {
    const result = await generateCompatibility(
      chartA.compactReading,
      chartB.compactReading,
      {
        total: match.score,
        ilganHap: match.breakdown.ilganHap,
        fiveElementBalance: match.breakdown.fiveElementBalance,
        tenGodSynergy: match.breakdown.tenGodSynergy,
        branchRelation: match.breakdown.branchRelation,
        notes: match.breakdown.notes ?? [],
      },
    );
    await db
      .update(schema.compatibilityReports)
      .set({
        status: "completed",
        score: String(match.score),
        summary: result.summary,
        rawResponse: result.rawResponse,
        model: result.model,
        completedAt: new Date(),
        updatedAt: sql`now()`,
      })
      .where(eq(schema.compatibilityReports.id, reportId));
    await publishReportReady(matchId, reportId);
    console.log(`[worker] compatibility completed: report=${reportId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failReport(reportId, message);
    throw err;
  }
}

async function failReport(reportId: string, message: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.compatibilityReports)
    .set({
      status: "failed",
      errorMessage: message,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.compatibilityReports.id, reportId));
}
