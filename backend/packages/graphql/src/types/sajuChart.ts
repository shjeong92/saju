import { builder } from "../builder.ts";
import { LoadableUserType } from "./loadableUser.ts";

type FiveElements = {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
};

export const FiveElementsType = builder
  .objectRef<FiveElements>("FiveElements")
  .implement({
    fields: (t) => ({
      wood: t.int({ resolve: (e) => e.목 }),
      fire: t.int({ resolve: (e) => e.화 }),
      earth: t.int({ resolve: (e) => e.토 }),
      metal: t.int({ resolve: (e) => e.금 }),
      water: t.int({ resolve: (e) => e.수 }),
    }),
  });

type Pillar = { stem: string; branch: string };

export const PillarType = builder.objectRef<Pillar>("Pillar").implement({
  fields: (t) => ({
    stem: t.exposeString("stem"),
    branch: t.exposeString("branch"),
  }),
});

export const SajuChartType = builder.drizzleObject("sajuCharts", {
  name: "SajuChart",
  fields: (t) => ({
    yearStem: t.exposeString("yearStem"),
    yearBranch: t.exposeString("yearBranch"),
    monthStem: t.exposeString("monthStem"),
    monthBranch: t.exposeString("monthBranch"),
    dayStem: t.exposeString("dayStem"),
    dayBranch: t.exposeString("dayBranch"),
    hourStem: t.exposeString("hourStem", { nullable: true }),
    hourBranch: t.exposeString("hourBranch", { nullable: true }),
    dayMaster: t.exposeString("dayMaster"),
    fiveElements: t.field({
      type: FiveElementsType,
      resolve: (chart) => chart.fiveElements,
    }),
    compactReading: t.exposeString("compactReading"),
    computedAt: t.expose("computedAt", { type: "DateTime" }),
    owner: t.field({
      type: LoadableUserType,
      resolve: (chart) => chart.userId,
    }),
  }),
});
