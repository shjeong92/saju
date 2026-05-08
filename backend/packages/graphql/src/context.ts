import type { Db } from "@saju/db";
import type { UserId } from "@saju/shared/types";
import { createLoaders, type Loaders } from "./loaders.ts";

export type EnqueueProfileReading = (
  userId: UserId,
  readingId: string,
  version: string,
) => Promise<void>;

export type GraphQLContext = {
  db: Db;
  userId: UserId | null;
  loaders: Loaders;
  enqueueProfileReading: EnqueueProfileReading;
};

export type CreateContextArgs = {
  db: Db;
  request: Request;
  resolveUserId: (token: string) => UserId | null;
  enqueueProfileReading: EnqueueProfileReading;
};

export function createGraphQLContext(args: CreateContextArgs): GraphQLContext {
  const { db, request, resolveUserId, enqueueProfileReading } = args;
  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  const token = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;
  const userId = token ? resolveUserId(token) : null;
  return {
    db,
    userId,
    loaders: createLoaders(db),
    enqueueProfileReading,
  };
}
