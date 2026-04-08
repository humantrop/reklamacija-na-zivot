import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname, searchParams } = request.nextUrl;

  // Redirect authenticated users away from auth pages
  if (
    token &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard and chat allow guest access (handled client-side with localStorage UUID)
  // Only admin requires real authentication
  if (!token && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/login", "/register", "/forgot-password", "/reset-password", "/admin/:path*"],
};
