import { builder } from "../builder.ts";
import { GenerationStatusEnum } from "../enums.ts";

type CompatibilitySummary = {
  overall?: string;
  strengths?: string[];
  cautions?: string[];
  firstDateIdeas?: string[];
  conversationStarters?: string[];
};

export const CompatibilitySummaryType = builder
  .objectRef<CompatibilitySummary>("CompatibilitySummary")
  .implement({
    fields: (t) => ({
      overall: t.string({ nullable: true, resolve: (s) => s.overall ?? null }),
      strengths: t.stringList({ resolve: (s) => s.strengths ?? [] }),
      cautions: t.stringList({ resolve: (s) => s.cautions ?? [] }),
      firstDateIdeas: t.stringList({ resolve: (s) => s.firstDateIdeas ?? [] }),
      conversationStarters: t.stringList({
        resolve: (s) => s.conversationStarters ?? [],
      }),
    }),
  });

export const CompatibilityReportType = builder.drizzleObject(
  "compatibilityReports",
  {
    name: "CompatibilityReport",
    fields: (t) => ({
      id: t.exposeID("id"),
      matchId: t.exposeID("matchId"),
      status: t.expose("status", { type: GenerationStatusEnum }),
      score: t.exposeString("score", { nullable: true }),
      summary: t.field({
        type: CompatibilitySummaryType,
        nullable: true,
        resolve: (r) => r.summary ?? null,
      }),
      errorMessage: t.exposeString("errorMessage", { nullable: true }),
      createdAt: t.expose("createdAt", { type: "DateTime" }),
      completedAt: t.expose("completedAt", {
        type: "DateTime",
        nullable: true,
      }),
    }),
  },
);
