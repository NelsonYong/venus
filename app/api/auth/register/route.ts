import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  hashPassword, 
  createSession, 
  validateRegisterData,
  type RegisterData 
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!validateRegisterData(body)) {
      return NextResponse.json(
        { 
          error: "Invalid data",
          message: "Name, email and password are required. Password must be at least 8 characters."
        },
        { status: 400 }
      );
    }

    const { name, email, password }: RegisterData = body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists", message: "Email is already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        language: true,
        theme: true,
      },
    });

    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;

    const { token } = await createSession(user.id, userAgent, ipAddress);

    const response = NextResponse.json(
      { 
        success: true,
        message: "Registration successful",
        user 
      },
      { status: 201 }
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to register user" },
      { status: 500 }
    );
  }
}