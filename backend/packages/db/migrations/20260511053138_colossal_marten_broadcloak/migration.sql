ALTER TABLE "chat_rooms" ADD COLUMN "last_message_sender_id" uuid;--> statement-breakpoint
DROP INDEX "users_email_key";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email") WHERE "email" is not null;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_last_message_sender_id_users_id_fkey" FOREIGN KEY ("last_message_sender_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_user_order_check", ADD CONSTRAINT "matches_user_order_check" CHECK ("user_a_id" < "user_b_id");