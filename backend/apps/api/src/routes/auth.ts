import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { schema } from "@saju/db";
import { userId } from "@saju/shared/types";
import { Hono } from "hono";
import { z } from "zod";
import { signUserToken } from "../lib/jwt.ts";
import type { AppEnv } from "../types.ts";

const upsertSchema = z.object({
  provider: z.literal("google"),
  providerId: z.string().min(1),
  email: z.string().email().nullable().optional(),
  name: z.string().min(1),
  imageUrl: z.string().url().nullable().optional(),
});

export const authRoutes = new Hono<AppEnv>().post(
  "/upsert",
  zValidator("json", upsertSchema),
  async (c) => {
    const input = c.req.valid("json");
    const db = c.get("db");

    const [row] = await db
      .insert(schema.users)
      .values({
        provider: input.provider,
        providerId: input.providerId,
        email: input.email ?? null,
        name: input.name,
        imageUrl: input.imageUrl ?? null,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.users.provider, schema.users.providerId],
        set: {
          name: input.name,
          email: input.email ?? null,
          imageUrl: input.imageUrl ?? null,
          lastLoginAt: new Date(),
          updatedAt: sql`now()`,
        },
      })
      .returning();

    if (!row) {
      return c.json({ error: "upsert_failed" }, 500);
    }

    const uid = userId(row.id);
    const token = signUserToken(uid);

    return c.json({
      token,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        imageUrl: row.imageUrl,
      },
    });
  },
);
