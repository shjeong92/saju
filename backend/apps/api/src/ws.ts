import { schema, type GraphQLContext } from "@saju/graphql";
import { env } from "@saju/shared/env";
import {
  CloseCode,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  makeServer,
  type Server,
  type WebSocket as GqlWsSocket,
} from "graphql-ws";
import type { ServerWebSocket } from "bun";
import { buildWsContextBuilder } from "./routes/graphql.ts";

const ALLOW_URL_TOKEN = env.NODE_ENV !== "production";

type WsData = {
  closed: ((code?: number, reason?: string) => Promise<void>) | null;
  onMessage: ((data: string) => Promise<void>) | null;
  urlToken: string | null;
};

const { builder } = buildWsContextBuilder();

const gqlServer: Server<{ urlToken: string | null }> = makeServer<
  Record<string, unknown>,
  { urlToken: string | null }
>({
  schema,
  context: (ctx, _msg, _args) => {
    const params = { ...(ctx.connectionParams ?? {}) };
    if (
      ALLOW_URL_TOKEN &&
      ctx.extra?.urlToken &&
      !params.Authorization &&
      !params.authorization
    ) {
      params.Authorization = `Bearer ${ctx.extra.urlToken}`;
    }
    return builder(params) as unknown as GraphQLContext;
  },
});

export type BunGqlWsHandler = {
  open(ws: ServerWebSocket<WsData>): void;
  message(ws: ServerWebSocket<WsData>, message: string | Buffer): Promise<void>;
  close(ws: ServerWebSocket<WsData>, code: number, reason: string): Promise<void>;
};

export const bunGqlWsHandler: BunGqlWsHandler = {
  open(ws) {
    const adapter: GqlWsSocket = {
      protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
      send(data) {
        ws.send(data);
      },
      close(code, reason) {
        try {
          ws.close(code, reason);
        } catch (_err) {
          void _err;
        }
      },
      onMessage(cb) {
        ws.data.onMessage = cb;
      },
    };
    ws.data.closed = gqlServer.opened(adapter, { urlToken: ws.data.urlToken });
  },
  async message(ws, message) {
    const text =
      typeof message === "string" ? message : message.toString("utf8");
    const cb = ws.data.onMessage;
    if (!cb) {
      ws.close(CloseCode.InternalServerError, "no message handler");
      return;
    }
    try {
      await cb(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ws.close(CloseCode.InternalServerError, msg);
    }
  },
  async close(ws, code, reason) {
    const closed = ws.data.closed;
    if (closed) await closed(code, reason);
  },
};

export function shouldUpgradeWs(req: Request): boolean {
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") return false;
  const url = new URL(req.url);
  return url.pathname === "/graphql";
}
