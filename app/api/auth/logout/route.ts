import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: "No token found", message: "Already logged out" },
        { status: 400 }
      );
    }

    await revokeSession(token);

    const response = NextResponse.json(
      { 
        success: true,
        message: "Logout successful" 
      },
      { status: 200 }
    );

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Logout error:", error);
    
    const response = NextResponse.json(
      { 
        success: true,
        message: "Logout completed" 
      },
      { status: 200 }
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