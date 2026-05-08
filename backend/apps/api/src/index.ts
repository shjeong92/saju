import { env } from "@saju/shared/env";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { attachUser } from "./middleware/auth.ts";
import { contextMiddleware } from "./middleware/context.ts";
import { authRoutes } from "./routes/auth.ts";
import { graphqlRoutes } from "./routes/graphql.ts";
import { sajuRoutes } from "./routes/saju.ts";
import type { AppEnv } from "./types.ts";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("*", contextMiddleware);
app.use("*", attachUser);

app.get("/health", (c) => c.json({ ok: true, service: "api" }));

app.route("/auth", authRoutes);
app.route("/saju", sajuRoutes);
app.route("/graphql", graphqlRoutes);

const port = env.API_PORT;

console.log(`[api] listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
