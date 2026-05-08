import { relations } from "drizzle-orm";
import { chatRooms, messages } from "./chat.ts";
import { matches } from "./matches.ts";
import {
  compatibilityReports,
  dailyFortunes,
  personalReadings,
} from "./readings.ts";
import { sajuCharts, sajuInputs, userProfiles, users } from "./users.ts";

export const usersRelations = relations(users, ({ one, many }) => ({
  sajuInput: one(sajuInputs, {
    fields: [users.id],
    references: [sajuInputs.userId],
  }),
  sajuChart: one(sajuCharts, {
    fields: [users.id],
    references: [sajuCharts.userId],
  }),
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  personalReadings: many(personalReadings),
  dailyFortunes: many(dailyFortunes),
  matchesAsA: many(matches, { relationName: "matchesA" }),
  matchesAsB: many(matches, { relationName: "matchesB" }),
  chatRoomsAsA: many(chatRooms, { relationName: "chatRoomsA" }),
  chatRoomsAsB: many(chatRooms, { relationName: "chatRoomsB" }),
  messagesSent: many(messages),
}));

export const sajuInputsRelations = relations(sajuInputs, ({ one }) => ({
  user: one(users, {
    fields: [sajuInputs.userId],
    references: [users.id],
  }),
}));

export const sajuChartsRelations = relations(sajuCharts, ({ one }) => ({
  user: one(users, {
    fields: [sajuCharts.userId],
    references: [users.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const personalReadingsRelations = relations(
  personalReadings,
  ({ one }) => ({
    user: one(users, {
      fields: [personalReadings.userId],
      references: [users.id],
    }),
  }),
);

export const dailyFortunesRelations = relations(dailyFortunes, ({ one }) => ({
  user: one(users, {
    fields: [dailyFortunes.userId],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  userA: one(users, {
    fields: [matches.userAId],
    references: [users.id],
    relationName: "matchesA",
  }),
  userB: one(users, {
    fields: [matches.userBId],
    references: [users.id],
    relationName: "matchesB",
  }),
  chatRoom: one(chatRooms, {
    fields: [matches.id],
    references: [chatRooms.matchId],
  }),
  compatibilityReport: one(compatibilityReports, {
    fields: [matches.id],
    references: [compatibilityReports.matchId],
  }),
}));

export const compatibilityReportsRelations = relations(
  compatibilityReports,
  ({ one }) => ({
    match: one(matches, {
      fields: [compatibilityReports.matchId],
      references: [matches.id],
    }),
  }),
);

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  match: one(matches, {
    fields: [chatRooms.matchId],
    references: [matches.id],
  }),
  userA: one(users, {
    fields: [chatRooms.userAId],
    references: [users.id],
    relationName: "chatRoomsA",
  }),
  userB: one(users, {
    fields: [chatRooms.userBId],
    references: [users.id],
    relationName: "chatRoomsB",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  room: one(chatRooms, {
    fields: [messages.roomId],
    references: [chatRooms.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));
