import type { Db } from "@saju/db";
import type { UserId } from "@saju/shared/types";
import type { Loaders } from "./loaders.ts";

export type GraphQLContext = {
  db: Db;
  userId: UserId | null;
  loaders: Loaders;
};
