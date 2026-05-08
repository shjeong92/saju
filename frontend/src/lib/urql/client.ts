/**
 * urql 클라이언트 factory.
 *
 * 학습 매핑 (Django/Strawberry 비교):
 * - urql 의 "exchange" 는 Django middleware 와 유사한 파이프라인이다.
 * - operation 은 dedup → cache → fetch/subscription 순으로 흐른다.
 * - Subscription operation 만 wsClient 로 보내고, Query/Mutation 은 fetch 로 간다.
 *   (백엔드는 같은 /graphql endpoint 인데 transport 만 HTTP vs WS 로 다름)
 */

import {
  cacheExchange,
  Client,
  fetchExchange,
  subscriptionExchange,
} from "urql";
import { buildWsClient } from "./wsClient";

const HTTP_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";

export function buildUrqlClient(getToken: () => string | undefined): Client {
  const wsClient = buildWsClient(getToken);

  return new Client({
    url: HTTP_URL,
    exchanges: [
      cacheExchange,
      // Subscription transport: graphql-ws 프로토콜로 wsClient 위임.
      subscriptionExchange({
        forwardSubscription: (request) => ({
          subscribe: (sink) => ({
            unsubscribe: wsClient.subscribe(
              { ...request, query: request.query ?? "" },
              sink,
            ),
          }),
        }),
      }),
      fetchExchange,
    ],
    fetchOptions: () => {
      const token = getToken();
      return token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
    },
  });
}
