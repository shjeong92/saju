import { builder } from "../builder.ts";

export const UserType = builder.drizzleObject("users", {
  name: "User",
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email", { nullable: true }),
    imageUrl: t.exposeString("imageUrl", { nullable: true }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    profile: t.relation("profile", { nullable: true }),
    sajuChart: t.relation("sajuChart", { nullable: true }),
    displayName: t.string({
      resolve: async (user, _args, ctx) => {
        const profile = await ctx.db.query.userProfiles.findFirst({
          where: { userId: user.id },
          columns: { nickname: true },
        });
        return profile?.nickname ?? "익명";
      },
    }),
  }),
});
