import { env } from "@saju/shared/env";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { attachUser } from "./middleware/auth.ts";
import { contextMiddleware } from "./middleware/context.ts";
import { authRoutes } from "./routes/auth.ts";
import { graphqlRoutes } from "./routes/graphql.ts";
import { sajuRoutes } from "./routes/saju.ts";
import type { AppEnv } from "./types.ts";
import { bunGqlWsHandler, shouldUpgradeWs } from "./ws.ts";
import { closePubSub } from "./lib/pubsub.ts";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("*", contextMiddleware);
app.use("*", attachUser);

app.get("/health", (c) => c.json({ ok: true, service: "api" }));

app.route("/auth", authRoutes);
app.route("/saju", sajuRoutes);
app.route("/graphql", graphqlRoutes);

const port = env.API_PORT;

const server = Bun.serve({
  port,
  fetch(req, srv) {
    if (shouldUpgradeWs(req)) {
      const url = new URL(req.url);
      const urlToken = url.searchParams.get("token");
      const ok = srv.upgrade(req, {
        data: { closed: null, onMessage: null, urlToken },
      });
      if (ok) return undefined;
      return new Response("upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open: bunGqlWsHandler.open,
    message: bunGqlWsHandler.message,
    close: bunGqlWsHandler.close,
  },
});

console.log(
  `[api] listening on http://localhost:${server.port} (ws ws://localhost:${server.port}/graphql)`,
);

const shutdown = async (signal: string): Promise<void> => {
  console.log(`[api] received ${signal}, closing...`);
  server.stop(true);
  await closePubSub();
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
