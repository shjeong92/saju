import { builder } from "../builder.ts";
import { MessageTypeEnum } from "../enums.ts";
import { LoadableUserType } from "./loadableUser.ts";

export const MessageType = builder.drizzleObject("messages", {
  name: "Message",
  fields: (t) => ({
    id: t.exposeID("id"),
    roomId: t.exposeID("roomId"),
    type: t.expose("type", { type: MessageTypeEnum }),
    body: t.exposeString("body"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    sender: t.field({
      type: LoadableUserType,
      nullable: true,
      resolve: (msg) => msg.senderId,
    }),
  }),
});
