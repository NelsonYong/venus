import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";

const protectedRoutes = [
  "/api/chat",
  "/dashboard",
  "/profile",
  "/settings"
];

const authRoutes = [
  "/login",
  "/register"
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      const session = await validateSession(token);
      if (session) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await validateSession(token);
    if (!session) {
      const response = pathname.startsWith("/api/") 
        ? NextResponse.json(
            { error: "Invalid token", message: "Please login again" },
            { status: 401 }
          )
        : NextResponse.redirect(new URL("/login", request.url));
      
      response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });
      
      return response;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-email", session.user.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};