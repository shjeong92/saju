import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { jobStatusEnum } from "./enums.ts";

type JobLogPayload = {
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string; stack?: string };
};

export const jobLogs = pgTable(
  "job_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueName: text("queue_name").notNull(),
    jobName: text("job_name").notNull(),
    jobBullId: text("job_bull_id"),
    status: jobStatusEnum("status").notNull(),
    payload: jsonb("payload").$type<JobLogPayload>(),
    attemptsMade: text("attempts_made"),
    durationMs: text("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("job_logs_queue_status_idx").on(t.queueName, t.status),
    index("job_logs_created_at_idx").on(t.createdAt),
  ],
);

export type JobLog = typeof jobLogs.$inferSelect;
export type NewJobLog = typeof jobLogs.$inferInsert;
