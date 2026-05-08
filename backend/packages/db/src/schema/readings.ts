import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { fortuneScoreEnum, generationStatusEnum } from "./enums.ts";
import { users } from "./users.ts";

type ReadingSections = {
  overview?: string;
  career?: string;
  love?: string;
  health?: string;
  wealth?: string;
  caution?: string;
};

export const personalReadings = pgTable(
  "personal_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: generationStatusEnum("status").notNull().default("pending"),
    model: text("model"),
    promptTokens: text("prompt_tokens"),
    completionTokens: text("completion_tokens"),
    sections: jsonb("sections").$type<ReadingSections>(),
    rawResponse: text("raw_response"),
    errorMessage: text("error_message"),
    version: text("version").notNull().default("v1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("personal_readings_user_id_idx").on(t.userId),
    unique("personal_readings_user_version_key").on(t.userId, t.version),
  ],
);

type CompatibilitySummary = {
  overall?: string;
  strengths?: string[];
  cautions?: string[];
  firstDateIdeas?: string[];
  conversationStarters?: string[];
};

export const compatibilityReports = pgTable(
  "compatibility_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull(),
    status: generationStatusEnum("status").notNull().default("pending"),
    score: text("score"),
    summary: jsonb("summary").$type<CompatibilitySummary>(),
    rawResponse: text("raw_response"),
    errorMessage: text("error_message"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("compatibility_reports_match_id_idx").on(t.matchId)],
);

type DailyFortuneSections = {
  summary?: string;
  love?: string;
  work?: string;
  health?: string;
  luckyColor?: string;
  luckyNumber?: string;
};

export const dailyFortunes = pgTable(
  "daily_fortunes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forDate: date("for_date").notNull(),
    score: fortuneScoreEnum("score"),
    status: generationStatusEnum("status").notNull().default("pending"),
    sections: jsonb("sections").$type<DailyFortuneSections>(),
    rawResponse: text("raw_response"),
    errorMessage: text("error_message"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    unique("daily_fortunes_user_date_key").on(t.userId, t.forDate),
    index("daily_fortunes_for_date_idx").on(t.forDate),
  ],
);

export type PersonalReading = typeof personalReadings.$inferSelect;
export type NewPersonalReading = typeof personalReadings.$inferInsert;
export type CompatibilityReport = typeof compatibilityReports.$inferSelect;
export type NewCompatibilityReport = typeof compatibilityReports.$inferInsert;
export type DailyFortune = typeof dailyFortunes.$inferSelect;
export type NewDailyFortune = typeof dailyFortunes.$inferInsert;
