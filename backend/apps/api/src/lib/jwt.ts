import jwt from "jsonwebtoken";
import { env } from "@saju/shared/env";
import { userId, type UserId } from "@saju/shared/types";

const ALG = "HS256" as const;
const TTL_SECONDS = 60 * 60 * 24 * 7;

type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};

export function signUserToken(uid: UserId): string {
  return jwt.sign({ sub: uid as string }, env.JWT_SECRET, {
    algorithm: ALG,
    expiresIn: TTL_SECONDS,
  });
}

export function verifyUserToken(token: string): UserId | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALG] });
    if (typeof decoded === "string") return null;
    const payload = decoded as JwtPayload;
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    return userId(payload.sub);
  } catch {
    return null;
  }
}
