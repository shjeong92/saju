import DataLoader from "dataloader";
import type { Db } from "@saju/db";
import { schema } from "@saju/db";
import type { Match } from "@saju/db/schema";
import { inArray, or } from "drizzle-orm";

export type Loaders = {
  matchesByUserId: DataLoader<string, Match[]>;
};

export function createLoaders(db: Db): Loaders {
  return {
    matchesByUserId: new DataLoader<string, Match[]>(async (userIds) => {
      const ids = userIds as readonly string[];
      const rows = await db
        .select()
        .from(schema.matches)
        .where(
          or(
            inArray(schema.matches.userAId, ids as string[]),
            inArray(schema.matches.userBId, ids as string[]),
          ),
        );
      return ids.map((uid) =>
        rows.filter((r) => r.userAId === uid || r.userBId === uid),
      );
    }),
  };
}
