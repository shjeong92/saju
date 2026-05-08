import { z } from "zod";

/**
 * 부팅 시점 process.env 검증 (07-project-structure §3).
 *
 * - Django settings.py와 달리, 잘못된 env면 부팅 자체를 막음.
 * - `apps/api`, `apps/worker` 양쪽 entry에서 import 한 번만 해도
 *   잘못된 설정으로 떠 있는 시간이 사라짐.
 *
 * 사용 예:
 *   import { env } from "@saju/shared/env";
 *   const url = env.DATABASE_URL;
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // DB / Redis
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),

  AI_PROXY_BASE_URL: z.string().url(),
  AI_PROXY_API_KEY: z.string().default(""),

  API_PORT: z.coerce.number().int().positive().default(4000),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(`[env] invalid environment variables:\n${issues}`);
    throw new Error("Invalid environment variables. See logs above.");
  }
  return parsed.data;
}

export const env: Env = loadEnv();

/**
 * 일부 잡(스크립트, 마이그레이션)에서는 process.env를 직접 만지고 싶을 때
 * 즉시 평가를 피하고 lazy하게 부르고 싶을 수 있음.
 */
export function reloadEnv(): Env {
  return loadEnv();
}
