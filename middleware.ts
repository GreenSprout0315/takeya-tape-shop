/**
 * Middleware — /admin の BASIC 認証保護
 *
 * /admin 配下（ページ + API）へのアクセス時に HTTP BASIC 認証を要求する。
 * /login, /api/auth, /api/order などは対象外。
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin 配下のみ BASIC 認証を適用（API含む）
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Takeya Admin", charset="UTF-8"',
      },
    });
  }

  const base64 = authHeader.slice(6);
  const decoded = atob(base64);
  const [user, pass] = decoded.split(":");

  const validUser = process.env.BASIC_AUTH_USER;
  const validPass = process.env.BASIC_AUTH_PASSWORD;

  if (!validUser || !validPass || user !== validUser || pass !== validPass) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Takeya Admin", charset="UTF-8"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
