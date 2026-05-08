import { builder } from "../builder.ts";

export const UserType = builder.drizzleObject("users", {
  name: "User",
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    email: t.exposeString("email", { nullable: true }),
    imageUrl: t.exposeString("imageUrl", { nullable: true }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    profile: t.relation("profile", { nullable: true }),
    sajuChart: t.relation("sajuChart", { nullable: true }),
  }),
});
