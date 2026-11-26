import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight Next.js 16 Proxy.
 * Avoids blocking every mobile navigation/tap on a remote Supabase Auth round-trip;
 * Server Components and API Route Handlers verify the session directly via `getCurrentPlayer()`.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|apple-touch-icon|manifest|assets/|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|json)$).*)",
  ],
};
