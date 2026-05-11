import "./message.ts";
import { builder } from "../builder.ts";
import { LoadableUserType } from "./loadableUser.ts";

export const ChatRoomType = builder.drizzleObject("chatRooms", {
  name: "ChatRoom",
  fields: (t) => ({
    id: t.exposeID("id"),
    matchId: t.exposeID("matchId"),
    lastMessageAt: t.expose("lastMessageAt", {
      type: "DateTime",
      nullable: true,
    }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    partner: t.field({
      type: LoadableUserType,
      resolve: (room, _args, ctx) => {
        if (!ctx.userId) throw new Error("unauthorized");
        return room.userAId === ctx.userId ? room.userBId : room.userAId;
      },
    }),
    unreadByMe: t.boolean({
      resolve: (room, _args, ctx) => {
        if (!ctx.userId) throw new Error("unauthorized");
        const lastMsg = room.lastMessageAt;
        if (!lastMsg) return false;
        if (room.lastMessageSenderId === ctx.userId) return false;
        const myRead =
          room.userAId === ctx.userId ? room.readByA : room.readByB;
        if (!myRead) return true;
        return lastMsg > myRead;
      },
    }),
    messages: t.relation("messages", {
      query: () => ({
        orderBy: { createdAt: "asc" },
        limit: 100,
      }),
    }),
  }),
});
