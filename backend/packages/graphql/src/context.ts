import type { Db } from "@saju/db";
import type { UserId } from "@saju/shared/types";
import { createLoaders, type Loaders } from "./loaders.ts";
import type { PubSub } from "./pubsub.ts";

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
  pubsub: PubSub;
  enqueueProfileReading: EnqueueProfileReading;
  enqueueMatchCurate: EnqueueMatchCurate;
  enqueueDailyFortune: EnqueueDailyFortune;
};

export type CreateContextArgs = {
  db: Db;
  pubsub: PubSub;
  resolveUserId: (token: string) => UserId | null;
  enqueueProfileReading: EnqueueProfileReading;
  enqueueMatchCurate: EnqueueMatchCurate;
  enqueueDailyFortune: EnqueueDailyFortune;
} & (
  | { request: Request; connectionParams?: never }
  | { request?: never; connectionParams: Record<string, unknown> | undefined }
);

export function createGraphQLContext(args: CreateContextArgs): GraphQLContext {
  const {
    db,
    pubsub,
    resolveUserId,
    enqueueProfileReading,
    enqueueMatchCurate,
    enqueueDailyFortune,
  } = args;
  const token = extractToken(args);
  const userId = token ? resolveUserId(token) : null;
  return {
    db,
    userId,
    loaders: createLoaders(db),
    pubsub,
    enqueueProfileReading,
    enqueueMatchCurate,
    enqueueDailyFortune,
  };
}

function extractToken(args: CreateContextArgs): string | null {
  if (args.request) {
    const header =
      args.request.headers.get("authorization") ??
      args.request.headers.get("Authorization");
    if (header?.toLowerCase().startsWith("bearer ")) {
      return header.slice(7).trim();
    }
    return null;
  }
  const params = args.connectionParams;
  if (!params) return null;
  const auth = params.authorization ?? params.Authorization;
  if (typeof auth !== "string") return null;
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return auth.trim() || null;
}
