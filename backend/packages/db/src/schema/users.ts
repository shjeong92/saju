import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  authProviderEnum,
  calendarTypeEnum,
  genderEnum,
} from "./enums.ts";

type FiveElements = Record<"목" | "화" | "토" | "금" | "수", number>;

type TenGods = {
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  hour: { stem: string; branch: string };
};

type SipsinCounts = Record<string, number>;

type SajuRelationsJson = {
  stemRelations: Array<{
    type: string;
    pillars: [string, string];
    desc: string;
    stems: [string, string];
  }>;
  branchRelations: {
    지장간: Record<string, string>;
    방합: Record<string, string>;
    삼합: Record<string, string>;
    반합: Record<string, string>;
    육합: Record<string, string>;
    충: Record<string, string>;
    형: Record<string, string>;
    파: Record<string, string>;
    해: Record<string, string>;
    원진: Record<string, string>;
    귀문: Record<string, string>;
  };
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: authProviderEnum("provider").notNull(),
    providerId: text("provider_id").notNull(),
    email: text("email"),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    unique("users_provider_provider_id_key").on(t.provider, t.providerId),
    uniqueIndex("users_email_key")
      .on(t.email)
      .where(sql`${t.email} is not null`),
  ],
);

export const sajuInputs = pgTable("saju_inputs", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  birthDate: date("birth_date").notNull(),
  birthTime: time("birth_time"),
  calendarType: calendarTypeEnum("calendar_type").notNull(),
  gender: genderEnum("gender").notNull(),
  birthplace: text("birthplace"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const sajuCharts = pgTable(
  "saju_charts",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    yearStem: text("year_stem").notNull(),
    yearBranch: text("year_branch").notNull(),
    monthStem: text("month_stem").notNull(),
    monthBranch: text("month_branch").notNull(),
    dayStem: text("day_stem").notNull(),
    dayBranch: text("day_branch").notNull(),
    hourStem: text("hour_stem"),
    hourBranch: text("hour_branch"),
    dayMaster: text("day_master").notNull(),
    fiveElements: jsonb("five_elements").$type<FiveElements>().notNull(),
    tenGods: jsonb("ten_gods").$type<TenGods>().notNull(),
    sipsinCounts: jsonb("sipsin_counts").$type<SipsinCounts>().notNull(),
    relations: jsonb("relations").$type<SajuRelationsJson>().notNull(),
    rawChart: jsonb("raw_chart").$type<Record<string, unknown>>().notNull(),
    compactReading: text("compact_reading").notNull(),
    version: integer("version").notNull().default(1),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("saju_charts_day_master_idx").on(t.dayMaster)],
);

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull().unique(),
  bio: text("bio"),
  interestedGender: genderEnum("interested_gender").notNull(),
  ageRangeMin: integer("age_range_min").notNull(),
  ageRangeMax: integer("age_range_max").notNull(),
  isProfileComplete: boolean("is_profile_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SajuInput = typeof sajuInputs.$inferSelect;
export type NewSajuInput = typeof sajuInputs.$inferInsert;
export type SajuChart = typeof sajuCharts.$inferSelect;
export type NewSajuChart = typeof sajuCharts.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
