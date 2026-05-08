import { schema } from "@saju/db";
import { computeSajuChart } from "@saju/saju";
import type { UserId } from "@saju/shared/types";
import { eq, sql } from "drizzle-orm";
import { builder } from "../builder.ts";
import { CalendarTypeEnum, GenderEnum } from "../enums.ts";
import { Topics } from "../pubsub.ts";
import { ChatRoomType } from "../types/chatRoom.ts";
import { MatchType } from "../types/match.ts";
import { MessageType } from "../types/message.ts";
import { SajuChartType } from "../types/sajuChart.ts";
import { UserProfileType } from "../types/userProfile.ts";

const READING_VERSION = "v1";

function todayInSeoul(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

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

        const today = todayInSeoul();
        await tx
          .insert(schema.dailyFortunes)
          .values({
            userId: ctx.userId as UserId,
            forDate: today,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              schema.dailyFortunes.userId,
              schema.dailyFortunes.forDate,
            ],
          });

        return { readingId: reading.id, forDate: today };
      });

      await ctx.enqueueProfileReading(
        ctx.userId,
        result.readingId,
        READING_VERSION,
      );
      await ctx.enqueueDailyFortune(ctx.userId, result.forDate);
      await ctx.enqueueMatchCurate(ctx.userId, 10);

      const row = await ctx.db.query.sajuCharts.findFirst(
        query({ where: { userId: ctx.userId } }),
      );
      if (!row) throw new Error("saju chart missing after submit");
      return row;
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

      const row = await ctx.db.query.userProfiles.findFirst(
        query({ where: { userId: ctx.userId } }),
      );
      if (!row) throw new Error("user profile missing after update");
      return row;
    },
  }),

  likeMatch: t.drizzleField({
    type: MatchType,
    args: { matchId: t.arg.id({ required: true }) },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { matchId }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      const me = ctx.userId as UserId;

      const txResult = await ctx.db.transaction(async (tx) => {
        const m = await tx.query.matches.findFirst({
          where: { id: matchId as string },
        });
        if (!m) throw new Error("match not found");
        if (m.userAId !== me && m.userBId !== me) throw new Error("forbidden");
        if (m.status === "dismissed" || m.status === "expired") {
          throw new Error(`match is ${m.status}`);
        }

        const isUserA = m.userAId === me;
        const partnerLiked = isUserA ? m.bLiked : m.aLiked;
        const bothLiked = partnerLiked === true;

        await tx
          .update(schema.matches)
          .set({
            ...(isUserA ? { aLiked: true } : { bLiked: true }),
            status: bothLiked ? "matched" : "liked",
            updatedAt: sql`now()`,
          })
          .where(eq(schema.matches.id, m.id));

        let createdRoomId: string | null = null;
        if (bothLiked) {
          const [room] = await tx
            .insert(schema.chatRooms)
            .values({
              matchId: m.id,
              userAId: m.userAId,
              userBId: m.userBId,
            })
            .onConflictDoNothing({ target: schema.chatRooms.matchId })
            .returning({ id: schema.chatRooms.id });
          createdRoomId = room?.id ?? null;
        }

        return { matchId: m.id, partnerId: isUserA ? m.userBId : m.userAId, createdRoomId };
      });

      if (txResult.createdRoomId) {
        const report = await ctx.db.query.compatibilityReports.findFirst({
          where: { matchId: txResult.matchId },
        });
        const intro =
          report?.summary?.firstDateIdeas?.[0] ??
          "두 분의 사주 궁합이 좋아 매칭이 성사됐어요. 즐겁게 대화 시작해보세요!";
        const [systemMsg] = await ctx.db
          .insert(schema.messages)
          .values({
            roomId: txResult.createdRoomId,
            senderId: null,
            type: "system",
            body: intro,
            meta: { kind: "match_intro", payload: { matchId: txResult.matchId } },
          })
          .returning();
        if (systemMsg) {
          await ctx.pubsub.publish(Topics.chatRoom(txResult.createdRoomId), {
            id: systemMsg.id,
            roomId: systemMsg.roomId,
            senderId: systemMsg.senderId,
            type: systemMsg.type,
            body: systemMsg.body,
            createdAtIso: systemMsg.createdAt.toISOString(),
            meta: systemMsg.meta ?? null,
          });
        }
      }

      await ctx.pubsub.publish(Topics.matchSuggested(txResult.partnerId), {
        matchId: txResult.matchId,
      });

      const row = await ctx.db.query.matches.findFirst(
        query({ where: { id: txResult.matchId } }),
      );
      if (!row) throw new Error("match disappeared after update");
      return row;
    },
  }),

  sendMessage: t.drizzleField({
    type: MessageType,
    args: {
      roomId: t.arg.id({ required: true }),
      body: t.arg.string({ required: true }),
    },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { roomId, body }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      const trimmed = body.trim();
      if (trimmed.length === 0) throw new Error("body must not be empty");
      if (trimmed.length > 2000) throw new Error("body too long");

      const me = ctx.userId as UserId;
      const room = await ctx.db.query.chatRooms.findFirst({
        where: { id: roomId as string },
      });
      if (!room) throw new Error("chat room not found");
      if (room.userAId !== me && room.userBId !== me) {
        throw new Error("forbidden");
      }

      const inserted = await ctx.db.transaction(async (tx) => {
        const [msg] = await tx
          .insert(schema.messages)
          .values({
            roomId: room.id,
            senderId: me,
            type: "user",
            body: trimmed,
          })
          .returning();
        if (!msg) throw new Error("message insert failed");
        await tx
          .update(schema.chatRooms)
          .set({ lastMessageAt: msg.createdAt })
          .where(eq(schema.chatRooms.id, room.id));
        return msg;
      });

      await ctx.pubsub.publish(Topics.chatRoom(room.id), {
        id: inserted.id,
        roomId: inserted.roomId,
        senderId: inserted.senderId,
        type: inserted.type,
        body: inserted.body,
        createdAtIso: inserted.createdAt.toISOString(),
        meta: inserted.meta ?? null,
      });

      const row = await ctx.db.query.messages.findFirst(
        query({ where: { id: inserted.id } }),
      );
      if (!row) throw new Error("message disappeared after insert");
      return row;
    },
  }),

  markRoomRead: t.drizzleField({
    type: ChatRoomType,
    args: { roomId: t.arg.id({ required: true }) },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { roomId }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      const me = ctx.userId as UserId;
      const room = await ctx.db.query.chatRooms.findFirst({
        where: { id: roomId as string },
      });
      if (!room) throw new Error("chat room not found");
      if (room.userAId !== me && room.userBId !== me) {
        throw new Error("forbidden");
      }

      const isUserA = room.userAId === me;
      await ctx.db
        .update(schema.chatRooms)
        .set(isUserA ? { readByA: sql`now()` } : { readByB: sql`now()` })
        .where(eq(schema.chatRooms.id, room.id));

      const row = await ctx.db.query.chatRooms.findFirst(
        query({ where: { id: room.id } }),
      );
      if (!row) throw new Error("chat room disappeared after mark read");
      return row;
    },
  }),

  dismissMatch: t.drizzleField({
    type: MatchType,
    args: { matchId: t.arg.id({ required: true }) },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { matchId }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      const me = ctx.userId as UserId;

      const id = await ctx.db.transaction(async (tx) => {
        const m = await tx.query.matches.findFirst({
          where: { id: matchId as string },
        });
        if (!m) throw new Error("match not found");
        if (m.userAId !== me && m.userBId !== me) throw new Error("forbidden");

        const isUserA = m.userAId === me;
        await tx
          .update(schema.matches)
          .set({
            ...(isUserA ? { aDismissed: true } : { bDismissed: true }),
            status: "dismissed",
            updatedAt: sql`now()`,
          })
          .where(eq(schema.matches.id, m.id));
        return m.id;
      });

      const row = await ctx.db.query.matches.findFirst(
        query({ where: { id } }),
      );
      if (!row) throw new Error("match disappeared after dismiss");
      return row;
    },
  }),
}));
