import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { messageTypeEnum } from "./enums.ts";
import { matches } from "./matches.ts";
import { users } from "./users.ts";

export const chatRooms = pgTable(
  "chat_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .unique()
      .references(() => matches.id, { onDelete: "cascade" }),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    readByA: timestamp("read_by_a", { withTimezone: true }),
    readByB: timestamp("read_by_b", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("chat_rooms_user_a_idx").on(t.userAId),
    index("chat_rooms_user_b_idx").on(t.userBId),
  ],
);

type SystemMessageMeta = {
  kind?: "match_intro" | "first_date_idea" | "compatibility_ready";
  payload?: Record<string, unknown>;
};

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: messageTypeEnum("type").notNull().default("user"),
    body: text("body").notNull(),
    meta: jsonb("meta").$type<SystemMessageMeta>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("messages_room_id_created_at_idx").on(t.roomId, t.createdAt),
  ],
);

export type ChatRoom = typeof chatRooms.$inferSelect;
export type NewChatRoom = typeof chatRooms.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
