import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  if (req.nextUrl.pathname.includes("/callback/google")) {
    console.error("[auth-callback-raw]", {
      url: req.url,
      search: req.nextUrl.search,
      cookieNames: req.headers
        .get("cookie")
        ?.split(";")
        .map((v) => v.trim().split("=")[0]),
    });
  }
  return handlers.GET(req);
}

export const POST = handlers.POST;
