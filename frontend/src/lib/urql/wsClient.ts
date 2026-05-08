/**
 * graphql-ws 클라이언트.
 *
 * 학습 매핑:
 * - 백엔드 apps/api/src/ws.ts 의 `makeServer` 와 짝이다 (graphql-ws 프로토콜).
 * - Django Channels 의 consumer 와 비슷한 역할인데, 여기서는 클라이언트 측 transport.
 * - connectionParams 가 콜백이라는 점이 핵심: 토큰이 갱신돼도 다음 connect 부터 새 토큰을 쓴다.
 *   (객체로 직접 넘기면 client 생성 시점의 토큰이 박제돼서 갱신 못 함)
 */

import { createClient as createWSClient, type Client } from "graphql-ws";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/graphql";

export function buildWsClient(getToken: () => string | undefined): Client {
  return createWSClient({
    url: WS_URL,
    connectionParams: () => {
      const token = getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    // 끊겼을 때 재시도. dev 에서는 빈번하게 hot-reload 되니 켜둔다.
    shouldRetry: () => true,
    retryAttempts: 5,
    // lazy=true(default) 일 때 첫 subscription 이 등록될 때 비로소 connect.
    // 우리는 페이지 진입 즉시 messageAdded subscribe 가 자주 일어나니 lazy 유지.
    lazy: true,
  });
}
