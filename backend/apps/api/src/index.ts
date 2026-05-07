import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "api" }));

const port = Number(process.env.PORT ?? 4000);

export default {
  port,
  fetch: app.fetch,
};

console.log(`[api] listening on http://localhost:${port}`);
