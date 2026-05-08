import { schema } from "@saju/db";
import { inArray } from "drizzle-orm";
import { builder } from "../builder.ts";

export const LoadableUserType = builder.loadableObject("LoadableUser", {
  load: async (ids: readonly string[], ctx) => {
    const rows = await ctx.db
      .select()
      .from(schema.users)
      .where(inArray(schema.users.id, ids as string[]));
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    return ids.map(
      (id) => byId.get(id) ?? new Error(`user not found: ${id}`),
    );
  },
  toKey: (user) => user.id,
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    imageUrl: t.exposeString("imageUrl", { nullable: true }),
  }),
});
