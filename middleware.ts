/**
 * Middleware — /admin の BASIC 認証保護
 *
 * /admin 配下へのアクセス時に HTTP BASIC 認証を要求する。
 * BASIC 認証を通過した後、さらにアプリ側で Auth.js セッション（admin ロール）を
 * チェックする二重保護構成。
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin 配下のみ BASIC 認証を適用
  if (pathname.startsWith("/admin")) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Admin Area"' },
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
        headers: { "WWW-Authenticate": 'Basic realm="Admin Area"' },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
