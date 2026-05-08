import { builder } from "../builder.ts";
import { FortuneScoreEnum, GenerationStatusEnum } from "../enums.ts";

type DailyFortuneSections = {
  summary?: string;
  love?: string;
  work?: string;
  health?: string;
  luckyColor?: string;
  luckyNumber?: string;
};

export const DailyFortuneSectionsType = builder
  .objectRef<DailyFortuneSections>("DailyFortuneSections")
  .implement({
    fields: (t) => ({
      summary: t.string({ nullable: true, resolve: (s) => s.summary ?? null }),
      love: t.string({ nullable: true, resolve: (s) => s.love ?? null }),
      work: t.string({ nullable: true, resolve: (s) => s.work ?? null }),
      health: t.string({ nullable: true, resolve: (s) => s.health ?? null }),
      luckyColor: t.string({
        nullable: true,
        resolve: (s) => s.luckyColor ?? null,
      }),
      luckyNumber: t.string({
        nullable: true,
        resolve: (s) => s.luckyNumber ?? null,
      }),
    }),
  });

export const DailyFortuneType = builder.drizzleObject("dailyFortunes", {
  name: "DailyFortune",
  fields: (t) => ({
    id: t.exposeID("id"),
    forDate: t.expose("forDate", { type: "Date" }),
    score: t.expose("score", { type: FortuneScoreEnum, nullable: true }),
    status: t.expose("status", { type: GenerationStatusEnum }),
    sections: t.field({
      type: DailyFortuneSectionsType,
      nullable: true,
      resolve: (f) => f.sections ?? null,
    }),
    completedAt: t.expose("completedAt", {
      type: "DateTime",
      nullable: true,
    }),
  }),
});
