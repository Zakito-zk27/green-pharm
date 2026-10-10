import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, verifySession } from "./lib/session";

const intl = createMiddleware(routing);

// Edge middleware (not a Node.js `proxy.ts`): the stable option on Cloudflare Workers with OpenNext.
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }
  return intl(req);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|media|.*\\..*).*)",
};
