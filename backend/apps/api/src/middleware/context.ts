import { getDb } from "@saju/db";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types.ts";

export const contextMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("db", getDb());
  c.set("user", null);
  await next();
};
