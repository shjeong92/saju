import { schema } from "@saju/db";
import { computeSajuChart } from "@saju/saju";
import type { UserId } from "@saju/shared/types";
import { sql } from "drizzle-orm";
import { builder } from "../builder.ts";
import { CalendarTypeEnum, GenderEnum } from "../enums.ts";
import { SajuChartType } from "../types/sajuChart.ts";
import { UserProfileType } from "../types/userProfile.ts";

const READING_VERSION = "v1";

const SubmitSajuInput = builder.inputType("SubmitSajuInput", {
  fields: (t) => ({
    birthDate: t.string({ required: true }),
    birthTime: t.string({ required: false }),
    calendarType: t.field({ type: CalendarTypeEnum, required: true }),
    gender: t.field({ type: GenderEnum, required: true }),
    birthplace: t.string({ required: false }),
    nickname: t.string({ required: true }),
    bio: t.string({ required: false }),
    interestedGender: t.field({ type: GenderEnum, required: true }),
    ageRangeMin: t.int({ required: true }),
    ageRangeMax: t.int({ required: true }),
  }),
});

const UpdateProfileInput = builder.inputType("UpdateProfileInput", {
  fields: (t) => ({
    nickname: t.string({ required: true }),
    bio: t.string({ required: false }),
    interestedGender: t.field({ type: GenderEnum, required: true }),
    ageRangeMin: t.int({ required: true }),
    ageRangeMax: t.int({ required: true }),
  }),
});

builder.mutationType({});

builder.mutationFields((t) => ({
  submitSaju: t.drizzleField({
    type: SajuChartType,
    args: {
      input: t.arg({ type: SubmitSajuInput, required: true }),
    },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { input }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      if (input.ageRangeMax < input.ageRangeMin) {
        throw new Error("ageRangeMax must be >= ageRangeMin");
      }

      const chart = computeSajuChart({
        birthDate: input.birthDate,
        birthTime: input.birthTime ?? null,
        calendarType: input.calendarType,
        gender: input.gender,
      });

      const result = await ctx.db.transaction(async (tx) => {
        await tx
          .insert(schema.sajuInputs)
          .values({
            userId: ctx.userId as UserId,
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
          .values({ userId: ctx.userId as UserId, ...chart })
          .onConflictDoUpdate({
            target: schema.sajuCharts.userId,
            set: { ...chart, computedAt: sql`now()` },
          });

        await tx
          .insert(schema.userProfiles)
          .values({
            userId: ctx.userId as UserId,
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
            userId: ctx.userId as UserId,
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

      await ctx.enqueueProfileReading(
        ctx.userId,
        result.readingId,
        READING_VERSION,
      );

      return ctx.db.query.sajuCharts.findFirst(
        query({ where: { userId: ctx.userId } }),
      ) as ReturnType<typeof ctx.db.query.sajuCharts.findFirst>;
    },
  }),

  updateProfile: t.drizzleField({
    type: UserProfileType,
    args: {
      input: t.arg({ type: UpdateProfileInput, required: true }),
    },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { input }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      if (input.ageRangeMax < input.ageRangeMin) {
        throw new Error("ageRangeMax must be >= ageRangeMin");
      }

      await ctx.db
        .insert(schema.userProfiles)
        .values({
          userId: ctx.userId,
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

      return ctx.db.query.userProfiles.findFirst(
        query({ where: { userId: ctx.userId } }),
      ) as ReturnType<typeof ctx.db.query.userProfiles.findFirst>;
    },
  }),
}));
