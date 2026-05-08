import { builder } from "../builder.ts";
import { MatchStatusEnum } from "../enums.ts";
import { LoadableUserType } from "./loadableUser.ts";

type ScoreBreakdown = {
  ilganHap: number;
  fiveElementBalance: number;
  tenGodSynergy: number;
  branchRelation: number;
  notes?: string[];
};

export const ScoreBreakdownType = builder
  .objectRef<ScoreBreakdown>("ScoreBreakdown")
  .implement({
    fields: (t) => ({
      ilganHap: t.float({ resolve: (b) => b.ilganHap }),
      fiveElementBalance: t.float({ resolve: (b) => b.fiveElementBalance }),
      tenGodSynergy: t.float({ resolve: (b) => b.tenGodSynergy }),
      branchRelation: t.float({ resolve: (b) => b.branchRelation }),
      notes: t.stringList({ resolve: (b) => b.notes ?? [] }),
    }),
  });

export const MatchType = builder.drizzleObject("matches", {
  name: "Match",
  fields: (t) => ({
    id: t.exposeID("id"),
    score: t.exposeInt("score"),
    breakdown: t.field({
      type: ScoreBreakdownType,
      resolve: (m) => m.breakdown,
    }),
    status: t.expose("status", { type: MatchStatusEnum }),
    aLiked: t.exposeBoolean("aLiked"),
    bLiked: t.exposeBoolean("bLiked"),
    aDismissed: t.exposeBoolean("aDismissed"),
    bDismissed: t.exposeBoolean("bDismissed"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    expiresAt: t.expose("expiresAt", {
      type: "DateTime",
      nullable: true,
    }),
    partner: t.field({
      type: LoadableUserType,
      resolve: (m, _args, ctx) => {
        if (!ctx.userId) throw new Error("unauthorized");
        return m.userAId === ctx.userId ? m.userBId : m.userAId;
      },
    }),
    iLiked: t.boolean({
      resolve: (m, _args, ctx) => {
        if (!ctx.userId) throw new Error("unauthorized");
        return m.userAId === ctx.userId ? m.aLiked : m.bLiked;
      },
    }),
    theyLiked: t.boolean({
      resolve: (m, _args, ctx) => {
        if (!ctx.userId) throw new Error("unauthorized");
        return m.userAId === ctx.userId ? m.bLiked : m.aLiked;
      },
    }),
  }),
});
