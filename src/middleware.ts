import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PAGES = new Set([
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/privacy",
]);

function isGuestReadableApi(pathname: string, method: string): boolean {
  if (method === "GET" && pathname === "/api/conditions/region") return true;
  if (method === "GET" && pathname === "/api/conditions/hourly") return true;
  if (method === "GET" && pathname === "/api/conditions/forecast") return true;
  if (method === "POST" && pathname === "/api/briefing") return true;
  if (method === "GET" && pathname === "/api/reports") return true;
  if (method === "GET" && pathname.startsWith("/api/reports/image/")) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo.") ||
    /\.(png|jpe?g|svg|webp|ico)$/i.test(pathname) ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;

  if (
    userId &&
    (pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/forgot-password")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (PUBLIC_PAGES.has(pathname) || isGuestReadableApi(pathname, method)) {
    return NextResponse.next();
  }

  if (!userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo\\.jpg|.*\\.(?:png|jpe?g|svg|webp|ico)$).*)",
  ],
};
