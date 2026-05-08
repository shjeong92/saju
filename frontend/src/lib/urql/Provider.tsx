"use client";

/**
 * UrqlProvider — Client Component.
 *
 * 핵심 트릭:
 * - Server Component(layout.tsx)에서 await auth() 로 토큰을 받아온다.
 * - 그 토큰을 prop 으로 이 Client Component 에 내려준다.
 * - 여기서 ref 로 토큰을 들고 있다가 fetchOptions/connectionParams 콜백이 호출될 때 꺼내준다.
 *   → 토큰 갱신 시 client 인스턴스 재생성 없이 다음 요청부터 새 토큰 사용 가능.
 */

import { useMemo, useRef } from "react";
import { Provider } from "urql";
import { buildUrqlClient } from "./client";

export function UrqlProvider({
  accessToken,
  children,
}: {
  accessToken: string | undefined;
  children: React.ReactNode;
}) {
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;

  const client = useMemo(
    () => buildUrqlClient(() => tokenRef.current),
    [],
  );

  return <Provider value={client}>{children}</Provider>;
}
