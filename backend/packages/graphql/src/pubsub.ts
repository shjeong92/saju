import IORedis, { type Redis } from "ioredis";

/**
 * 토픽 → payload 매핑.
 *
 * - `chat:room:<roomId>` → 새 메시지 하나의 페이로드
 * - `user:<userId>:match-suggested` → 새 매치 ID
 * - `user:<userId>:reading-ready` → 완료된 personal_readings.id
 * - `match:<matchId>:report-ready` → 완료된 compatibility_reports.id
 *
 * Django Channels의 `channel_layer.group_send(group, payload)`와 똑같은 발상이지만,
 * 여기선 group 이름을 우리가 직접 짓고 string interpolation으로 만든다.
 */
export type PubSubTopics = {
  [key: `chat:room:${string}`]: ChatMessagePayload;
  [key: `user:${string}:match-suggested`]: { matchId: string };
  [key: `user:${string}:reading-ready`]: { readingId: string };
  [key: `match:${string}:report-ready`]: { reportId: string };
};

export type ChatMessagePayload = {
  id: string;
  roomId: string;
  senderId: string | null;
  type: "user" | "system";
  body: string;
  createdAtIso: string;
  meta: Record<string, unknown> | null;
};

/**
 * Redis-backed Pub/Sub.
 *
 * # 왜 ioredis가 두 개 필요한가
 *
 * Redis 클라이언트가 `SUBSCRIBE` 명령을 한 번 보내면 그 connection은
 * 다른 명령(GET/SET/PUBLISH)을 받을 수 없다 ("subscribed mode" lock).
 * 그래서 publish용 1개 + subscribe용 1개로 나눈다.
 *
 * # 왜 in-process fanout(`localListeners`)가 필요한가
 *
 * 같은 채널을 여러 GraphQL Subscription 클라이언트가 구독할 수 있는데,
 * Redis subscriber 쪽엔 채널당 콜백을 한 번만 등록하고, 들어온 메시지를
 * in-process의 listener Set에 fanout하는 게 효율적.
 *
 * # Django Channels와의 매핑
 *
 * - `channel_layer.group_add(group, channel)` ≈ `pubsub.subscribe(topic)`
 * - `channel_layer.group_send(group, msg)` ≈ `pubsub.publish(topic, msg)`
 * - `async def receive(self):` ≈ async iterator의 next 루프
 */
export type PubSub = {
  publish<K extends keyof PubSubTopics & string>(
    topic: K,
    payload: PubSubTopics[K],
  ): Promise<void>;
  subscribe<K extends keyof PubSubTopics & string>(
    topic: K,
  ): AsyncIterableIterator<PubSubTopics[K]>;
  close(): Promise<void>;
};

type Listener = (payload: unknown) => void;

export type CreatePubSubOptions = {
  redisUrl: string;
};

export function createPubSub(opts: CreatePubSubOptions): PubSub {
  const publisher: Redis = new IORedis(opts.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const subscriber: Redis = new IORedis(opts.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const localListeners = new Map<string, Set<Listener>>();

  subscriber.on("message", (channel: string, message: string) => {
    const set = localListeners.get(channel);
    if (!set || set.size === 0) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch (err) {
      console.error(`[pubsub] invalid JSON on ${channel}:`, err);
      return;
    }
    for (const listener of [...set]) {
      try {
        listener(parsed);
      } catch (err) {
        console.error(`[pubsub] listener error on ${channel}:`, err);
      }
    }
  });

  async function ensureSubscribed(channel: string): Promise<void> {
    if (!localListeners.has(channel)) {
      localListeners.set(channel, new Set());
      await subscriber.subscribe(channel);
    }
  }

  async function maybeUnsubscribe(channel: string): Promise<void> {
    const set = localListeners.get(channel);
    if (!set || set.size > 0) return;
    localListeners.delete(channel);
    await subscriber.unsubscribe(channel);
  }

  return {
    async publish(topic, payload) {
      await publisher.publish(topic, JSON.stringify(payload));
    },

    subscribe<K extends keyof PubSubTopics & string>(
      topic: K,
    ): AsyncIterableIterator<PubSubTopics[K]> {
      type Payload = PubSubTopics[K];
      const queue: Payload[] = [];
      const pending: Array<(value: IteratorResult<Payload>) => void> = [];
      let closed = false;
      let listener: Listener | null = null;

      const setup = (async () => {
        await ensureSubscribed(topic);
        listener = (payload) => {
          if (closed) return;
          const next = pending.shift();
          if (next) {
            next({ value: payload as Payload, done: false });
          } else {
            queue.push(payload as Payload);
          }
        };
        const set = localListeners.get(topic);
        set?.add(listener);
      })();

      const iterator: AsyncIterableIterator<Payload> = {
        [Symbol.asyncIterator]() {
          return iterator;
        },
        async next(): Promise<IteratorResult<Payload>> {
          await setup;
          if (closed) {
            return { value: undefined, done: true };
          }
          const buffered = queue.shift();
          if (buffered !== undefined) {
            return { value: buffered, done: false };
          }
          return await new Promise<IteratorResult<Payload>>((resolve) => {
            pending.push(resolve);
          });
        },
        async return(): Promise<IteratorResult<Payload>> {
          await setup;
          if (closed) return { value: undefined, done: true };
          closed = true;
          if (listener) {
            const set = localListeners.get(topic);
            set?.delete(listener);
            await maybeUnsubscribe(topic);
          }
          while (pending.length > 0) {
            const r = pending.shift();
            r?.({ value: undefined, done: true });
          }
          return { value: undefined, done: true };
        },
        async throw(err): Promise<IteratorResult<Payload>> {
          await iterator.return?.();
          throw err;
        },
      };
      return iterator;
    },

    async close(): Promise<void> {
      localListeners.clear();
      await Promise.all([publisher.quit(), subscriber.quit()]);
    },
  };
}

export const Topics = {
  chatRoom: (roomId: string): `chat:room:${string}` => `chat:room:${roomId}`,
  matchSuggested: (userId: string): `user:${string}:match-suggested` =>
    `user:${userId}:match-suggested`,
  readingReady: (userId: string): `user:${string}:reading-ready` =>
    `user:${userId}:reading-ready`,
  reportReady: (matchId: string): `match:${string}:report-ready` =>
    `match:${matchId}:report-ready`,
} as const;
