import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { schema } from "@saju/db";
import { computeSajuChart } from "@saju/saju";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.ts";
import { getAiQueue, profileReadingJobId } from "../queues/index.ts";
import type { AppEnv } from "../types.ts";

const submitSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM").nullable().optional(),
  calendarType: z.enum(["solar", "lunar", "lunar_leap"]),
  gender: z.enum(["male", "female"]),
  birthplace: z.string().max(200).nullable().optional(),
  nickname: z.string().min(1).max(40),
  bio: z.string().max(500).nullable().optional(),
  interestedGender: z.enum(["male", "female"]),
  ageRangeMin: z.number().int().min(18).max(99),
  ageRangeMax: z.number().int().min(18).max(99),
});

const READING_VERSION = "v1";

export const sajuRoutes = new Hono<AppEnv>()
  .use("*", requireAuth)
  .post("/", zValidator("json", submitSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const input = c.req.valid("json");

    if (input.ageRangeMax < input.ageRangeMin) {
      return c.json({ error: "ageRangeMax must be >= ageRangeMin" }, 400);
    }

    const chart = computeSajuChart({
      birthDate: input.birthDate,
      birthTime: input.birthTime ?? null,
      calendarType: input.calendarType,
      gender: input.gender,
    });

    const db = c.get("db");

    const result = await db.transaction(async (tx) => {
      await tx
        .insert(schema.sajuInputs)
        .values({
          userId: user.userId,
          birthDate: input.birthDate,
          birthTime: input.birthTime ?? null,
          calendarType: input.calendarType,
          gender: input.gender,
          birthplace: input.birthplace ?? null,
        })
        .onConflictDoUpdate({
          target: schema.sajuInputs.userId,
          set: {
            birthDate: input.birthDate,
            birthTime: input.birthTime ?? null,
            calendarType: input.calendarType,
            gender: input.gender,
            birthplace: input.birthplace ?? null,
            updatedAt: sql`now()`,
          },
        });

      await tx
        .insert(schema.sajuCharts)
        .values({
          userId: user.userId,
          ...chart,
        })
        .onConflictDoUpdate({
          target: schema.sajuCharts.userId,
          set: {
            ...chart,
            computedAt: sql`now()`,
          },
        });

      await tx
        .insert(schema.userProfiles)
        .values({
          userId: user.userId,
          nickname: input.nickname,
          bio: input.bio ?? null,
          interestedGender: input.interestedGender,
          ageRangeMin: input.ageRangeMin,
          ageRangeMax: input.ageRangeMax,
          isProfileComplete: true,
        })
        .onConflictDoUpdate({
          target: schema.userProfiles.userId,
          set: {
            nickname: input.nickname,
            bio: input.bio ?? null,
            interestedGender: input.interestedGender,
            ageRangeMin: input.ageRangeMin,
            ageRangeMax: input.ageRangeMax,
            isProfileComplete: true,
            updatedAt: sql`now()`,
          },
        });

      const [reading] = await tx
        .insert(schema.personalReadings)
        .values({
          userId: user.userId,
          status: "pending",
          version: READING_VERSION,
        })
        .onConflictDoUpdate({
          target: [
            schema.personalReadings.userId,
            schema.personalReadings.version,
          ],
          set: {
            status: "pending",
            errorMessage: null,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: schema.personalReadings.id });

      if (!reading) throw new Error("personal_readings upsert failed");

      return { readingId: reading.id };
    });

    await getAiQueue().add(
      "profile-reading",
      {
        userId: user.userId,
        readingId: result.readingId,
        version: READING_VERSION,
      },
      {
        jobId: profileReadingJobId(user.userId, READING_VERSION),
      },
    );

    return c.json({
      ok: true,
      chart: {
        yearStem: chart.yearStem,
        yearBranch: chart.yearBranch,
        monthStem: chart.monthStem,
        monthBranch: chart.monthBranch,
        dayStem: chart.dayStem,
        dayBranch: chart.dayBranch,
        hourStem: chart.hourStem,
        hourBranch: chart.hourBranch,
        dayMaster: chart.dayMaster,
        fiveElements: chart.fiveElements,
      },
      reading: {
        id: result.readingId,
        status: "pending",
      },
    });
  })
  .get("/me", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const db = c.get("db");

    const chart = await db.query.sajuCharts.findFirst({
      where: { userId: user.userId },
    });
    const reading = await db.query.personalReadings.findFirst({
      where: { userId: user.userId },
    });

    return c.json({ chart: chart ?? null, reading: reading ?? null });
  });
