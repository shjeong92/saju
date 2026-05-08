import { builder } from "../builder.ts";
import { ChatRoomType } from "../types/chatRoom.ts";
import { DailyFortuneType } from "../types/dailyFortune.ts";
import { MatchType } from "../types/match.ts";
import { PersonalReadingType } from "../types/personalReading.ts";
import { UserType } from "../types/user.ts";

const TODAY = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

builder.queryType({});

builder.queryFields((t) => ({
  me: t.drizzleField({
    type: UserType,
    nullable: true,
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      const row = await ctx.db.query.users.findFirst(
        query({ where: { id: ctx.userId } }),
      );
      return row ?? null;
    },
  }),

  myReading: t.drizzleField({
    type: PersonalReadingType,
    nullable: true,
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      const row = await ctx.db.query.personalReadings.findFirst(
        query({
          where: { userId: ctx.userId },
          orderBy: { createdAt: "desc" },
        }),
      );
      return row ?? null;
    },
  }),

  myDailyFortune: t.drizzleField({
    type: DailyFortuneType,
    nullable: true,
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      const row = await ctx.db.query.dailyFortunes.findFirst(
        query({
          where: {
            userId: ctx.userId,
            forDate: TODAY(),
          },
        }),
      );
      return row ?? null;
    },
  }),

  matches: t.drizzleField({
    type: [MatchType],
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return [];
      return await ctx.db.query.matches.findMany(
        query({
          where: {
            OR: [{ userAId: ctx.userId }, { userBId: ctx.userId }],
          },
          orderBy: { score: "desc" },
        }),
      );
    },
  }),

  match: t.drizzleField({
    type: MatchType,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { id }, ctx) => {
      if (!ctx.userId) return null;
      const row = await ctx.db.query.matches.findFirst(
        query({
          where: {
            id: id as string,
            OR: [{ userAId: ctx.userId }, { userBId: ctx.userId }],
          },
        }),
      );
      return row ?? null;
    },
  }),

  myChatRooms: t.drizzleField({
    type: [ChatRoomType],
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return [];
      return await ctx.db.query.chatRooms.findMany(
        query({
          where: {
            OR: [{ userAId: ctx.userId }, { userBId: ctx.userId }],
          },
          orderBy: { lastMessageAt: "desc" },
        }),
      );
    },
  }),

  chatRoom: t.drizzleField({
    type: ChatRoomType,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    authScopes: { authenticated: true },
    resolve: async (query, _root, { id }, ctx) => {
      if (!ctx.userId) return null;
      const row = await ctx.db.query.chatRooms.findFirst(
        query({
          where: {
            id: id as string,
            OR: [{ userAId: ctx.userId }, { userBId: ctx.userId }],
          },
        }),
      );
      return row ?? null;
    },
  }),

  ping: t.string({ resolve: () => "pong" }),
}));
