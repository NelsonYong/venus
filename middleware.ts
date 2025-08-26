import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";

const protectedRoutes = [
  "/api/chat",
  "/api/profile",
  "/api/settings", 
  "/api/auth/change-password",
  "/api/auth/delete-account",
  "/dashboard", 
  "/profile",
  "/settings",
  "/admin",
  "/chat"
];

const authRoutes = [
  "/login",
  "/register"
];

const publicRoutes = [
  "/",
  "/about",
  "/help",
  "/api/auth"
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  // Skip auth check for public routes and static files
  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") // Static files
  ) {
    return NextResponse.next();
  }

  // Handle auth routes (login, register)
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      try {
        const session = await validateSession(token);
        if (session) {
          const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
      } catch (error) {
        // Invalid token, clear it and continue to auth page
        const response = NextResponse.next();
        response.cookies.set("auth-token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 0,
          path: "/",
        });
        return response;
      }
    }
    return NextResponse.next();
  }

  // Handle protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const session = await validateSession(token);
      if (!session) {
        const response = pathname.startsWith("/api/") 
          ? NextResponse.json(
              { error: "Invalid token", message: "Please login again" },
              { status: 401 }
            )
          : (() => {
              const loginUrl = new URL("/login", request.url);
              loginUrl.searchParams.set("redirect", pathname);
              return NextResponse.redirect(loginUrl);
            })();
        
        response.cookies.set("auth-token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 0,
          path: "/",
        });
        
        return response;
      }

      // Add user info to request headers for protected API routes
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", session.userId);
      requestHeaders.set("x-user-email", session.user.email);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("Middleware validation error:", error);
      const response = pathname.startsWith("/api/") 
        ? NextResponse.json(
            { error: "Authentication error", message: "Please try again" },
            { status: 500 }
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};