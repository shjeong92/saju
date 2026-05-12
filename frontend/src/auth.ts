/**
 * Auth.js v5 — 메인 진입점.
 *
 * 역할:
 * 1. ./auth.config.ts 의 edge-safe config 를 받아 callback 으로 확장한다.
 * 2. signIn → 구글/Credentials 어느 쪽이든 우리 백엔드 /auth/upsert 를 호출해서
 *    백엔드 JWT 를 받아온다.
 * 3. jwt callback 에서 그 JWT 를 token 객체에 박는다 (쿠키에 암호화돼서 들어감).
 * 4. session callback 에서 token 의 백엔드 JWT 를 session.accessToken 으로 노출.
 *
 * 학습 매핑:
 * - Auth.js 의 callback chain: signIn → jwt → session (매 요청마다 jwt → session 만 다시 돔).
 * - Django 라면 SocialAccount 가 자체 모델에 저장하는데, 우리는 그 정보를 즉시 우리
 *   백엔드 /auth/upsert 로 던져서 우리 users 테이블에만 저장한다. Auth.js 는 백엔드
 *   JWT 를 운반하는 stateless 게이트웨이 역할.
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const allowDevLogin = process.env.AUTH_ALLOW_DEV_LOGIN === "true";

type UpsertPayload = {
  provider: "google";
  providerId: string;
  email: string | null;
  name: string;
  imageUrl: string | null;
};

type UpsertResponse = {
  token: string;
  user: {
    id: string;
    email: string | null;
    name: string;
    imageUrl: string | null;
  };
};

function normalizeUrl(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

function normalizeEmail(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function upsertToBackend(
  payload: UpsertPayload,
): Promise<UpsertResponse> {
  const normalized: UpsertPayload = {
    ...payload,
    email: normalizeEmail(payload.email),
    imageUrl: normalizeUrl(payload.imageUrl),
  };
  const res = await fetch(`${apiUrl}/auth/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`/auth/upsert ${res.status}: ${text}`);
  }
  return (await res.json()) as UpsertResponse;
}

// auth.config.ts 와 같은 provider 목록을 다시 빌드한다.
// 이유: edge-safe config 의 Credentials.authorize 는 placeholder 였고,
// 여기서 진짜 authorize(백엔드 /auth/upsert 호출 포함)로 교체해야 한다.
const providers: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
      authorize: async (credentials) => {
        const providerId = credentials?.providerId;
        const name = credentials?.name;
        const email = credentials?.email;
        if (typeof providerId !== "string" || typeof name !== "string") {
          return null;
        }

        try {
          const result = await upsertToBackend({
            provider: "google",
            providerId,
            name,
            email: typeof email === "string" && email.length > 0 ? email : null,
            imageUrl: null,
          });
          return {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            image: result.user.imageUrl,
            backendToken: result.token,
          };
        } catch (err) {
          console.error("[auth] dev-login upsert failed:", err);
          return null;
        }
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * signIn: 인증 직후, 세션이 만들어지기 전에 호출됨.
     * 구글 OAuth 의 경우 여기서 백엔드 /auth/upsert 를 호출해 백엔드 JWT 를 발급받고
     * (account 객체가 mutable 하지 않으므로) user 객체에 backendToken 을 끼워넣는다.
     * Credentials provider 는 authorize 에서 이미 처리했으므로 skip.
     */
    signIn: async ({ user, account, profile }) => {
      if (!account) {
        console.error("[auth] signIn: account missing");
        return false;
      }

      if (account.provider === "google") {
        if (!profile?.sub) {
          console.error("[auth] google profile.sub missing", { profile });
          return false;
        }
        const payload: UpsertPayload = {
          provider: "google",
          providerId: profile.sub,
          name: user.name ?? profile.name ?? "구글 사용자",
          email: user.email ?? profile.email ?? null,
          imageUrl: user.image ?? profile.picture ?? null,
        };
        try {
          const result = await upsertToBackend(payload);
          user.backendToken = result.token;
          user.backendUserId = result.user.id;
          return true;
        } catch (err) {
          console.error("[auth] google upsert failed:", {
            error: err instanceof Error ? err.message : String(err),
            payload,
            apiUrl,
          });
          return false;
        }
      }

      return true;
    },

    /**
     * jwt: 매 요청마다 호출(쿠키 기반 token 갱신).
     * - user 가 있을 때(=signIn 직후) → user.backendToken 을 token 에 옮겨담음
     * - user 가 없을 때(=후속 요청) → token 그대로 유지
     */
    jwt: async ({ token, user }) => {
      if (user) {
        if (user.backendToken) token.backendToken = user.backendToken;
        if (user.backendUserId) token.backendUserId = user.backendUserId;
        else if (user.id) token.backendUserId = user.id;
      }
      return token;
    },

    /**
     * session: useSession() / await auth() 가 읽는 형태로 변환.
     * token 의 backendToken 을 session.accessToken 에 노출해 클라이언트에서
     * GraphQL 요청 헤더로 쓸 수 있게 한다.
     */
    session: async ({ session, token }) => {
      if (typeof token.backendToken === "string") {
        session.accessToken = token.backendToken;
      }
      if (typeof token.backendUserId === "string" && session.user) {
        session.user.id = token.backendUserId;
      }
      return session;
    },
  },
});
