import { getDb } from "@saju/db";
import {
  createGraphQLContext,
  type GraphQLContext,
  schema,
} from "@saju/graphql";
import { Hono } from "hono";
import { createYoga } from "graphql-yoga";
import { verifyUserToken } from "../lib/jwt.ts";
import { getAiQueue, profileReadingJobId } from "../queues/index.ts";
import type { AppEnv } from "../types.ts";

const yoga = createYoga<{ req: Request }, GraphQLContext>({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: true,
  context: ({ req }) =>
    createGraphQLContext({
      db: getDb(),
      request: req,
      resolveUserId: verifyUserToken,
      enqueueProfileReading: async (userId, readingId, version) => {
        await getAiQueue().add(
          "profile-reading",
          { userId, readingId, version },
          { jobId: profileReadingJobId(userId, version) },
        );
      },
    }),
});

export const graphqlRoutes = new Hono<AppEnv>().all("/", (c) =>
  yoga.fetch(c.req.raw, { req: c.req.raw }),
);
