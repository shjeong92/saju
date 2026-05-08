import { builder } from "../builder.ts";
import { DailyFortuneType } from "../types/dailyFortune.ts";
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
    resolve: (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      return ctx.db.query.users.findFirst(
        query({ where: { id: ctx.userId } }),
      ) as ReturnType<typeof ctx.db.query.users.findFirst>;
    },
  }),

  myReading: t.drizzleField({
    type: PersonalReadingType,
    nullable: true,
    authScopes: { authenticated: true },
    resolve: (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      return ctx.db.query.personalReadings.findFirst(
        query({
          where: { userId: ctx.userId },
          orderBy: { createdAt: "desc" },
        }),
      ) as ReturnType<typeof ctx.db.query.personalReadings.findFirst>;
    },
  }),

  myDailyFortune: t.drizzleField({
    type: DailyFortuneType,
    nullable: true,
    authScopes: { authenticated: true },
    resolve: (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      return ctx.db.query.dailyFortunes.findFirst(
        query({
          where: {
            userId: ctx.userId,
            forDate: TODAY(),
          },
        }),
      ) as ReturnType<typeof ctx.db.query.dailyFortunes.findFirst>;
    },
  }),

  ping: t.string({ resolve: () => "pong" }),
}));
