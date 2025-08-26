/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { validateSession, createSession, revokeSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    console.log('Refresh token attempt, token exists:', !!token);

    if (!token) {
      console.log('No token found in cookies');
      return NextResponse.json(
        { error: "No token found", message: "Authentication required" },
        { status: 401 }
      );
    }

    console.log('Validating session...');
    const session = await validateSession(token);
    console.log('Session validation result:', !!session);

    if (!session) {
      const response = NextResponse.json(
        { error: "Invalid token", message: "Please login again" },
        { status: 401 }
      );

      response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    await revokeSession(token);

    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;

    const { token: newToken } = await createSession(session.userId, userAgent, ipAddress);

    const response = NextResponse.json(
      {
        success: true,
        message: "Token refreshed successfully",
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.avatar,
          createdAt: session.user.createdAt,
          language: session.user.language,
          theme: session.user.theme,
        }
      },
      { status: 200 }
    );

    response.cookies.set("auth-token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Token refresh error:", error);

    const response = NextResponse.json(
      { error: "Token refresh failed", message: "Please login again" },
      { status: 500 }
    );

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