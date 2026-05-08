import { pgEnum } from "drizzle-orm/pg-core";

export const authProviderEnum = pgEnum("auth_provider", ["google"]);

export const genderEnum = pgEnum("gender", ["male", "female"]);

export const calendarTypeEnum = pgEnum("calendar_type", [
  "solar",
  "lunar",
  "lunar_leap",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "suggested",
  "liked",
  "matched",
  "dismissed",
  "expired",
]);

export const messageTypeEnum = pgEnum("message_type", ["user", "system"]);

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "generating",
  "completed",
  "failed",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const fortuneScoreEnum = pgEnum("fortune_score", [
  "great",
  "good",
  "normal",
  "caution",
  "bad",
]);
