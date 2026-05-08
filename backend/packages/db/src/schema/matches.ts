import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { matchStatusEnum } from "./enums.ts";
import { users } from "./users.ts";

type ScoreBreakdown = {
  ilganHap: number;
  fiveElementBalance: number;
  tenGodSynergy: number;
  branchRelation: number;
  notes?: string[];
};

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    breakdown: jsonb("breakdown").$type<ScoreBreakdown>().notNull(),
    status: matchStatusEnum("status").notNull().default("suggested"),
    aLiked: boolean("a_liked").notNull().default(false),
    bLiked: boolean("b_liked").notNull().default(false),
    aDismissed: boolean("a_dismissed").notNull().default(false),
    bDismissed: boolean("b_dismissed").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("matches_user_order_check", sql`${t.userAId} < ${t.userBId}`),
    unique("matches_user_pair_key").on(t.userAId, t.userBId),
    index("matches_user_a_idx").on(t.userAId),
    index("matches_user_b_idx").on(t.userBId),
    index("matches_status_idx").on(t.status),
  ],
);

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
