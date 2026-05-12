import { handlers } from "@/auth";
import { NextRequest } from "next/server";

function stripNextInternalParams(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  let changed = false;
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.startsWith("nxtP") || key.startsWith("_rsc")) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return req;
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  const cleaned = stripNextInternalParams(req);
  if (cleaned.nextUrl.pathname.includes("/callback/google")) {
    console.error("[auth-callback-raw]", {
      url: cleaned.url,
      search: cleaned.nextUrl.search,
      cookieNames: cleaned.headers
        .get("cookie")
        ?.split(";")
        .map((v) => v.trim().split("=")[0]),
    });
  }
  return handlers.GET(cleaned);
}

export async function POST(req: NextRequest) {
  return handlers.POST(stripNextInternalParams(req));
}
