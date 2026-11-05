import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Fail-CLOSED by default:
// When COGNITO_USER_POOL_ID is absent we do NOT bypass auth silently.
// Instead we only skip the redirect (so the page renders), but API routes
// still perform their own auth() check independently.
// Set BYPASS_AUTH=true explicitly in .env.local to disable redirects for
// local dev where no Cognito is configured.
const BYPASS_REDIRECTS = process.env.BYPASS_AUTH === "true";

const protectedPaths = ["/search", "/submit", "/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // In local dev with explicit bypass, allow through (API routes still check auth)
  if (BYPASS_REDIRECTS) return NextResponse.next();

  const sessionToken =
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token");

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
