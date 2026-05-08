import { getDb } from "@saju/db";
import {
  createGraphQLContext,
  type GraphQLContext,
  type PubSub,
  schema,
} from "@saju/graphql";
import { Hono } from "hono";
import { createYoga } from "graphql-yoga";
import { verifyUserToken } from "../lib/jwt.ts";
import { getPubSub } from "../lib/pubsub.ts";
import {
  dailyFortuneJobId,
  getAiQueue,
  getMatchQueue,
  matchCurateJobId,
  profileReadingJobId,
} from "../queues/index.ts";
import type { AppEnv } from "../types.ts";

type ContextDeps = Omit<
  Parameters<typeof createGraphQLContext>[0],
  "request" | "connectionParams"
>;

function buildContextDeps(): ContextDeps {
  return {
    db: getDb(),
    pubsub: getPubSub(),
    resolveUserId: verifyUserToken,
    enqueueProfileReading: async (userId, readingId, version) => {
      await getAiQueue().add(
        "profile-reading",
        { userId, readingId, version },
        { jobId: profileReadingJobId(userId, version) },
      );
    },
    enqueueMatchCurate: async (userId, topK) => {
      await getMatchQueue().add(
        "curate",
        { userId, topK },
        { jobId: matchCurateJobId(userId) },
      );
    },
    enqueueDailyFortune: async (userId, forDate) => {
      await getAiQueue().add(
        "daily-fortune",
        { userId, forDate },
        { jobId: dailyFortuneJobId(userId, forDate) },
      );
    },
  };
}

const yoga = createYoga<{ req: Request }, GraphQLContext>({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: { subscriptionsProtocol: "WS" },
  context: ({ req }) =>
    createGraphQLContext({ ...buildContextDeps(), request: req }),
});

export const graphqlRoutes = new Hono<AppEnv>().all("/", (c) =>
  yoga.fetch(c.req.raw, { req: c.req.raw }),
);

export type WsContextBuilder = (
  connectionParams: Record<string, unknown> | undefined,
) => GraphQLContext;

export function buildWsContextBuilder(): {
  builder: WsContextBuilder;
  pubsub: PubSub;
} {
  const deps = buildContextDeps();
  return {
    builder: (connectionParams) =>
      createGraphQLContext({ ...deps, connectionParams }),
    pubsub: deps.pubsub,
  };
}
