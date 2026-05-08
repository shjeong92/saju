/**
 * Auth.js v5 — edge-safe config (provider 메타데이터만).
 *
 * 학습 매핑 (Django/Allauth → Next.js/Auth.js):
 * - 여기 정의는 settings.SOCIALACCOUNT_PROVIDERS 와 비슷한 역할이다.
 * - 단, Auth.js 는 "provider 정의" 와 "callback 로직" 을 파일로 분리한다.
 *   이유: Next.js middleware 는 edge runtime(V8 isolate)에서 도는데,
 *   거기서 DB driver 같은 Node 전용 모듈을 import 하면 빌드가 깨진다.
 *   그래서 edge 에서도 안전한 메타데이터만 이 파일에 두고,
 *   네트워크 호출이 들어가는 signIn/jwt/session callback 은 ./auth.ts 에 둔다.
 */

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const allowDevLogin = process.env.AUTH_ALLOW_DEV_LOGIN === "true";

const providers: NextAuthConfig["providers"] = [];

// Auth.js 는 client_id 미설정 시 부팅 자체를 거부하므로, 키가 비어있으면 등록 스킵.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // prompt=select_account 로 매번 계정 선택 화면을 띄우면 refresh_token 도 새로 발급된다.
      authorization: { params: { prompt: "select_account" } },
    }),
  );
}

if (allowDevLogin) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev Login (seed user)",
      credentials: {
        providerId: { label: "Provider ID", type: "text" },
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "email" },
      },
      authorize: async () => null,
    }),
  );
}

export const authConfig = {
  providers,
  // Auth.js v5 는 default 가 jwt strategy (database session 안 씀).
  // 우리는 백엔드 JWT 를 token 안에 박아넣을 거라 jwt 전략이 정확히 맞다.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * authorized: middleware 에서 페이지 접근 가드 시 호출됨.
     * Django 의 LOGIN_REQUIRED 데코레이터와 같은 역할이다.
     *
     * - true 반환 → 통과
     * - false 반환 → /login 으로 리다이렉트
     * - Response 직접 반환 → 그대로 전달
     */
    authorized: ({ auth, request }) => {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // 보호 대상 prefix
      const protectedPrefixes = [
        "/saju",
        "/matches",
        "/chat",
        "/fortune",
        "/reading",
      ];
      const isProtected = protectedPrefixes.some((p) =>
        pathname.startsWith(p),
      );

      if (isProtected) return isLoggedIn;
      // 로그인 페이지에 이미 로그인된 사용자가 오면 홈으로 보냄.
      if (pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
