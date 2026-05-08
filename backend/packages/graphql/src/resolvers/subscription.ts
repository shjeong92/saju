import { builder } from "../builder.ts";
import { Topics } from "../pubsub.ts";
import { CompatibilityReportType } from "../types/compatibilityReport.ts";
import { MatchType } from "../types/match.ts";
import { MessageType } from "../types/message.ts";
import { PersonalReadingType } from "../types/personalReading.ts";

builder.subscriptionType({});

builder.subscriptionFields((t) => ({
  messageAdded: t.field({
    type: MessageType,
    args: { roomId: t.arg.id({ required: true }) },
    authScopes: { authenticated: true },
    subscribe: async (_root, { roomId }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      const room = await ctx.db.query.chatRooms.findFirst({
        where: { id: roomId as string },
      });
      if (!room) throw new Error("chat room not found");
      if (room.userAId !== ctx.userId && room.userBId !== ctx.userId) {
        throw new Error("forbidden");
      }
      return ctx.pubsub.subscribe(Topics.chatRoom(roomId as string));
    },
    resolve: async (payload, _args, ctx) => {
      const row = await ctx.db.query.messages.findFirst({
        where: { id: payload.id },
      });
      if (!row) throw new Error(`message ${payload.id} disappeared`);
      return row;
    },
  }),

  matchSuggested: t.field({
    type: MatchType,
    authScopes: { authenticated: true },
    subscribe: (_root, _args, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      return ctx.pubsub.subscribe(Topics.matchSuggested(ctx.userId));
    },
    resolve: async (payload, _args, ctx) => {
      const row = await ctx.db.query.matches.findFirst({
        where: { id: payload.matchId },
      });
      if (!row) throw new Error(`match ${payload.matchId} disappeared`);
      return row;
    },
  }),

  readingReady: t.field({
    type: PersonalReadingType,
    authScopes: { authenticated: true },
    subscribe: (_root, _args, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      return ctx.pubsub.subscribe(Topics.readingReady(ctx.userId));
    },
    resolve: async (payload, _args, ctx) => {
      const row = await ctx.db.query.personalReadings.findFirst({
        where: { id: payload.readingId },
      });
      if (!row) throw new Error(`reading ${payload.readingId} disappeared`);
      return row;
    },
  }),

  reportReady: t.field({
    type: CompatibilityReportType,
    args: { matchId: t.arg.id({ required: true }) },
    authScopes: { authenticated: true },
    subscribe: async (_root, { matchId }, ctx) => {
      if (!ctx.userId) throw new Error("unauthorized");
      const m = await ctx.db.query.matches.findFirst({
        where: { id: matchId as string },
      });
      if (!m) throw new Error("match not found");
      if (m.userAId !== ctx.userId && m.userBId !== ctx.userId) {
        throw new Error("forbidden");
      }
      return ctx.pubsub.subscribe(Topics.reportReady(matchId as string));
    },
    resolve: async (payload, _args, ctx) => {
      const row = await ctx.db.query.compatibilityReports.findFirst({
        where: { id: payload.reportId },
      });
      if (!row) throw new Error(`report ${payload.reportId} disappeared`);
      return row;
    },
  }),
}));
