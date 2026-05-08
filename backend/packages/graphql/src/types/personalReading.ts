import { builder } from "../builder.ts";
import { GenerationStatusEnum } from "../enums.ts";

type ReadingSections = {
  overview?: string;
  career?: string;
  love?: string;
  health?: string;
  wealth?: string;
  caution?: string;
};

export const ReadingSectionsType = builder
  .objectRef<ReadingSections>("ReadingSections")
  .implement({
    fields: (t) => ({
      overview: t.string({ nullable: true, resolve: (s) => s.overview ?? null }),
      career: t.string({ nullable: true, resolve: (s) => s.career ?? null }),
      love: t.string({ nullable: true, resolve: (s) => s.love ?? null }),
      health: t.string({ nullable: true, resolve: (s) => s.health ?? null }),
      wealth: t.string({ nullable: true, resolve: (s) => s.wealth ?? null }),
      caution: t.string({ nullable: true, resolve: (s) => s.caution ?? null }),
    }),
  });

export const PersonalReadingType = builder.drizzleObject("personalReadings", {
  name: "PersonalReading",
  fields: (t) => ({
    id: t.exposeID("id"),
    status: t.expose("status", { type: GenerationStatusEnum }),
    version: t.exposeString("version"),
    sections: t.field({
      type: ReadingSectionsType,
      nullable: true,
      resolve: (r) => r.sections ?? null,
    }),
    errorMessage: t.exposeString("errorMessage", { nullable: true }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    completedAt: t.expose("completedAt", {
      type: "DateTime",
      nullable: true,
    }),
  }),
});
