import { getDb, schema } from "@saju/db";
import { computeCompatibility, type HeavenlyStem } from "@saju/saju";
import type { Job } from "bullmq";
import { type AiCompatibilityData } from "./compatibility.ts";

export type MatchCurateData = {
  userId: string;
  topK: number;
};

type Candidate = {
  userId: string;
  chart: typeof schema.sajuCharts.$inferSelect;
  profile: typeof schema.userProfiles.$inferSelect;
  gender: "male" | "female";
};

export type EnqueueCompatibilityFn = (
  data: AiCompatibilityData,
  jobId: string,
) => Promise<void>;

export async function handleMatchCurate(
  job: Job<MatchCurateData>,
  enqueueCompatibility: EnqueueCompatibilityFn,
): Promise<void> {
  const { userId, topK } = job.data;
  const db = getDb();

  const me = await loadCandidate(userId);
  if (!me) {
    console.warn(`[worker] match.curate skipped: user ${userId} has no chart/profile`);
    return;
  }

  const others = await db.query.users.findMany({
    where: { NOT: { id: userId } },
    with: {
      sajuChart: true,
      profile: true,
      sajuInput: true,
    },
  });

  const candidates: Candidate[] = [];
  for (const u of others) {
    if (!u.sajuChart || !u.profile || !u.sajuInput) continue;
    if (!matchesGenderPreference(me, { profile: u.profile, sajuInput: u.sajuInput })) continue;
    candidates.push({
      userId: u.id,
      chart: u.sajuChart,
      profile: u.profile,
      gender: u.sajuInput.gender,
    });
  }

  if (candidates.length === 0) {
    console.log(`[worker] match.curate user=${userId}: no candidates`);
    return;
  }

  const scored = candidates
    .map((c) => {
      const result = computeCompatibility(
        {
          dayStem: me.chart.dayStem as HeavenlyStem,
          dayBranch: me.chart.dayBranch,
          monthBranch: me.chart.monthBranch,
          fiveElements: me.chart.fiveElements,
        },
        {
          dayStem: c.chart.dayStem as HeavenlyStem,
          dayBranch: c.chart.dayBranch,
          monthBranch: c.chart.monthBranch,
          fiveElements: c.chart.fiveElements,
        },
      );
      return { candidate: c, result };
    })
    .sort((a, b) => b.result.total - a.result.total)
    .slice(0, topK);

  let inserted = 0;
  for (const { candidate, result } of scored) {
    const [aId, bId] =
      userId < candidate.userId ? [userId, candidate.userId] : [candidate.userId, userId];

    const existing = await db.query.matches.findFirst({
      where: { userAId: aId, userBId: bId },
    });
    if (existing) continue;

    const [match] = await db
      .insert(schema.matches)
      .values({
        userAId: aId,
        userBId: bId,
        score: result.total,
        breakdown: {
          ilganHap: result.breakdown.ilganHap,
          fiveElementBalance: result.breakdown.fiveElementBalance,
          tenGodSynergy: result.breakdown.tenGodSynergy,
          branchRelation: result.breakdown.branchRelation,
          notes: result.breakdown.notes,
        },
      })
      .returning({ id: schema.matches.id });

    if (!match) continue;

    const [report] = await db
      .insert(schema.compatibilityReports)
      .values({
        matchId: match.id,
        status: "pending",
        score: String(result.total),
      })
      .returning({ id: schema.compatibilityReports.id });

    if (report) {
      await enqueueCompatibility(
        { matchId: match.id, reportId: report.id },
        `compatibility:${match.id}:v1`,
      );
    }
    inserted += 1;
  }

  console.log(
    `[worker] match.curate user=${userId}: ${candidates.length} candidates, ${inserted} new matches inserted`,
  );
}

async function loadCandidate(uid: string): Promise<{
  chart: typeof schema.sajuCharts.$inferSelect;
  profile: typeof schema.userProfiles.$inferSelect;
  gender: "male" | "female";
} | null> {
  const db = getDb();
  const u = await db.query.users.findFirst({
    where: { id: uid },
    with: { sajuChart: true, profile: true, sajuInput: true },
  });
  if (!u?.sajuChart || !u.profile || !u.sajuInput) return null;
  return {
    chart: u.sajuChart,
    profile: u.profile,
    gender: u.sajuInput.gender,
  };
}

function matchesGenderPreference(
  me: { profile: typeof schema.userProfiles.$inferSelect; gender: "male" | "female" },
  other: {
    sajuInput: typeof schema.sajuInputs.$inferSelect;
    profile: typeof schema.userProfiles.$inferSelect;
  },
): boolean {
  if (me.profile.interestedGender !== other.sajuInput.gender) return false;
  if (other.profile.interestedGender !== me.gender) return false;
  return true;
}
