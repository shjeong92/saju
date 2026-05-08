import type { Db } from "@saju/db";
import type { UserId } from "@saju/shared/types";

export type AuthUser = {
  userId: UserId;
};

export type Variables = {
  db: Db;
  user: AuthUser | null;
};

export type AppEnv = { Variables: Variables };
