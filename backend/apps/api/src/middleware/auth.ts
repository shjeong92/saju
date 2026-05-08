import type { MiddlewareHandler } from "hono";
import { verifyUserToken } from "../lib/jwt.ts";
import type { AppEnv } from "../types.ts";

export const attachUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("authorization") ?? c.req.header("Authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    const uid = verifyUserToken(token);
    if (uid) c.set("user", { userId: uid });
  }
  await next();
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);
  await next();
};
