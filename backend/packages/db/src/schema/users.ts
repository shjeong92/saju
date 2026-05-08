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
    fiveElements: jsonb("five_elements").notNull(),
    tenGods: jsonb("ten_gods").notNull(),
    sipsinCounts: jsonb("sipsin_counts").notNull(),
    relations: jsonb("relations").notNull(),
    rawChart: jsonb("raw_chart").notNull(),
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
