import { defineRelations } from "drizzle-orm";
import { chatRooms, messages } from "./chat.ts";
import { matches } from "./matches.ts";
import {
  compatibilityReports,
  dailyFortunes,
  personalReadings,
} from "./readings.ts";
import { sajuCharts, sajuInputs, userProfiles, users } from "./users.ts";

const tables = {
  users,
  sajuInputs,
  sajuCharts,
  userProfiles,
  personalReadings,
  compatibilityReports,
  dailyFortunes,
  matches,
  chatRooms,
  messages,
};

export const relations = defineRelations(tables, (r) => ({
  users: {
    sajuInput: r.one.sajuInputs({
      from: r.users.id,
      to: r.sajuInputs.userId,
    }),
    sajuChart: r.one.sajuCharts({
      from: r.users.id,
      to: r.sajuCharts.userId,
    }),
    profile: r.one.userProfiles({
      from: r.users.id,
      to: r.userProfiles.userId,
    }),
    personalReadings: r.many.personalReadings({
      from: r.users.id,
      to: r.personalReadings.userId,
    }),
    dailyFortunes: r.many.dailyFortunes({
      from: r.users.id,
      to: r.dailyFortunes.userId,
    }),
    matchesAsA: r.many.matches({
      from: r.users.id,
      to: r.matches.userAId,
      alias: "matchesA",
    }),
    matchesAsB: r.many.matches({
      from: r.users.id,
      to: r.matches.userBId,
      alias: "matchesB",
    }),
    chatRoomsAsA: r.many.chatRooms({
      from: r.users.id,
      to: r.chatRooms.userAId,
      alias: "chatRoomsA",
    }),
    chatRoomsAsB: r.many.chatRooms({
      from: r.users.id,
      to: r.chatRooms.userBId,
      alias: "chatRoomsB",
    }),
    messagesSent: r.many.messages({
      from: r.users.id,
      to: r.messages.senderId,
    }),
  },
  sajuInputs: {
    user: r.one.users({
      from: r.sajuInputs.userId,
      to: r.users.id,
    }),
  },
  sajuCharts: {
    user: r.one.users({
      from: r.sajuCharts.userId,
      to: r.users.id,
    }),
  },
  userProfiles: {
    user: r.one.users({
      from: r.userProfiles.userId,
      to: r.users.id,
    }),
  },
  personalReadings: {
    user: r.one.users({
      from: r.personalReadings.userId,
      to: r.users.id,
    }),
  },
  dailyFortunes: {
    user: r.one.users({
      from: r.dailyFortunes.userId,
      to: r.users.id,
    }),
  },
  matches: {
    userA: r.one.users({
      from: r.matches.userAId,
      to: r.users.id,
      alias: "matchesA",
    }),
    userB: r.one.users({
      from: r.matches.userBId,
      to: r.users.id,
      alias: "matchesB",
    }),
    chatRoom: r.one.chatRooms({
      from: r.matches.id,
      to: r.chatRooms.matchId,
    }),
    compatibilityReport: r.one.compatibilityReports({
      from: r.matches.id,
      to: r.compatibilityReports.matchId,
    }),
  },
  compatibilityReports: {
    match: r.one.matches({
      from: r.compatibilityReports.matchId,
      to: r.matches.id,
    }),
  },
  chatRooms: {
    match: r.one.matches({
      from: r.chatRooms.matchId,
      to: r.matches.id,
    }),
    userA: r.one.users({
      from: r.chatRooms.userAId,
      to: r.users.id,
      alias: "chatRoomsA",
    }),
    userB: r.one.users({
      from: r.chatRooms.userBId,
      to: r.users.id,
      alias: "chatRoomsB",
    }),
    messages: r.many.messages({
      from: r.chatRooms.id,
      to: r.messages.roomId,
    }),
  },
  messages: {
    room: r.one.chatRooms({
      from: r.messages.roomId,
      to: r.chatRooms.id,
    }),
    sender: r.one.users({
      from: r.messages.senderId,
      to: r.users.id,
    }),
  },
}));
