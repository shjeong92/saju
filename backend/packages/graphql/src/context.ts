import type { Db } from "@saju/db";
import type { UserId } from "@saju/shared/types";
import { createLoaders, type Loaders } from "./loaders.ts";

export type EnqueueProfileReading = (
  userId: UserId,
  readingId: string,
  version: string,
) => Promise<void>;

export type EnqueueMatchCurate = (
  userId: UserId,
  topK: number,
) => Promise<void>;

export type EnqueueDailyFortune = (
  userId: UserId,
  forDate: string,
) => Promise<void>;

export type GraphQLContext = {
  db: Db;
  userId: UserId | null;
  loaders: Loaders;
  enqueueProfileReading: EnqueueProfileReading;
  enqueueMatchCurate: EnqueueMatchCurate;
  enqueueDailyFortune: EnqueueDailyFortune;
};

export type CreateContextArgs = {
  db: Db;
  request: Request;
  resolveUserId: (token: string) => UserId | null;
  enqueueProfileReading: EnqueueProfileReading;
  enqueueMatchCurate: EnqueueMatchCurate;
  enqueueDailyFortune: EnqueueDailyFortune;
};

export function createGraphQLContext(args: CreateContextArgs): GraphQLContext {
  const {
    db,
    request,
    resolveUserId,
    enqueueProfileReading,
    enqueueMatchCurate,
    enqueueDailyFortune,
  } = args;
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
    enqueueMatchCurate,
    enqueueDailyFortune,
  };
}
