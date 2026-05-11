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
      const ai = getAiQueue();
      const jobId = profileReadingJobId(userId, version);
      await ai.remove(jobId);
      await ai.add(
        "profile-reading",
        { userId, readingId, version },
        { jobId },
      );
    },
    enqueueMatchCurate: async (userId, topK) => {
      const match = getMatchQueue();
      const jobId = matchCurateJobId(userId);
      await match.remove(jobId);
      await match.add("curate", { userId, topK }, { jobId });
    },
    enqueueDailyFortune: async (userId, forDate) => {
      const ai = getAiQueue();
      const jobId = dailyFortuneJobId(userId, forDate);
      await ai.remove(jobId);
      await ai.add(
        "daily-fortune",
        { userId, forDate },
        { jobId },
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
