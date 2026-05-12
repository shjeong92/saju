import { schema } from "@saju/db";
import { inArray } from "drizzle-orm";
import { builder } from "../builder.ts";

type LoadedUser = {
  id: string;
  imageUrl: string | null;
  displayName: string;
};

export const LoadableUserType = builder.loadableObject("LoadableUser", {
  load: async (ids: readonly string[], ctx): Promise<(LoadedUser | Error)[]> => {
    const [userRows, profileRows] = await Promise.all([
      ctx.db
        .select({
          id: schema.users.id,
          imageUrl: schema.users.imageUrl,
        })
        .from(schema.users)
        .where(inArray(schema.users.id, ids as string[])),
      ctx.db
        .select({
          userId: schema.userProfiles.userId,
          nickname: schema.userProfiles.nickname,
        })
        .from(schema.userProfiles)
        .where(inArray(schema.userProfiles.userId, ids as string[])),
    ]);

    const nicknameByUserId = new Map(
      profileRows.map((p) => [p.userId, p.nickname] as const),
    );
    const byId = new Map(
      userRows.map(
        (u) =>
          [
            u.id,
            {
              id: u.id,
              imageUrl: u.imageUrl,
              displayName: nicknameByUserId.get(u.id) ?? "익명",
            } satisfies LoadedUser,
          ] as const,
      ),
    );

    return ids.map(
      (id) => byId.get(id) ?? new Error(`user not found: ${id}`),
    );
  },
  toKey: (user) => user.id,
  fields: (t) => ({
    id: t.exposeID("id"),
    displayName: t.exposeString("displayName"),
    imageUrl: t.exposeString("imageUrl", { nullable: true }),
  }),
});
