import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  verifyPassword, 
  createSession, 
  validateLoginData,
  type LoginData 
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!validateLoginData(body)) {
      return NextResponse.json(
        { 
          error: "Invalid data",
          message: "Valid email and password are required"
        },
        { status: 400 }
      );
    }

    const { email, password }: LoginData = body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials", message: "Email or password is incorrect" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials", message: "Email or password is incorrect" },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;

    const { token } = await createSession(user.id, userAgent, ipAddress);

    const response = NextResponse.json(
      { 
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt,
          language: user.language,
          theme: user.theme,
        }
      },
      { status: 200 }
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to login" },
      { status: 500 }
    );
  }
}