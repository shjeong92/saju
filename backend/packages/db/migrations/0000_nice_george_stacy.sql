CREATE TYPE "public"."auth_provider" AS ENUM('kakao', 'google');--> statement-breakpoint
CREATE TYPE "public"."calendar_type" AS ENUM('solar', 'lunar', 'lunar_leap');--> statement-breakpoint
CREATE TYPE "public"."fortune_score" AS ENUM('great', 'good', 'normal', 'caution', 'bad');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('suggested', 'liked', 'matched', 'dismissed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saju_charts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"year_stem" text NOT NULL,
	"year_branch" text NOT NULL,
	"month_stem" text NOT NULL,
	"month_branch" text NOT NULL,
	"day_stem" text NOT NULL,
	"day_branch" text NOT NULL,
	"hour_stem" text,
	"hour_branch" text,
	"day_master" text NOT NULL,
	"five_elements" jsonb NOT NULL,
	"ten_gods" jsonb NOT NULL,
	"sipsin_counts" jsonb NOT NULL,
	"relations" jsonb NOT NULL,
	"raw_chart" jsonb NOT NULL,
	"compact_reading" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saju_inputs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"birth_date" date NOT NULL,
	"birth_time" time,
	"calendar_type" "calendar_type" NOT NULL,
	"gender" "gender" NOT NULL,
	"birthplace" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"bio" text,
	"interested_gender" "gender" NOT NULL,
	"age_range_min" integer NOT NULL,
	"age_range_max" integer NOT NULL,
	"is_profile_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_id" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"image_url" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_provider_provider_id_key" UNIQUE("provider","provider_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saju_charts" ADD CONSTRAINT "saju_charts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saju_inputs" ADD CONSTRAINT "saju_inputs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saju_charts_day_master_idx" ON "saju_charts" USING btree ("day_master");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users" USING btree ("email") WHERE "users"."email" is not null;