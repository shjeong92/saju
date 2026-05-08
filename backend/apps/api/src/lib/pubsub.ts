import { createPubSub, type PubSub } from "@saju/graphql";
import { env } from "@saju/shared/env";

let cached: PubSub | null = null;

export function getPubSub(): PubSub {
  if (!cached) {
    cached = createPubSub({ redisUrl: env.REDIS_URL });
  }
  return cached;
}

export async function closePubSub(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = null;
  }
}
