CREATE TABLE IF NOT EXISTS "compatibility_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"score" text,
	"summary" jsonb,
	"raw_response" text,
	"error_message" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_fortunes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"for_date" date NOT NULL,
	"score" "fortune_score",
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"sections" jsonb,
	"raw_response" text,
	"error_message" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "daily_fortunes_user_date_key" UNIQUE("user_id","for_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personal_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"model" text,
	"prompt_tokens" text,
	"completion_tokens" text,
	"sections" jsonb,
	"raw_response" text,
	"error_message" text,
	"version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "personal_readings_user_version_key" UNIQUE("user_id","version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"status" "match_status" DEFAULT 'suggested' NOT NULL,
	"a_liked" boolean DEFAULT false NOT NULL,
	"b_liked" boolean DEFAULT false NOT NULL,
	"a_dismissed" boolean DEFAULT false NOT NULL,
	"b_dismissed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_user_pair_key" UNIQUE("user_a_id","user_b_id"),
	CONSTRAINT "matches_user_order_check" CHECK ("matches"."user_a_id" < "matches"."user_b_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"read_by_a" timestamp with time zone,
	"read_by_b" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_rooms_match_id_unique" UNIQUE("match_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"sender_id" uuid,
	"type" "message_type" DEFAULT 'user' NOT NULL,
	"body" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_name" text NOT NULL,
	"job_name" text NOT NULL,
	"job_bull_id" text,
	"status" "job_status" NOT NULL,
	"payload" jsonb,
	"attempts_made" text,
	"duration_ms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_fortunes" ADD CONSTRAINT "daily_fortunes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personal_readings" ADD CONSTRAINT "personal_readings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compatibility_reports_match_id_idx" ON "compatibility_reports" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_fortunes_for_date_idx" ON "daily_fortunes" USING btree ("for_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_readings_user_id_idx" ON "personal_readings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_user_a_idx" ON "matches" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_user_b_idx" ON "matches" USING btree ("user_b_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "matches_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_rooms_user_a_idx" ON "chat_rooms" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_rooms_user_b_idx" ON "chat_rooms" USING btree ("user_b_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_room_id_created_at_idx" ON "messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_logs_queue_status_idx" ON "job_logs" USING btree ("queue_name","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_logs_created_at_idx" ON "job_logs" USING btree ("created_at");